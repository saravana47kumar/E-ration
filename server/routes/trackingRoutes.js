/**
 * trackingRoutes.js
 * GET  /api/tracking/:orderId           — live tracking state
 * POST /api/tracking/:orderId/start     — distributor starts delivery
 * POST /api/tracking/:orderId/deliver   — mark delivered + SMS + payment
 * POST /api/tracking/:orderId/collect   — collect COD payment
 */
const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Order = require('../models/Order');
const User  = require('../models/User');
const { haversine, etaFromDistance } = require('../utils/shopFinder');
const {
  sendOutForDeliverySMS,
  sendOrderDeliveredSMS,
  sendCODPaidSMS,
} = require('../utils/smsService');

// ── GET full tracking data ────────────────────────────────────────
router.get('/:orderId', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .select('agentLocation orderStatus deliveryLocation assignedShop customer distributor etaMinutes paymentMethod paymentStatus totalAmount');

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const uid = req.user._id.toString();
    const ok  = order.customer.toString()     === uid
             || order.distributor?.toString() === uid
             || req.user.role === 'admin';
    if (!ok) return res.status(403).json({ success: false, message: 'Not authorized' });

    let eta = order.etaMinutes;
    const aL = order.agentLocation, dL = order.deliveryLocation;
    if (aL?.lat != null && dL?.lat != null) {
      eta = etaFromDistance(haversine(aL.lat, aL.lng, dL.lat, dL.lng));
    }

    res.json({
      success: true,
      agentLocation:    order.agentLocation,
      orderStatus:      order.orderStatus,
      deliveryLocation: order.deliveryLocation,
      assignedShop:     order.assignedShop,
      etaMinutes:       eta,
      paymentMethod:    order.paymentMethod,
      paymentStatus:    order.paymentStatus,
      totalAmount:      order.totalAmount,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST start delivery → status = out_for_delivery + SMS ─────────
router.post('/:orderId/start', protect, authorize('distributor','admin'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('customer', 'name phone');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.orderStatus = 'out_for_delivery';
    await order.save();

    // Socket broadcast
    const io = req.app.get('io');
    io.to(`order_${order._id}`).emit('status_update', { orderId: order._id, status: 'out_for_delivery' });

    // SMS to customer
    const distributor = await User.findById(req.user._id).select('name phone');
    if (order.customer?.phone) {
      sendOutForDeliverySMS(order.customer, order, distributor).catch(() => {});
    }

    res.json({ success: true, message: 'Delivery started — SMS sent to customer' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST mark delivered → SMS + auto-collect if Stripe paid ───────
router.post('/:orderId/deliver', protect, authorize('distributor','admin'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('customer', 'name phone');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.orderStatus = 'delivered';
    order.deliveredAt = new Date();

    // If Stripe — auto-mark payment paid
    if (order.paymentMethod === 'stripe') {
      order.paymentStatus = 'paid';
    }
    // COD — stays pending until distributor confirms cash collected

    await order.save();

    // Socket broadcast to customer
    const io = req.app.get('io');
    io.to(`order_${order._id}`).emit('order_delivered', {
      orderId:       order._id,
      ts:            Date.now(),
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      totalAmount:   order.totalAmount,
    });

    // SMS: delivery success
    if (order.customer?.phone) {
      sendOrderDeliveredSMS(order.customer, order).catch(() => {});
    }

    res.json({
      success: true,
      message: 'Order delivered — SMS sent',
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      totalAmount:   order.totalAmount,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST collect COD payment ──────────────────────────────────────
router.post('/:orderId/collect', protect, authorize('distributor','admin'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('customer', 'name phone');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (order.paymentMethod !== 'cod')
      return res.status(400).json({ success: false, message: 'Not a COD order' });
    if (order.paymentStatus === 'paid')
      return res.status(400).json({ success: false, message: 'Already collected' });

    order.paymentStatus = 'paid';
    await order.save();

    // Socket broadcast
    const io = req.app.get('io');
    io.to(`order_${order._id}`).emit('payment_collected', {
      orderId:     order._id,
      totalAmount: order.totalAmount,
      ts:          Date.now(),
    });

    // SMS to customer
    if (order.customer?.phone) {
      sendCODPaidSMS(order.customer, order).catch(() => {});
    }

    res.json({ success: true, message: `COD ₹${order.totalAmount} collected — SMS sent` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
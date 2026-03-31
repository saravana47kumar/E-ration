const Refund = require('../models/Refund');
const Order = require('../models/Order');
const User = require('../models/User');

// Customer: request refund
const requestRefund = async (req, res) => {
  try {
    const { orderId, reason } = req.body;
    const order = await Order.findOne({ _id: orderId, customer: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.orderStatus !== 'delivered') {
      return res.status(400).json({ success: false, message: 'Only delivered orders can be refunded' });
    }
    if (order.paymentStatus !== 'paid') {
      return res.status(400).json({ success: false, message: 'Only paid orders can be refunded' });
    }
    
    const existing = await Refund.findOne({ order: orderId, status: { $in: ['pending', 'approved'] } });
    if (existing) return res.status(400).json({ success: false, message: 'Refund already requested' });
    
    const refund = await Refund.create({
      order: orderId,
      customer: req.user._id,
      amount: order.totalAmount,
      reason,
    });
    
    res.status(201).json({ success: true, refund });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Customer: get my refunds
const getMyRefunds = async (req, res) => {
  try {
    const refunds = await Refund.find({ customer: req.user._id })
      .populate('order', 'orderStatus totalAmount items')
      .sort({ createdAt: -1 });
    res.json({ success: true, refunds });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: get all refunds
const getAllRefunds = async (req, res) => {
  try {
    const refunds = await Refund.find()
      .populate('customer', 'name email phone')
      .populate('order', 'orderStatus totalAmount paymentMethod')
      .sort({ createdAt: -1 });
    res.json({ success: true, refunds });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: process refund
const processRefund = async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const refund = await Refund.findById(req.params.id);
    if (!refund) return res.status(404).json({ success: false, message: 'Refund not found' });
    
    refund.status = status;
    refund.adminNote = adminNote || '';
    if (status === 'approved') refund.refundedAt = new Date();
    await refund.save();
    
    // Optionally process actual refund via Stripe here
    if (status === 'approved') {
      // await stripe.refunds.create({ payment_intent: order.stripePaymentIntentId });
    }
    
    res.json({ success: true, refund });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { requestRefund, getMyRefunds, getAllRefunds, processRefund };
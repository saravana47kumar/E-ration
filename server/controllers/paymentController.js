const { findNearestShop, autoAssignDistributor } = require("../utils/shopFinder");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { sendPaymentSuccessSMS } = require('../utils/smsService');

// Create Stripe checkout session
const createCheckoutSession = async (req, res) => {
  try {
    const { items, deliveryAddress, deliveryLocation } = req.body;
    const customer = await User.findById(req.user._id);

    const lineItems = [];
    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const product = await Product.findById(item.product || item.productId);
      if (!product) return res.status(404).json({ success: false, message: `Product not found` });
      if (product.availableStock < item.quantity) {
        return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}` });
      }
      totalAmount += product.price * item.quantity;
      orderItems.push({
        product: product._id, name: product.name, image: product.image,
        price: product.price, quantity: item.quantity, unit: product.unit
      });
      lineItems.push({
        price_data: {
          currency: 'inr',
          product_data: {
            name: product.name,
            images: product.image ? [product.image] : [],
            description: `${product.category} - ${product.unit}`,
          },
          unit_amount: Math.round(product.price * 100),
        },
        quantity: item.quantity,
      });
    }

    // Auto-assign nearest ration shop
    let assignedShop = null;
    let distributorId = null;
    if (deliveryLocation?.lat) {
      assignedShop  = await findNearestShop(deliveryLocation.lat, deliveryLocation.lng);
      distributorId = await autoAssignDistributor(deliveryLocation.lat, deliveryLocation.lng);
    }

    // Create order first with pending status
    const order = await Order.create({
      customer: req.user._id,
      items: orderItems,
      totalAmount,
      paymentMethod: 'stripe',
      paymentStatus: 'pending',
      deliveryAddress: deliveryAddress || customer.address,
      deliveryLocation: deliveryLocation || {},
      rationCardNumber: customer.rationCardNumber,
      assignedShop,
      distributor: distributorId,
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/customer/payment-success?session_id={CHECKOUT_SESSION_ID}&order_id=${order._id}`,
      cancel_url: `${process.env.FRONTEND_URL}/customer/cart`,
      metadata: { orderId: order._id.toString(), customerId: req.user._id.toString() },
    });

    order.stripeSessionId = session.id;
    await order.save();

    res.json({ success: true, sessionId: session.id, url: session.url, orderId: order._id });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Verify payment success
const verifyPayment = async (req, res) => {
  try {
    const { sessionId, orderId } = req.query;
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      const order = await Order.findById(orderId);
      if (order && order.paymentStatus !== 'paid') {
        order.paymentStatus = 'paid';
        order.stripePaymentIntentId = session.payment_intent;
        order.orderStatus = 'confirmed';
        await order.save();
        // Deduct stock
        for (const item of order.items) {
          await Product.findByIdAndUpdate(item.product, { $inc: { availableStock: -item.quantity } });
        }
        // Send payment success SMS
        const customer = await User.findById(order.customer);
        if (customer) {
          sendPaymentSuccessSMS(customer, order); // fire-and-forget
        }
      }
      const populatedOrder = await Order.findById(orderId).populate('items.product', 'name image unit');
      res.json({ success: true, order: populatedOrder });
    } else {
      res.status(400).json({ success: false, message: 'Payment not completed' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createCheckoutSession, verifyPayment };
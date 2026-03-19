const Product  = require('../models/Product');
const Order    = require('../models/Order');
const Complaint = require('../models/Complaint');
const User     = require('../models/User');
const { sendOrderPlacedSMS } = require('../utils/smsService');
const { findNearestShop, autoAssignDistributor } = require('../utils/shopFinder');

// ── Get available products ────────────────────────────────────────
const getProducts = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true });
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Place order (COD) ─────────────────────────────────────────────
const placeOrder = async (req, res) => {
  try {
    const { items, paymentMethod, deliveryAddress, deliveryLocation, notes } = req.body;
    const customer = await User.findById(req.user._id);

    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const productId = item.product || item.productId;
      const product = await Product.findById(productId);
      if (!product) return res.status(404).json({ success: false, message: `Product not found: ${productId}` });
      if (product.availableStock < item.quantity)
        return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}` });
      totalAmount += product.price * item.quantity;
      orderItems.push({
        product: product._id, name: product.name, image: product.image,
        price: product.price, quantity: item.quantity, unit: product.unit,
      });
    }

    // ── Auto-assign nearest ration shop ──────────────────────────
    let assignedShop   = null;
    let distributorId  = null;

    if (deliveryLocation?.lat && deliveryLocation?.lng) {
      assignedShop  = await findNearestShop(deliveryLocation.lat, deliveryLocation.lng);
      distributorId = await autoAssignDistributor(deliveryLocation.lat, deliveryLocation.lng);
    }

    const order = await Order.create({
      customer: req.user._id,
      distributor: distributorId,
      items: orderItems,
      totalAmount,
      paymentMethod,
      paymentStatus: 'pending',
      deliveryAddress: deliveryAddress || customer.address,
      deliveryLocation: deliveryLocation || {},
      assignedShop,
      rationCardNumber: customer.rationCardNumber,
      notes,
    });

    // Deduct stock
    for (const item of items) {
      await Product.findByIdAndUpdate(item.product || item.productId, { $inc: { availableStock: -item.quantity } });
    }

    if (paymentMethod === 'cod') sendOrderPlacedSMS(customer, order);

    res.status(201).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get my orders ─────────────────────────────────────────────────
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .populate('items.product', 'name image')
      .populate('distributor', 'name phone')
      .sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get single order ──────────────────────────────────────────────
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, customer: req.user._id })
      .populate('items.product', 'name image category')
      .populate('distributor', 'name phone address');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Submit complaint ──────────────────────────────────────────────
const submitComplaint = async (req, res) => {
  try {
    const { subject, description, orderId } = req.body;
    const complaint = await Complaint.create({
      customer: req.user._id,
      subject, description,
      order: orderId || null,
    });
    res.status(201).json({ success: true, complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get my complaints ─────────────────────────────────────────────
const getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ customer: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getProducts, placeOrder, getMyOrders, getOrderById, submitComplaint, getMyComplaints };
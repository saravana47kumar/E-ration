const Stock = require('../models/Stock');
const StockRequest = require('../models/StockRequest');
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const {
  sendOutForDeliverySMS,
  sendOrderDeliveredSMS,
  sendCODPaidSMS,
  sendOrderCancelledSMS,
} = require('../utils/smsService');

// Dashboard stats
const getDashboardStats = async (req, res) => {
  try {
    const myStocks = await Stock.find({ distributor: req.user._id });
    const totalAllocated = myStocks.reduce((s, st) => s + st.allocatedQuantity, 0);
    const totalAvailable = myStocks.reduce((s, st) => s + st.availableQuantity, 0);
    const myOrders = await Order.find({ distributor: req.user._id });
    const pendingDeliveries = await Order.countDocuments({ distributor: req.user._id, orderStatus: { $in: ['confirmed', 'processing', 'out_for_delivery'] } });
    const deliveredOrders = await Order.countDocuments({ distributor: req.user._id, orderStatus: 'delivered' });
    const recentOrders = await Order.find({ distributor: req.user._id })
      .populate('customer', 'name phone address')
      .sort({ createdAt: -1 })
      .limit(5);
    res.json({ success: true, stats: { totalAllocated, totalAvailable, totalOrders: myOrders.length, pendingDeliveries, deliveredOrders }, recentOrders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// View my stock
const getMyStock = async (req, res) => {
  try {
    const stocks = await Stock.find({ distributor: req.user._id })
      .populate('product', 'name category unit price image');
    res.json({ success: true, stocks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Request more stock
const requestStock = async (req, res) => {
  try {
    const { productId, requestedQuantity, reason } = req.body;
    const request = await StockRequest.create({
      distributor: req.user._id,
      product: productId,
      requestedQuantity,
      reason
    });
    res.status(201).json({ success: true, message: 'Stock request submitted', request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get my stock requests
const getMyStockRequests = async (req, res) => {
  try {
    const requests = await StockRequest.find({ distributor: req.user._id })
      .populate('product', 'name unit category')
      .sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get assigned customers (customers in area)
const getMyCustomers = async (req, res) => {
  try {
    const orders = await Order.find({ distributor: req.user._id }).distinct('customer');
    const customers = await User.find({ _id: { $in: orders } }).select('-password');
    res.json({ success: true, customers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get my orders
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ distributor: req.user._id })
      .populate('customer', 'name phone address rationCardNumber')
      .populate('items.product', 'name unit')
      .sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update order delivery status
const updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus, paymentStatus } = req.body;

    const oldOrder = await Order.findOne({ _id: req.params.id, distributor: req.user._id })
      .populate('customer', 'name phone');
    if (!oldOrder) return res.status(404).json({ success: false, message: 'Order not found' });

    if (orderStatus) oldOrder.orderStatus = orderStatus;
    if (paymentStatus) oldOrder.paymentStatus = paymentStatus;
    if (orderStatus === 'delivered') oldOrder.deliveredAt = new Date();
    await oldOrder.save();

    const customer = oldOrder.customer;
    const distributor = await User.findById(req.user._id).select('name phone');

    if (customer?.phone) {
      if (orderStatus === 'out_for_delivery') {
        sendOutForDeliverySMS(customer, oldOrder, distributor);
      } else if (orderStatus === 'delivered') {
        sendOrderDeliveredSMS(customer, oldOrder);
      } else if (orderStatus === 'cancelled') {
        sendOrderCancelledSMS(customer, oldOrder);
      }
      // COD cash collected
      if (paymentStatus === 'paid' && oldOrder.paymentMethod === 'cod') {
        sendCODPaidSMS(customer, oldOrder);
      }
    }

    res.json({ success: true, order: oldOrder });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get transactions
const getTransactions = async (req, res) => {
  try {
    const orders = await Order.find({ distributor: req.user._id, paymentStatus: 'paid' })
      .populate('customer', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, transactions: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Statement
const getStatement = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { distributor: req.user._id };
    if (startDate && endDate) {
      query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    const orders = await Order.find(query)
      .populate('customer', 'name rationCardNumber')
      .populate('items.product', 'name unit')
      .sort({ createdAt: -1 });
    const totalRevenue = orders.filter(o => o.paymentStatus === 'paid').reduce((s, o) => s + o.totalAmount, 0);
    res.json({ success: true, orders, totalRevenue });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getDashboardStats, getMyStock, requestStock, getMyStockRequests, getMyCustomers, getMyOrders, updateOrderStatus, getTransactions, getStatement };
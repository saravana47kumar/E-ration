const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Stock = require('../models/Stock');
const StockRequest = require('../models/StockRequest');
const Complaint = require('../models/Complaint');
const { cloudinary } = require('../config/cloudinary');
const {
  sendOrderConfirmedSMS,
  sendOutForDeliverySMS,
  sendOrderDeliveredSMS,
  sendOrderCancelledSMS,
  sendStockApprovedSMS,
} = require('../utils/smsService');

// Dashboard stats
const getDashboardStats = async (req, res) => {
  try {
    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const totalDistributors = await User.countDocuments({ role: 'distributor' });
    const totalProducts = await Product.countDocuments({ isActive: true });
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ orderStatus: 'placed' });
    const revenueResult = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;
    const recentOrders = await Order.find()
      .populate('customer', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);
    res.json({ success: true, stats: { totalCustomers, totalDistributors, totalProducts, totalOrders, pendingOrders, totalRevenue }, recentOrders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Distributor management
const addDistributor = async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Email already exists' });
    const distributor = await User.create({ name, email, password, phone, address, role: 'distributor' });
    res.status(201).json({ success: true, message: 'Distributor added', distributor: { id: distributor._id, name: distributor.name, email: distributor.email } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllDistributors = async (req, res) => {
  try {
    const distributors = await User.find({ role: 'distributor' }).select('-password');
    res.json({ success: true, distributors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const toggleDistributorStatus = async (req, res) => {
  try {
    const distributor = await User.findById(req.params.id);
    if (!distributor) return res.status(404).json({ success: false, message: 'Distributor not found' });
    distributor.isActive = !distributor.isActive;
    await distributor.save();
    res.json({ success: true, message: `Distributor ${distributor.isActive ? 'activated' : 'deactivated'}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Product management
const addProduct = async (req, res) => {
  try {
    const { name, category, price, unit, description, minOrderQty, maxOrderQty } = req.body;
    const imageUrl = req.file ? req.file.path : '';
    const product = await Product.create({ name, category, price, unit, description, image: imageUrl, minOrderQty, maxOrderQty });
    res.status(201).json({ success: true, message: 'Product added', product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { name, category, price, unit, description, minOrderQty, maxOrderQty, isActive } = req.body;
    const updateData = { name, category, price, unit, description, minOrderQty, maxOrderQty, isActive };
    if (req.file) updateData.image = req.file.path;
    const product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Stock management
const addStock = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    product.totalStock += Number(quantity);
    product.availableStock += Number(quantity);
    await product.save();
    res.json({ success: true, message: 'Stock added', product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const allocateStock = async (req, res) => {
  try {
    const { distributorId, productId, quantity } = req.body;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    if (product.availableStock < quantity) {
      return res.status(400).json({ success: false, message: 'Insufficient stock' });
    }
    let stock = await Stock.findOne({ distributor: distributorId, product: productId });
    if (stock) {
      stock.allocatedQuantity += Number(quantity);
      stock.availableQuantity += Number(quantity);
    } else {
      stock = new Stock({ distributor: distributorId, product: productId, allocatedQuantity: quantity, availableQuantity: quantity });
    }
    await stock.save();
    product.availableStock -= Number(quantity);
    await product.save();
    res.json({ success: true, message: 'Stock allocated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getStockRequests = async (req, res) => {
  try {
    const requests = await StockRequest.find()
      .populate('distributor', 'name email')
      .populate('product', 'name unit')
      .sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const handleStockRequest = async (req, res) => {
  try {
    const { status, adminNote, approvedQuantity } = req.body;
    const request = await StockRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    request.status = status;
    request.adminNote = adminNote || '';
    if (status === 'approved' && approvedQuantity > 0) {
      request.approvedQuantity = approvedQuantity;
      const product = await Product.findById(request.product);
      if (product.availableStock < approvedQuantity) {
        return res.status(400).json({ success: false, message: 'Insufficient stock to approve' });
      }
      let stock = await Stock.findOne({ distributor: request.distributor, product: request.product });
      if (stock) {
        stock.allocatedQuantity += Number(approvedQuantity);
        stock.availableQuantity += Number(approvedQuantity);
      } else {
        stock = new Stock({ distributor: request.distributor, product: request.product, allocatedQuantity: approvedQuantity, availableQuantity: approvedQuantity });
      }
      await stock.save();
      product.availableStock -= Number(approvedQuantity);
      await product.save();
    }
    await request.save();

    // SMS distributor when approved
    if (status === 'approved') {
      const distributor = await User.findById(request.distributor).select('name phone');
      const product = await Product.findById(request.product).select('name unit');
      if (distributor && product) {
        sendStockApprovedSMS(distributor, product, request.approvedQuantity);
      }
    }

    res.json({ success: true, message: `Request ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Customers
const getAllCustomers = async (req, res) => {
  try {
    const customers = await User.find({ role: 'customer' }).select('-password');
    res.json({ success: true, customers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Orders
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('customer', 'name email phone rationCardNumber')
      .populate('distributor', 'name email')
      .populate('items.product', 'name image')
      .sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus, paymentStatus, distributorId } = req.body;

    // Fetch old order to compare status
    const oldOrder = await Order.findById(req.params.id).populate('customer', 'name phone');
    if (!oldOrder) return res.status(404).json({ success: false, message: 'Order not found' });

    const updateData = {};
    if (orderStatus) updateData.orderStatus = orderStatus;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (distributorId) updateData.distributor = distributorId;
    if (orderStatus === 'delivered') updateData.deliveredAt = new Date();

    const order = await Order.findByIdAndUpdate(req.params.id, updateData, { new: true })
      .populate('customer', 'name phone')
      .populate('distributor', 'name phone');

    // Fire SMS only when status actually changes
    const customer = order.customer;
    const prevStatus = oldOrder.orderStatus;

    if (orderStatus && orderStatus !== prevStatus && customer?.phone) {
      if (orderStatus === 'confirmed') {
        sendOrderConfirmedSMS(customer, order);
      } else if (orderStatus === 'out_for_delivery') {
        sendOutForDeliverySMS(customer, order, order.distributor);
      } else if (orderStatus === 'delivered') {
        sendOrderDeliveredSMS(customer, order);
      } else if (orderStatus === 'cancelled') {
        sendOrderCancelledSMS(customer, order);
      }
    }

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Complaints
const getAllComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate('customer', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const respondToComplaint = async (req, res) => {
  try {
    const { adminResponse, status } = req.body;
    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { adminResponse, status },
      { new: true }
    ).populate('customer', 'name email');
    res.json({ success: true, complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getStockDetails = async (req, res) => {
  try {
    const stocks = await Stock.find()
      .populate('product', 'name category unit price')
      .populate('distributor', 'name email');
    res.json({ success: true, stocks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getDashboardStats, addDistributor, getAllDistributors, toggleDistributorStatus,
  addProduct, updateProduct, getAllProducts, addStock, allocateStock,
  getStockRequests, handleStockRequest, getAllCustomers, getAllOrders,
  updateOrderStatus, getAllComplaints, respondToComplaint, getStockDetails
};
const Report = require('../models/Report');
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');

// Generate monthly report
const generateMonthlyReport = async (req, res) => {
  try {
    const { year, month } = req.body;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    const orders = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate },
      paymentStatus: 'paid'
    });
    
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalProductsSold = orders.reduce((sum, o) => {
      return sum + o.items.reduce((s, i) => s + i.quantity, 0);
    }, 0);
    
    const ordersByStatus = {};
    orders.forEach(o => {
      ordersByStatus[o.orderStatus] = (ordersByStatus[o.orderStatus] || 0) + 1;
    });
    
    const productSales = {};
    orders.forEach(o => {
      o.items.forEach(item => {
        productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
      });
    });
    const topProducts = Object.entries(productSales)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, quantity]) => ({ name, quantity }));
    
    const revenueByCategory = {};
    orders.forEach(o => {
      o.items.forEach(item => {
        revenueByCategory[item.name] = (revenueByCategory[item.name] || 0) + (item.price * item.quantity);
      });
    });
    
    const totalCustomers = await User.countDocuments({ role: 'customer', createdAt: { $lte: endDate } });
    
    const report = await Report.create({
      reportType: 'monthly',
      month,
      year,
      data: {
        totalOrders,
        totalRevenue,
        totalCustomers,
        totalProductsSold,
        ordersByStatus,
        topProducts,
        revenueByCategory,
      },
    });
    
    res.json({ success: true, report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get reports with filters
const getReports = async (req, res) => {
  try {
    const { type, year, region } = req.query;
    const filter = {};
    if (type) filter.reportType = type;
    if (year) filter.year = parseInt(year);
    if (region && region !== 'all') filter.region = region;
    
    const reports = await Report.find(filter).sort({ year: -1, month: -1 });
    res.json({ success: true, reports });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get region-wise analysis
const getRegionAnalysis = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate) : new Date();
    
    const orders = await Order.find({
      createdAt: { $gte: start, $lte: end },
      paymentStatus: 'paid'
    }).populate('customer', 'address');
    
    const regionData = {};
    orders.forEach(order => {
      const address = order.customer?.address || '';
      const region = address.split(',').pop()?.trim() || 'Unknown';
      if (!regionData[region]) {
        regionData[region] = { orders: 0, revenue: 0, customers: new Set() };
      }
      regionData[region].orders++;
      regionData[region].revenue += order.totalAmount;
      regionData[region].customers.add(order.customer?._id?.toString());
    });
    
    const result = Object.entries(regionData).map(([name, data]) => ({
      region: name,
      orders: data.orders,
      revenue: data.revenue,
      customers: data.customers.size,
    })).sort((a, b) => b.revenue - a.revenue);
    
    res.json({ success: true, regionData: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { generateMonthlyReport, getReports, getRegionAnalysis };
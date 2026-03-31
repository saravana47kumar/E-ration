const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reportType: { type: String, enum: ['monthly', 'quarterly', 'yearly', 'custom'], required: true },
  month: { type: Number, min: 1, max: 12 },
  year: { type: Number, required: true },
  region: { type: String, default: 'all' },
  data: {
    totalOrders: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    totalCustomers: { type: Number, default: 0 },
    totalProductsSold: { type: Number, default: 0 },
    ordersByStatus: { type: Map, of: Number, default: {} },
    topProducts: { type: Array, default: [] },
    revenueByCategory: { type: Map, of: Number, default: {} },
  },
  generatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
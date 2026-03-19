const mongoose = require('mongoose');

const stockRequestSchema = new mongoose.Schema({
  distributor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  requestedQuantity: { type: Number, required: true },
  reason: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  adminNote: { type: String, default: '' },
  approvedQuantity: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('StockRequest', stockRequestSchema);

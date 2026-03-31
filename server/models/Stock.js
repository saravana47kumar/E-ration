const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  distributor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  allocatedQuantity: { type: Number, default: 0 },
  usedQuantity: { type: Number, default: 0 },
  availableQuantity: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Stock', stockSchema);

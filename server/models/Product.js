const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, enum: ['Rice', 'Wheat', 'Sugar', 'Oil', 'Kerosene', 'Pulses', 'Other'] },
  price: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true, default: 'kg' },
  description: { type: String, default: '' },
  image: { type: String, default: '' },
  totalStock: { type: Number, default: 0 },
  availableStock: { type: Number, default: 0 },
  minOrderQty: { type: Number, default: 1 },
  maxOrderQty: { type: Number, default: 10 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);

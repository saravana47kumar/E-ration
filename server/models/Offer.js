const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  discountType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
  discountValue: { type: Number, required: true },
  validFrom: { type: Date, required: true },
  validUntil: { type: Date, required: true },
  applicableTo: { type: [String], enum: ['all', 'rice', 'wheat', 'sugar', 'oil', 'kerosene', 'pulses'], default: ['all'] },
  sentViaSMS: { type: Boolean, default: false },
  sentAt: { type: Date, default: null },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Offer', offerSchema);
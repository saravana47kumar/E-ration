const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, enum: ['delivery', 'quality', 'payment', 'distributor', 'other'], default: 'other' },
  status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
  adminResponse: { type: String, default: '' },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
}, { timestamps: true });

module.exports = mongoose.model('Complaint', complaintSchema);

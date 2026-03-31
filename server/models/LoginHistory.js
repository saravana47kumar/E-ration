const mongoose = require('mongoose');

const loginHistorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  loginAt: { type: Date, default: Date.now },
  logoutAt: { type: Date, default: null },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  deviceType: { type: String, enum: ['mobile', 'tablet', 'desktop', 'unknown'], default: 'unknown' },
  location: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('LoginHistory', loginHistorySchema);
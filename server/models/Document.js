/**
 * Document.js — Mongoose model
 *
 * Stores documents uploaded by a customer for identity verification.
 * Each document has a type, Cloudinary URL, and an admin verification status.
 *
 * Document types:
 *   aadhar      — Aadhaar card (PDF or image)
 *   pan         — PAN card
 *   tenth       — 10th mark sheet
 *   twelfth     — 12th mark sheet
 *   other       — any other supporting doc
 *
 * Verification flow:
 *   uploaded → pending → verified | rejected
 */

const mongoose = require('mongoose');

const DOC_TYPES = ['aadhar', 'pan', 'tenth', 'twelfth', 'other'];

const documentSchema = new mongoose.Schema({
  // Owner
  user: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
    index:    true,
  },

  // Linked ration card (optional — for context)
  rationCard: {
    type: mongoose.Schema.Types.ObjectId,
    ref:  'RationCard',
    default: null,
  },

  // Document metadata
  docType:      { type: String, enum: DOC_TYPES, required: true },
  docLabel:     { type: String, default: '' },   // e.g. "Aadhaar Card", "PAN Card"
  fileUrl:      { type: String, required: true }, // Cloudinary URL
  fileName:     { type: String, default: '' },    // original file name
  fileType:     { type: String, default: '' },    // 'pdf' | 'image'

  // Verification
  status:       { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  adminNote:    { type: String, default: '' },
  verifiedAt:   { type: Date,   default: null },
  verifiedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);
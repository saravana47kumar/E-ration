/**
 * RationCard.js — Mongoose model
 *
 * One document per household (card holder = head of family).
 * rationCardNumber is auto-generated on create and NEVER editable.
 *
 * familyMemberRequests stores the approval workflow:
 *   type  : 'add' | 'remove'
 *   status: 'pending' | 'approved' | 'rejected'
 */

const mongoose = require('mongoose');

// ── Family Member sub-document ────────────────────────────────────
const familyMemberSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  relation: { type: String, required: true },
  dob:      { type: Date,   required: true },
  aadhar:   { type: String, default: '', trim: true },  // not required — head member has no aadhar at creation
  isHead:   { type: Boolean, default: false },
}, { timestamps: true });

// ── Family Member Change Request sub-document ─────────────────────
const memberRequestSchema = new mongoose.Schema({
  type:       { type: String, enum: ['add', 'remove'], required: true },
  status:     { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  adminNote:  { type: String, default: '' },
  resolvedAt: { type: Date, default: null },

  // Fields for 'add' requests
  memberName:  { type: String, default: '' },
  relation:    { type: String, default: '' },
  dob:         { type: Date,   default: null },
  aadhar:      { type: String, default: '' },
  docUrl:      { type: String, default: '' },      // Cloudinary URL of uploaded doc
  docFileName: { type: String, default: '' },      // original file name
  docType:     { type: String, default: 'image' }, // 'pdf' | 'image'

  // Fields for 'remove' requests (points to existing familyMember._id)
  memberId:   { type: mongoose.Schema.Types.ObjectId, default: null },
  reason:     { type: String, default: '' },
}, { timestamps: true });

// ── Card Type options (matches TN Smart Card categories) ──────────
const CARD_TYPES = ['PHH', 'AAY', 'NPHH', 'APL'];

// ── Main RationCard Schema ────────────────────────────────────────
const rationCardSchema = new mongoose.Schema({
  // Linked user (card holder = head of family)
  user: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
    unique:   true,   // one card per user
  },

  // Auto-generated, immutable after creation
  rationCardNumber: {
    type:    String,
    unique:  true,
    index:   true,
  },

  cardType: {
    type:    String,
    enum:    CARD_TYPES,
    default: 'PHH',
  },

  dob:     { type: Date,   required: true },
  address: { type: String, required: true, trim: true },
  photo:   { type: String, default: '' },   // Cloudinary URL

  familyMembers: [familyMemberSchema],

  // Approval request queue
  memberRequests: [memberRequestSchema],

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('RationCard', rationCardSchema);
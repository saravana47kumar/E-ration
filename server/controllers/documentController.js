/**
 * documentController.js
 *
 * Customer endpoints:
 *   POST /api/documents/upload          — upload a document (multipart)
 *   GET  /api/documents/my              — list own documents
 *   DELETE /api/documents/:id           — delete own pending document
 *
 * Admin endpoints:
 *   GET  /api/documents/admin/all       — all documents (optionally ?status=pending)
 *   GET  /api/documents/admin/user/:uid — all docs for one user
 *   PUT  /api/documents/admin/:id/verify — verify or reject a document
 */

const Document   = require('../models/Document');
const RationCard = require('../models/RationCard');

const DOC_LABELS = {
  aadhar:  'Aadhaar Card',
  pan:     'PAN Card',
  tenth:   '10th Certificate',
  twelfth: '12th Certificate',
  other:   'Other Document',
};

// ════════════════════════════════════════════════════════════════
// CUSTOMER
// ════════════════════════════════════════════════════════════════

/**
 * POST /api/documents/upload
 * Accepts multipart/form-data with:
 *   file    — the document file (PDF or image, via Cloudinary)
 *   docType — one of: aadhar | pan | tenth | twelfth | other
 *   docLabel (optional) — custom label
 */
const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const { docType, docLabel } = req.body;
    const validTypes = ['aadhar', 'pan', 'tenth', 'twelfth', 'other'];
    if (!validTypes.includes(docType)) {
      return res.status(400).json({ success: false, message: `docType must be one of: ${validTypes.join(', ')}` });
    }

    // Find the user's ration card (for linking)
    const rationCard = await RationCard.findOne({ user: req.user._id });

    // Detect file type
    const mime     = req.file.mimetype || '';
    const fileType = mime.includes('pdf') ? 'pdf' : 'image';

    const doc = await Document.create({
      user:       req.user._id,
      rationCard: rationCard?._id || null,
      docType,
      docLabel:   docLabel || DOC_LABELS[docType] || docType,
      fileUrl:    req.file.path,          // Cloudinary URL
      fileName:   req.file.originalname || req.file.filename || '',
      fileType,
      status:     'pending',
    });

    res.status(201).json({ success: true, document: doc });
  } catch (err) {
    console.error('[uploadDocument]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/documents/my
 * Returns all documents belonging to the logged-in customer.
 */
const getMyDocuments = async (req, res) => {
  try {
    const docs = await Document.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, documents: docs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * DELETE /api/documents/:id
 * Customer can delete only their own pending documents.
 */
const deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, user: req.user._id });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found.' });
    if (doc.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending documents can be deleted.' });
    }
    await doc.deleteOne();
    res.json({ success: true, message: 'Document deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ════════════════════════════════════════════════════════════════
// ADMIN
// ════════════════════════════════════════════════════════════════

/**
 * GET /api/documents/admin/all
 * Returns all documents, optionally filtered by ?status=pending|verified|rejected
 */
const getAllDocuments = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const docs = await Document.find(filter)
      .populate('user',       'name email phone rationCardNumber')
      .populate('rationCard', 'rationCardNumber cardType')
      .populate('verifiedBy', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, documents: docs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/documents/admin/user/:uid
 * All documents for a specific user — used in the "view detail" panel.
 */
const getDocumentsByUser = async (req, res) => {
  try {
    const docs = await Document.find({ user: req.params.uid })
      .populate('verifiedBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, documents: docs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/documents/admin/:id/verify
 * Approve or reject a document.
 * Body: { status: 'verified' | 'rejected', adminNote? }
 */
const verifyDocument = async (req, res) => {
  try {
    const { status, adminNote = '' } = req.body;
    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: "status must be 'verified' or 'rejected'" });
    }

    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found.' });

    doc.status     = status;
    doc.adminNote  = adminNote.trim();
    doc.verifiedAt = new Date();
    doc.verifiedBy = req.user._id;
    await doc.save();

    await doc.populate('user', 'name email rationCardNumber');
    res.json({ success: true, document: doc });
  } catch (err) {
    console.error('[verifyDocument]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  uploadDocument,
  getMyDocuments,
  deleteDocument,
  getAllDocuments,
  getDocumentsByUser,
  verifyDocument,
};
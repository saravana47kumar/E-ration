/**
 * documentRoutes.js
 *
 * Mount in server.js:
 *   app.use('/api/documents', require('./routes/documentRoutes'));
 */

const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth');

// Reuse existing Cloudinary upload config — supports PDF + images
const multer  = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { cloudinary } = require('../config/cloudinary');

// Separate Cloudinary folder for verification docs
const docStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:          'eration_documents',
    resource_type:   'auto',               // allows PDF upload
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
  },
});
const uploadDoc = multer({ storage: docStorage });

const {
  uploadDocument,
  getMyDocuments,
  deleteDocument,
  getAllDocuments,
  getDocumentsByUser,
  verifyDocument,
} = require('../controllers/documentController');

// ── Customer routes ───────────────────────────────────────────────
router.post(
  '/upload',
  protect, authorize('customer'),
  uploadDoc.single('file'),
  uploadDocument
);

router.get(
  '/my',
  protect, authorize('customer'),
  getMyDocuments
);

router.delete(
  '/:id',
  protect, authorize('customer'),
  deleteDocument
);

// ── Admin routes ──────────────────────────────────────────────────
// ?status=pending|verified|rejected
router.get(
  '/admin/all',
  protect, authorize('admin'),
  getAllDocuments
);

router.get(
  '/admin/user/:uid',
  protect, authorize('admin'),
  getDocumentsByUser
);

router.put(
  '/admin/:id/verify',
  protect, authorize('admin'),
  verifyDocument
);

module.exports = router;
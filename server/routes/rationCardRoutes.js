/**
 * rationCardRoutes.js
 * Mount in server.js:
 *   
 */

const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const { protect, authorize } = require('../middleware/auth');
const { upload }             = require('../config/cloudinary');

// Memory storage for optional member doc (PDF or image, max 10 MB)
// Actual Cloudinary upload happens inside the controller
const uploadMem = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 },
});

// Conditional multer — only parse multipart requests (skips plain JSON)
const maybeParseMemberDoc = (req, res, next) => {
  const ct = req.headers['content-type'] || '';
  if (ct.includes('multipart/form-data')) {
    return uploadMem.single('docFile')(req, res, next);
  }
  next();
};

const {
  getMyCard,
  createCard,
  updateHeadAadhar,
  submitMemberRequest,
  getMyRequests,
  getAllCards,
  getAllPendingRequests,
  handleMemberRequest,
} = require('../controllers/rationCardController');

// ── Customer ──────────────────────────────────────────────────────
router.get('/me',                protect, authorize('customer'), getMyCard);
router.post('/create',           protect, authorize('customer'), upload.single('photo'), createCard);
router.put('/head-aadhar',       protect, authorize('customer'), updateHeadAadhar);
router.get('/members/requests',  protect, authorize('customer'), getMyRequests);

router.post(
  '/members/request',
  protect, authorize('customer'),
  maybeParseMemberDoc,       // multer — only when multipart
  submitMemberRequest        // controller handles Cloudinary upload
);

// ── Admin ─────────────────────────────────────────────────────────
router.get('/admin/all',              protect, authorize('admin'), getAllCards);
router.get('/admin/requests',         protect, authorize('admin'), getAllPendingRequests);
router.put('/admin/requests/:id',     protect, authorize('admin'), handleMemberRequest);

module.exports = router;
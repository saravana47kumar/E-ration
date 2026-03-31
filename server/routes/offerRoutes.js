const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { createOffer, getAllOffers, getActiveOffers } = require('../controllers/offerController');

router.post('/', protect, authorize('admin'), createOffer);
router.get('/admin/all', protect, authorize('admin'), getAllOffers);
router.get('/active', getActiveOffers);

module.exports = router;
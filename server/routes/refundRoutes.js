const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { requestRefund, getMyRefunds, getAllRefunds, processRefund } = require('../controllers/refundController');

router.post('/', protect, authorize('customer'), requestRefund);
router.get('/my', protect, authorize('customer'), getMyRefunds);
router.get('/admin/all', protect, authorize('admin'), getAllRefunds);
router.put('/admin/:id', protect, authorize('admin'), processRefund);

module.exports = router;
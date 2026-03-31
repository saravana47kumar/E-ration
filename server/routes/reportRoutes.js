const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { generateMonthlyReport, getReports, getRegionAnalysis } = require('../controllers/reportController');

router.post('/generate', protect, authorize('admin'), generateMonthlyReport);
router.get('/', protect, authorize('admin'), getReports);
router.get('/region-analysis', protect, authorize('admin'), getRegionAnalysis);

module.exports = router;
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Stock = require('../models/Stock');

router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const stocks = await Stock.find()
      .populate('product', 'name category unit')
      .populate('distributor', 'name email');
    res.json({ success: true, stocks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

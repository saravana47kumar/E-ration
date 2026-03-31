const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Complaint = require('../models/Complaint');

router.get('/', protect, async (req, res) => {
  try {
    const complaints = await Complaint.find({ customer: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

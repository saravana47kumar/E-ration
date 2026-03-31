const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { createCheckoutSession, verifyPayment } = require('../controllers/paymentController');

// POST /api/payment/create-checkout-session  ← matches frontend call
router.post('/create-checkout-session', protect, authorize('customer'), createCheckoutSession);

// GET /api/payment/verify
router.get('/verify', protect, verifyPayment);

module.exports = router;
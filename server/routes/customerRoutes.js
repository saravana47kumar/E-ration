const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getProducts, placeOrder, getMyOrders, getOrderById, submitComplaint, getMyComplaints } = require('../controllers/customerController');

router.use(protect, authorize('customer'));

router.get('/products', getProducts);
router.post('/orders', placeOrder);
router.get('/orders', getMyOrders);
router.get('/orders/:id', getOrderById);
router.post('/complaints', submitComplaint);
router.get('/complaints', getMyComplaints);

module.exports = router;

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getDashboardStats, getMyStock, requestStock, getMyStockRequests, getMyCustomers, getMyOrders, updateOrderStatus, getTransactions, getStatement } = require('../controllers/distributorController');

router.use(protect, authorize('distributor'));

router.get('/dashboard', getDashboardStats);
router.get('/stock', getMyStock);
router.post('/stock/request', requestStock);
router.get('/stock/requests', getMyStockRequests);
router.get('/customers', getMyCustomers);
router.get('/orders', getMyOrders);
router.put('/orders/:id', updateOrderStatus);
router.get('/transactions', getTransactions);
router.get('/statement', getStatement);

module.exports = router;

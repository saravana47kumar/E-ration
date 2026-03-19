const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const {
  getDashboardStats, addDistributor, getAllDistributors, toggleDistributorStatus,
  addProduct, updateProduct, getAllProducts, addStock, allocateStock,
  getStockRequests, handleStockRequest, getAllCustomers, getAllOrders,
  updateOrderStatus, getAllComplaints, respondToComplaint, getStockDetails
} = require('../controllers/adminController');

router.use(protect, authorize('admin'));

router.get('/dashboard', getDashboardStats);

router.post('/distributors', addDistributor);
router.get('/distributors', getAllDistributors);
router.put('/distributors/:id/toggle', toggleDistributorStatus);

router.post('/products', upload.single('image'), addProduct);
router.put('/products/:id', upload.single('image'), updateProduct);
router.get('/products', getAllProducts);

router.post('/stock/add', addStock);
router.post('/stock/allocate', allocateStock);
router.get('/stock/requests', getStockRequests);
router.put('/stock/requests/:id', handleStockRequest);
router.get('/stock/details', getStockDetails);

router.get('/customers', getAllCustomers);
router.get('/orders', getAllOrders);
router.put('/orders/:id', updateOrderStatus);

router.get('/complaints', getAllComplaints);
router.put('/complaints/:id', respondToComplaint);

module.exports = router;

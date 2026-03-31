const express = require('express');
const router = express.Router();
const { register, login, getMe, updateProfile, uploadProfileImage, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const { logout, getLoginHistory } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/profile/image', protect, upload.single('profileImage'), uploadProfileImage);
router.put('/change-password', protect, changePassword);
router.post('/logout', protect, logout);
router.get('/login-history', protect, getLoginHistory);

module.exports = router;
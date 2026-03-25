const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { 
  validateRegister, 
  validateLogin 
} = require('../middleware/validation.middleware');
const {
  register,
  login,
  getMe,
  updateProfile,
  logout,
  getDashboard,
  getWeekly,
  verifyEmailOtp,
  resendEmailOtp,
  forgotPassword,
  verifyResetOtp,
  resetPassword
} = require('../controllers/auth.controller');

// Public routes - Registration & Login
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);

// Public routes - Email OTP Verification
router.post('/verify-otp', verifyEmailOtp);
router.post('/resend-otp', resendEmailOtp);

// Public routes - Password Reset
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/me', protect, getMe);
router.get('/dashboard', protect, getDashboard);
router.get('/weekly', protect, getWeekly);
router.put('/profile', protect, updateProfile);
router.post('/logout', protect, logout);

module.exports = router;

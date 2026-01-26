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
  getWeekly
} = require('../controllers/auth.controller');

// Public routes
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);

// Protected routes
router.get('/me', protect, getMe);
router.get('/dashboard', protect, getDashboard);
router.get('/weekly', protect, getWeekly);
router.put('/profile', protect, updateProfile);
router.post('/logout', protect, logout);

module.exports = router;

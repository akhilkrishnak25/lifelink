const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const UserPreference = require('../models/UserPreference');

/**
 * @route   GET /api/preferences
 * @desc    Get user preferences
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    let preferences = await UserPreference.findOne({ userId: req.user.id });
    
    if (!preferences) {
      preferences = await UserPreference.create({ userId: req.user.id });
    }
    
    res.json({ success: true, data: preferences });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   PUT /api/preferences
 * @desc    Update user preferences
 * @access  Private
 */
router.put('/', protect, async (req, res) => {
  try {
    const preferences = await UserPreference.findOneAndUpdate(
      { userId: req.user.id },
      req.body,
      { new: true, upsert: true, runValidators: true }
    );
    
    res.json({ success: true, data: preferences });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   PUT /api/preferences/notifications
 * @desc    Update notification preferences
 * @access  Private
 */
router.put('/notifications', protect, async (req, res) => {
  try {
    const preferences = await UserPreference.findOneAndUpdate(
      { userId: req.user.id },
      { notifications: req.body },
      { new: true, upsert: true }
    );
    
    res.json({ success: true, data: preferences });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   PUT /api/preferences/privacy
 * @desc    Update privacy settings
 * @access  Private
 */
router.put('/privacy', protect, async (req, res) => {
  try {
    const preferences = await UserPreference.findOneAndUpdate(
      { userId: req.user.id },
      { privacy: req.body },
      { new: true, upsert: true }
    );
    
    res.json({ success: true, data: preferences });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const gamificationService = require('../services/gamification.service');
const { Gamification, Achievement } = require('../models/Gamification');

/**
 * @route   GET /api/gamification/profile
 * @desc    Get user gamification profile
 * @access  Private
 */
router.get('/profile', protect, async (req, res) => {
  try {
    const profile = await gamificationService.getProfile(req.user.id);
    res.json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/gamification/leaderboard
 * @desc    Get leaderboard
 * @access  Public
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const { limit = 100, city, state } = req.query;
    
    const filter = {};
    if (city) filter['userId.city'] = city;
    if (state) filter['userId.state'] = state;
    
    const leaderboard = await gamificationService.getLeaderboard(parseInt(limit), filter);
    
    res.json({ success: true, data: leaderboard });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/gamification/achievements
 * @desc    Get user achievements
 * @access  Private
 */
router.get('/achievements', protect, async (req, res) => {
  try {
    const achievements = await Achievement.find({ userId: req.user.id })
      .sort({ unlockedAt: -1 });
    
    res.json({ success: true, data: achievements });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/gamification/achievements/available
 * @desc    Get all available achievements
 * @access  Public
 */
router.get('/achievements/available', async (req, res) => {
  try {
    res.json({ success: true, data: gamificationService.ACHIEVEMENTS });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

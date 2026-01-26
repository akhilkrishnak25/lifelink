const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const Rating = require('../models/Rating');

/**
 * @route   POST /api/ratings
 * @desc    Create rating
 * @access  Private
 */
router.post('/', protect, async (req, res) => {
  try {
    const { toUserId, requestId, rating, review, category, tags } = req.body;
    
    const newRating = await Rating.create({
      fromUserId: req.user.id,
      toUserId,
      requestId,
      rating,
      review,
      category,
      tags
    });
    
    res.status(201).json({ success: true, data: newRating });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already rated this user for this request'
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/ratings/user/:userId
 * @desc    Get ratings for a user
 * @access  Public
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { category } = req.query;
    const query = { toUserId: req.params.userId };
    if (category) query.category = category;
    
    const ratings = await Rating.find(query)
      .populate('fromUserId', 'name')
      .sort({ createdAt: -1 });
    
    const avgRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0;
    
    res.json({
      success: true,
      data: {
        ratings,
        average: avgRating.toFixed(1),
        total: ratings.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

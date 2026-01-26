const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const Referral = require('../models/Referral');

/**
 * Generate referral code
 */
function generateReferralCode(name) {
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const prefix = name.substring(0, 3).toUpperCase();
  return `${prefix}${random}`;
}

/**
 * @route   GET /api/referral/code
 * @desc    Get or create referral code
 * @access  Private
 */
router.get('/code', protect, async (req, res) => {
  try {
    let referral = await Referral.findOne({ referrerId: req.user.id });
    
    if (!referral) {
      const code = generateReferralCode(req.user.name);
      referral = await Referral.create({
        referrerId: req.user.id,
        referralCode: code
      });
    }
    
    res.json({ success: true, data: referral });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/referral/apply
 * @desc    Apply referral code
 * @access  Private
 */
router.post('/apply', protect, async (req, res) => {
  try {
    const { referralCode } = req.body;
    
    const referral = await Referral.findOne({ referralCode: referralCode.toUpperCase() });
    
    if (!referral) {
      return res.status(404).json({ success: false, message: 'Invalid referral code' });
    }
    
    if (referral.referrerId.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot use your own referral code'
      });
    }
    
    const alreadyReferred = referral.referredUsers.some(
      u => u.userId.toString() === req.user.id
    );
    
    if (alreadyReferred) {
      return res.status(400).json({
        success: false,
        message: 'You have already used this referral code'
      });
    }
    
    referral.referredUsers.push({ userId: req.user.id });
    referral.totalReferrals += 1;
    referral.rewardsEarned += 50; // 50 points per referral
    await referral.save();
    
    // Add points to gamification
    const gamificationService = require('../services/gamification.service');
    await gamificationService.addPoints(referral.referrerId, 50, 'Referral bonus');
    await gamificationService.addPoints(req.user.id, 25, 'Referred by friend');
    
    res.json({ success: true, message: 'Referral code applied successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/referral/stats
 * @desc    Get referral statistics
 * @access  Private
 */
router.get('/stats', protect, async (req, res) => {
  try {
    const referral = await Referral.findOne({ referrerId: req.user.id })
      .populate('referredUsers.userId', 'name email');
    
    if (!referral) {
      return res.json({
        success: true,
        data: {
          referralCode: null,
          totalReferrals: 0,
          rewardsEarned: 0,
          referredUsers: []
        }
      });
    }
    
    res.json({ success: true, data: referral });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

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

/**
 * @route   POST /api/gamification/points
 * @desc    Award points to user (Admin or system use)
 * @access  Private
 */
router.post('/points', protect, async (req, res) => {
  try {
    const { points, reason } = req.body;
    
    if (!points || points <= 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Valid points value required' 
      });
    }
    
    const result = await gamificationService.addPoints(
      req.user.id,
      points,
      reason || 'Manual points award'
    );
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/gamification/stats
 * @desc    Get user gamification statistics
 * @access  Private
 */
router.get('/stats', protect, async (req, res) => {
  try {
    const profile = await gamificationService.getProfile(req.user.id);
    const achievements = await Achievement.find({ userId: req.user.id });
    
    // Get user rank
    const allProfiles = await Gamification.find()
      .sort({ points: -1 })
      .select('userId points');
    
    const userRank = allProfiles.findIndex(
      p => p.userId.toString() === req.user.id.toString()
    ) + 1;
    
    const stats = {
      totalPoints: profile.points,
      level: profile.level,
      currentTier: profile.currentTier,
      totalDonations: profile.totalDonations,
      streakCount: profile.streakCount,
      reliabilityScore: profile.reliabilityScore,
      achievementsUnlocked: achievements.length,
      totalAchievementsAvailable: Object.keys(gamificationService.ACHIEVEMENTS).length,
      rank: userRank,
      totalUsers: allProfiles.length,
      badges: profile.badges,
      pointsToNextLevel: profile.pointsToNextLevel
    };
    
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/gamification/rank
 * @desc    Get user's current rank
 * @access  Private
 */
router.get('/rank', protect, async (req, res) => {
  try {
    const allProfiles = await Gamification.find()
      .sort({ points: -1 })
      .populate('userId', 'name');
    
    const userIndex = allProfiles.findIndex(
      p => p.userId._id.toString() === req.user.id.toString()
    );
    
    if (userIndex === -1) {
      return res.json({
        success: true,
        data: {
          rank: null,
          totalUsers: allProfiles.length,
          message: 'No gamification profile found'
        }
      });
    }
    
    const above = userIndex > 0 ? allProfiles[userIndex - 1] : null;
    const below = userIndex < allProfiles.length - 1 ? allProfiles[userIndex + 1] : null;
    
    res.json({
      success: true,
      data: {
        rank: userIndex + 1,
        totalUsers: allProfiles.length,
        percentile: Math.round((1 - userIndex / allProfiles.length) * 100),
        userAbove: above ? {
          name: above.userId.name,
          points: above.points,
          pointsDifference: above.points - allProfiles[userIndex].points
        } : null,
        userBelow: below ? {
          name: below.userId.name,
          points: below.points,
          pointsDifference: allProfiles[userIndex].points - below.points
        } : null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/gamification/activity
 * @desc    Record donor activity (donation completed, quick response, etc.)
 * @access  Private
 */
router.post('/activity', protect, async (req, res) => {
  try {
    const { activityType, metadata } = req.body;
    
    const profile = await gamificationService.getProfile(req.user.id);
    let pointsAwarded = 0;
    let achievementsUnlocked = [];
    
    switch (activityType) {
      case 'donation_completed':
        await gamificationService.updateDonationStats(req.user.id, new Date());
        pointsAwarded = 100;
        break;
        
      case 'quick_response':
        // Check if they already have this achievement
        const hasQuickResponder = await Achievement.findOne({
          userId: req.user.id,
          type: 'quick_responder'
        });
        
        if (!hasQuickResponder) {
          const achievement = await gamificationService.awardAchievement(
            req.user.id,
            'quick_responder'
          );
          if (achievement) achievementsUnlocked.push(achievement);
        }
        
        pointsAwarded = 25;
        break;
        
      case 'profile_completed':
        const hasVerified = await Achievement.findOne({
          userId: req.user.id,
          type: 'verified_donor'
        });
        
        if (!hasVerified) {
          const achievement = await gamificationService.awardAchievement(
            req.user.id,
            'verified_donor'
          );
          if (achievement) achievementsUnlocked.push(achievement);
        }
        
        pointsAwarded = 25;
        break;
        
      case 'long_distance':
        if (metadata?.distance > 50) {
          const hasDistanceWarrior = await Achievement.findOne({
            userId: req.user.id,
            type: 'distance_warrior'
          });
          
          if (!hasDistanceWarrior) {
            const achievement = await gamificationService.awardAchievement(
              req.user.id,
              'distance_warrior'
            );
            if (achievement) achievementsUnlocked.push(achievement);
          }
        }
        
        pointsAwarded = Math.floor(metadata?.distance || 0);
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid activity type'
        });
    }
    
    if (pointsAwarded > 0) {
      await gamificationService.addPoints(
        req.user.id,
        pointsAwarded,
        `Activity: ${activityType}`
      );
    }
    
    res.json({
      success: true,
      data: {
        pointsAwarded,
        achievementsUnlocked,
        totalPoints: (await gamificationService.getProfile(req.user.id)).points
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/gamification/progress
 * @desc    Get user progress towards next level and achievements
 * @access  Private
 */
router.get('/progress', protect, async (req, res) => {
  try {
    const profile = await gamificationService.getProfile(req.user.id);
    const unlockedAchievements = await Achievement.find({ userId: req.user.id });
    const unlockedTypes = unlockedAchievements.map(a => a.type);
    
    const availableAchievements = Object.entries(gamificationService.ACHIEVEMENTS)
      .filter(([type]) => !unlockedTypes.includes(type))
      .map(([type, data]) => ({
        type,
        ...data,
        progress: getAchievementProgress(type, profile)
      }));
    
    res.json({
      success: true,
      data: {
        level: profile.level,
        currentPoints: profile.points,
        pointsToNextLevel: profile.pointsToNextLevel,
        progressPercentage: Math.min(100, Math.round(
          ((profile.points % 1000) / 1000) * 100
        )),
        unlockedAchievements: unlockedAchievements.length,
        totalAchievements: Object.keys(gamificationService.ACHIEVEMENTS).length,
        availableAchievements
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Helper function to calculate achievement progress
 */
function getAchievementProgress(type, profile) {
  const progress = { current: 0, target: 0, percentage: 0 };
  
  switch (type) {
    case 'first_donation':
      progress.current = profile.totalDonations;
      progress.target = 1;
      break;
    case 'hero':
      progress.current = profile.totalDonations;
      progress.target = 5;
      break;
    case 'lifesaver':
      progress.current = profile.totalDonations;
      progress.target = 10;
      break;
    case 'champion':
      progress.current = profile.totalDonations;
      progress.target = 25;
      break;
    case 'streak_3':
      progress.current = profile.streakCount;
      progress.target = 3;
      break;
    case 'streak_5':
      progress.current = profile.streakCount;
      progress.target = 5;
      break;
    case 'streak_10':
      progress.current = profile.streakCount;
      progress.target = 10;
      break;
    default:
      progress.current = 0;
      progress.target = 1;
  }
  
  progress.percentage = progress.target > 0
    ? Math.min(100, Math.round((progress.current / progress.target) * 100))
    : 0;
  
  return progress;
}

module.exports = router;

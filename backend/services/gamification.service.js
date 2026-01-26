const { Gamification, Achievement } = require('../models/Gamification');

// Achievement definitions
const ACHIEVEMENTS = {
  first_donation: {
    name: 'First Donation',
    description: 'Completed your first blood donation',
    icon: '🩸',
    points: 50
  },
  hero: {
    name: 'Hero',
    description: 'Completed 5 donations',
    icon: '🦸',
    points: 100
  },
  lifesaver: {
    name: 'Lifesaver',
    description: 'Completed 10 donations',
    icon: '⭐',
    points: 200
  },
  champion: {
    name: 'Champion',
    description: 'Completed 25 donations',
    icon: '👑',
    points: 500
  },
  streak_3: {
    name: '3-Streak',
    description: 'Donated 3 times in a row',
    icon: '🔥',
    points: 75
  },
  streak_5: {
    name: '5-Streak',
    description: 'Donated 5 times in a row',
    icon: '🔥🔥',
    points: 150
  },
  streak_10: {
    name: '10-Streak',
    description: 'Donated 10 times in a row',
    icon: '🔥🔥🔥',
    points: 300
  },
  distance_warrior: {
    name: 'Distance Warrior',
    description: 'Traveled over 50km to donate',
    icon: '🚗',
    points: 100
  },
  quick_responder: {
    name: 'Quick Responder',
    description: 'Responded to request within 5 minutes',
    icon: '⚡',
    points: 50
  },
  verified_donor: {
    name: 'Verified Donor',
    description: 'Completed profile verification',
    icon: '✅',
    points: 25
  }
};

/**
 * Get or create gamification profile
 */
exports.getProfile = async (userId) => {
  let profile = await Gamification.findOne({ userId })
    .populate('achievements');
  
  if (!profile) {
    profile = await Gamification.create({ userId });
  }
  
  return profile;
};

/**
 * Add points to user
 */
exports.addPoints = async (userId, points, reason) => {
  const profile = await this.getProfile(userId);
  const result = profile.addPoints(points);
  await profile.save();
  
  return {
    ...result,
    totalPoints: profile.points,
    reason
  };
};

/**
 * Update donation stats
 */
exports.updateDonationStats = async (userId, donationDate) => {
  const profile = await this.getProfile(userId);
  
  profile.totalDonations += 1;
  profile.lastDonationDate = donationDate;
  
  // Calculate streak
  if (profile.lastDonationDate) {
    const daysSinceLastDonation = Math.floor(
      (donationDate - profile.lastDonationDate) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceLastDonation <= 120) { // Within 4 months
      profile.streakCount += 1;
    } else {
      profile.streakCount = 1;
    }
  } else {
    profile.streakCount = 1;
  }
  
  await profile.save();
  
  // Check for achievements
  await this.checkAchievements(userId, profile);
  
  return profile;
};

/**
 * Check and award achievements
 */
exports.checkAchievements = async (userId, profile) => {
  const achievements = [];
  
  // First donation
  if (profile.totalDonations === 1) {
    achievements.push(await this.awardAchievement(userId, 'first_donation'));
  }
  
  // Donation milestones
  if (profile.totalDonations === 5) {
    achievements.push(await this.awardAchievement(userId, 'hero'));
  }
  if (profile.totalDonations === 10) {
    achievements.push(await this.awardAchievement(userId, 'lifesaver'));
  }
  if (profile.totalDonations === 25) {
    achievements.push(await this.awardAchievement(userId, 'champion'));
  }
  
  // Streak achievements
  if (profile.streakCount === 3) {
    achievements.push(await this.awardAchievement(userId, 'streak_3'));
  }
  if (profile.streakCount === 5) {
    achievements.push(await this.awardAchievement(userId, 'streak_5'));
  }
  if (profile.streakCount === 10) {
    achievements.push(await this.awardAchievement(userId, 'streak_10'));
  }
  
  return achievements.filter(a => a !== null);
};

/**
 * Award achievement
 */
exports.awardAchievement = async (userId, achievementType) => {
  try {
    const achievementData = ACHIEVEMENTS[achievementType];
    
    const achievement = await Achievement.create({
      userId,
      type: achievementType,
      ...achievementData
    });
    
    // Add to gamification profile
    const profile = await Gamification.findOne({ userId });
    profile.achievements.push(achievement._id);
    profile.badges.push(achievementType);
    await profile.save();
    
    // Add points
    await this.addPoints(userId, achievementData.points, `Achievement: ${achievementData.name}`);
    
    return achievement;
  } catch (error) {
    if (error.code === 11000) {
      // Achievement already exists
      return null;
    }
    throw error;
  }
};

/**
 * Get leaderboard
 */
exports.getLeaderboard = async (limit = 100, filter = {}) => {
  const leaderboard = await Gamification.find(filter)
    .sort({ points: -1 })
    .limit(limit)
    .populate('userId', 'name city state')
    .lean();
  
  return leaderboard.map((entry, index) => ({
    rank: index + 1,
    ...entry
  }));
};

/**
 * Update reliability score
 */
exports.updateReliabilityScore = async (userId, completed) => {
  const profile = await this.getProfile(userId);
  
  if (completed) {
    profile.reliabilityScore = Math.min(100, profile.reliabilityScore + 2);
  } else {
    profile.reliabilityScore = Math.max(0, profile.reliabilityScore - 10);
  }
  
  await profile.save();
  return profile.reliabilityScore;
};

module.exports.ACHIEVEMENTS = ACHIEVEMENTS;

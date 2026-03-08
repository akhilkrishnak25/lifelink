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
 * Handle donation completion - Award points and update profile
 * Call this when a donation is marked as completed
 */
exports.handleDonationComplete = async (donorId, donationData = {}) => {
  try {
    const DonationHistory = require('../models/DonationHistory');
    
    // Get or create profile
    const profile = await this.getProfile(donorId);
    
    // Award 100 points for the donation
    const pointsAwarded = 100;
    await this.addPoints(donorId, pointsAwarded, 'Blood donation completed');
    
    // Get total donation count for this donor
    const totalDonations = await DonationHistory.countDocuments({
      donorId,
      status: 'completed'
    });
    
    // Update profile stats
    profile.totalDonations = totalDonations;
    profile.lastDonation = donationData.donatedAt || new Date();
    await profile.save();
    
    // Check for achievements
    const achievements = [];
    
    // First donation achievement
    if (totalDonations === 1) {
      const achievement = await this.unlockAchievement(donorId, 'first_donation');
      if (achievement) achievements.push(achievement);
    }
    
    // Hero (5 donations)
    if (totalDonations === 5) {
      const achievement = await this.unlockAchievement(donorId, 'hero');
      if (achievement) achievements.push(achievement);
    }
    
    // Lifesaver (10 donations)
    if (totalDonations === 10) {
      const achievement = await this.unlockAchievement(donorId, 'lifesaver');
      if (achievement) achievements.push(achievement);
    }
    
    // Champion (25 donations)
    if (totalDonations === 25) {
      const achievement = await this.unlockAchievement(donorId, 'champion');
      if (achievement) achievements.push(achievement);
    }
    
    return {
      pointsAwarded,
      totalPoints: profile.points,
      totalDonations,
      level: profile.level,
      achievements
    };
  } catch (error) {
    console.error('Error handling donation completion:', error);
    throw error;
  }
};

/**
 * Get leaderboard - includes all users with donation history
 */
exports.getLeaderboard = async (limit = 100, filter = {}) => {
  const DonationHistory = require('../models/DonationHistory');
  const User = require('../models/User');
  const Donor = require('../models/Donor');
  
  // Get all users with donations
  const donationStats = await DonationHistory.aggregate([
    { $match: { status: 'completed' } },
    { 
      $group: {
        _id: '$donorId',
        donationCount: { $sum: 1 },
        lastDonation: { $max: '$donatedAt' }
      }
    }
  ]);
  
  // Create a map of userId to donation count
  const donationMap = {};
  donationStats.forEach(stat => {
    donationMap[stat._id.toString()] = {
      donationCount: stat.donationCount,
      lastDonation: stat.lastDonation
    };
  });
  
  // Get all gamification profiles
  const gamificationProfiles = await Gamification.find(filter)
    .populate('userId', 'name')
    .lean();
  
  // Merge data: gamification profiles + users with donations but no profile yet
  const userIdsWithGamification = new Set(
    gamificationProfiles.map(p => p.userId?._id?.toString()).filter(Boolean)
  );
  
  const leaderboardData = [];
  
  // Add users with gamification profiles
  for (const profile of gamificationProfiles) {
    if (profile.userId) {
      const userId = profile.userId._id.toString();
      const donations = donationMap[userId] || { donationCount: 0 };
      
      // Fetch donor info for city and blood group
      const donorInfo = await Donor.findOne({ userId: userId }).select('city state bloodGroup').lean();
      
      leaderboardData.push({
        userId: {
          _id: profile.userId._id,
          name: profile.userId.name,
          city: donorInfo?.city || 'N/A',
          state: donorInfo?.state || 'N/A',
          bloodType: donorInfo?.bloodGroup || 'N/A'
        },
        points: profile.points || 0,
        level: profile.level || 1,
        donationCount: donations.donationCount,
        lastDonation: donations.lastDonation,
        reliabilityScore: profile.reliabilityScore || 0,
        badges: profile.badges || []
      });
    }
  }
  
  // Add users with donations but no gamification profile
  for (const [userId, stats] of Object.entries(donationMap)) {
    if (!userIdsWithGamification.has(userId)) {
      const user = await User.findById(userId).select('name').lean();
      const donorInfo = await Donor.findOne({ userId: userId }).select('city state bloodGroup').lean();
      
      if (user) {
        // Award points based on donation count (100 points per donation)
        const calculatedPoints = stats.donationCount * 100;
        
        leaderboardData.push({
          userId: {
            _id: user._id,
            name: user.name,
            city: donorInfo?.city || 'N/A',
            state: donorInfo?.state || 'N/A',
            bloodType: donorInfo?.bloodGroup || 'N/A'
          },
          points: calculatedPoints,
          level: Math.floor(calculatedPoints / 1000) + 1,
          donationCount: stats.donationCount,
          lastDonation: stats.lastDonation,
          reliabilityScore: 0,
          badges: []
        });
      }
    }
  }
  
  // Sort by points (descending) and limit
  leaderboardData.sort((a, b) => (b.points || 0) - (a.points || 0));
  const limitedData = leaderboardData.slice(0, limit);
  
  // Add rank numbers
  return limitedData.map((entry, index) => ({
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

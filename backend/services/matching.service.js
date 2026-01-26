const Donor = require('../models/Donor');
const { Gamification } = require('../models/Gamification');

/**
 * Smart donor matching algorithm
 * Considers: distance, reliability score, availability, last donation date
 */
exports.findBestMatches = async (requestData, limit = 10) => {
  const { bloodGroup, location, urgency } = requestData;
  
  // Get compatible blood groups
  const compatibleGroups = this.getCompatibleBloodGroups(bloodGroup);
  
  // Base query
  const donors = await Donor.find({
    bloodGroup: { $in: compatibleGroups },
    isAvailable: true,
    medicallyFit: true
  }).populate('userId', 'name phone email');
  
  // Get gamification data for reliability scores
  const donorIds = donors.map(d => d.userId._id);
  const gamificationData = await Gamification.find({
    userId: { $in: donorIds }
  });
  
  const gamificationMap = {};
  gamificationData.forEach(g => {
    gamificationMap[g.userId.toString()] = g;
  });
  
  // Calculate scores for each donor
  const scoredDonors = donors.map(donor => {
    const distance = this.calculateDistance(
      location.coordinates[1],
      location.coordinates[0],
      donor.location.coordinates[1],
      donor.location.coordinates[0]
    );
    
    const gamification = gamificationMap[donor.userId._id.toString()] || { reliabilityScore: 50 };
    const reliabilityScore = gamification.reliabilityScore || 50;
    
    // Check if donor can donate
    const canDonate = donor.canDonate();
    
    // Blood group exact match bonus
    const exactMatchBonus = donor.bloodGroup === bloodGroup ? 20 : 0;
    
    // Calculate composite score
    // Distance: closer is better (max 50 points)
    const distanceScore = Math.max(0, 50 - distance);
    
    // Reliability: max 30 points
    const reliabilityPoints = (reliabilityScore / 100) * 30;
    
    // Availability: can donate bonus (20 points)
    const availabilityBonus = canDonate ? 20 : -30;
    
    const totalScore = distanceScore + reliabilityPoints + exactMatchBonus + availabilityBonus;
    
    return {
      donor,
      distance,
      reliabilityScore,
      canDonate,
      exactMatch: donor.bloodGroup === bloodGroup,
      score: totalScore
    };
  });
  
  // Sort by score (descending) and return top matches
  return scoredDonors
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

/**
 * Get compatible blood groups
 */
exports.getCompatibleBloodGroups = (bloodGroup) => {
  const compatibility = {
    'A+': ['A+', 'A-', 'O+', 'O-'],
    'A-': ['A-', 'O-'],
    'B+': ['B+', 'B-', 'O+', 'O-'],
    'B-': ['B-', 'O-'],
    'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], // Universal receiver
    'AB-': ['A-', 'B-', 'AB-', 'O-'],
    'O+': ['O+', 'O-'],
    'O-': ['O-'] // Universal donor
  };
  
  return compatibility[bloodGroup] || [bloodGroup];
};

/**
 * Calculate distance between two points (Haversine formula)
 */
exports.calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = this.toRad(lat2 - lat1);
  const dLon = this.toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

exports.toRad = (value) => {
  return value * Math.PI / 180;
};

/**
 * Notify matched donors
 */
exports.notifyMatches = async (io, matches, requestData) => {
  const notificationService = require('./notification.service');
  
  for (const match of matches) {
    const notification = {
      type: 'match',
      title: 'Blood Request Match',
      message: `A ${requestData.urgency} blood request for ${requestData.bloodGroup} is ${match.distance.toFixed(1)}km away from you.`,
      data: {
        requestId: requestData.requestId,
        distance: match.distance,
        urgency: requestData.urgency
      },
      priority: requestData.urgency === 'critical' ? 'critical' : 'high'
    };
    
    notificationService.sendSocketNotification(
      io,
      match.donor.userId._id,
      notification
    );
  }
};

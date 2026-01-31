/**
 * LifeLink - AI-Based Smart Donor-Receiver Matching Engine
 * Advanced matching using GPS, blood compatibility, donation history, and AI scoring
 */

const Donor = require('../../models/Donor');
const { Gamification } = require('../../models/Gamification');
const DonationHistory = require('../../models/DonationHistory');
const axios = require('axios');

/**
 * Blood Type Compatibility Matrix
 * Key: Receiver blood type, Value: Compatible donor blood types
 */
const BLOOD_COMPATIBILITY = {
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], // Universal receiver
  'AB-': ['A-', 'B-', 'AB-', 'O-'],
  'O+': ['O+', 'O-'],
  'O-': ['O-'] // Universal donor (can only receive O-)
};

/**
 * Scoring weights configuration
 */
const SCORING_WEIGHTS = {
  distance: 40,          // GPS proximity (40%)
  bloodCompatibility: 30, // Exact match bonus (30%)
  donationHistory: 15,    // Past donations success rate (15%)
  availability: 10,       // Current availability status (10%)
  reliability: 5          // Gamification reliability score (5%)
};

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Smart Matching Engine Class
 */
class SmartMatchingEngine {
  constructor() {
    this.mlApiUrl = process.env.ML_API_URL || 'http://localhost:5001';
  }

  /**
   * Find best matching donors for a blood request
   * @param {Object} request - Blood request data
   * @param {Object} options - Matching options
   * @returns {Array} Ranked list of matching donors
   */
  async findBestMatches(request, options = {}) {
    const {
      limit = 20,
      maxDistance = 50, // km
      useMLRanking = true,
      includeAlternateBloodGroups = true
    } = options;

    // Get compatible blood groups
    let compatibleGroups = [request.bloodGroup];
    if (includeAlternateBloodGroups) {
      compatibleGroups = BLOOD_COMPATIBILITY[request.bloodGroup] || [request.bloodGroup];
    }

    // Find eligible donors
    const donors = await Donor.find({
      bloodGroup: { $in: compatibleGroups },
      isAvailable: true,
      medicallyFit: true
    }).populate('userId', 'name phone email');

    if (donors.length === 0) {
      return { matches: [], totalFound: 0 };
    }

    // Get gamification data for reliability scores
    const donorUserIds = donors.map(d => d.userId._id);
    const gamificationData = await Gamification.find({ userId: { $in: donorUserIds } });
    const gamificationMap = new Map(gamificationData.map(g => [g.userId.toString(), g]));

    // Get donation history for success rate calculation
    const donationHistory = await DonationHistory.aggregate([
      { $match: { donorId: { $in: donors.map(d => d._id) } } },
      { $group: {
        _id: '$donorId',
        totalDonations: { $sum: 1 },
        successfulDonations: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
      }}
    ]);
    const historyMap = new Map(donationHistory.map(h => [h._id.toString(), h]));

    // Calculate request coordinates
    const requestLat = request.location.coordinates[1];
    const requestLon = request.location.coordinates[0];

    // Score each donor
    const scoredDonors = donors.map(donor => {
      // Calculate distance
      const donorLat = donor.location.coordinates[1];
      const donorLon = donor.location.coordinates[0];
      const distance = calculateDistance(requestLat, requestLon, donorLat, donorLon);

      // Skip if beyond max distance
      if (distance > maxDistance) {
        return null;
      }

      // Get gamification data
      const gamification = gamificationMap.get(donor.userId._id.toString()) || { reliabilityScore: 50 };

      // Get donation history
      const history = historyMap.get(donor._id.toString()) || { totalDonations: 0, successfulDonations: 0 };
      const successRate = history.totalDonations > 0 
        ? (history.successfulDonations / history.totalDonations) 
        : 0.5;

      // Check donation eligibility (3 months gap)
      const canDonate = donor.canDonate ? donor.canDonate() : this.checkDonationEligibility(donor.lastDonationDate);

      // Calculate individual scores
      const scores = {
        // Distance score: closer is better (normalized to 0-1)
        distance: Math.max(0, 1 - (distance / maxDistance)),
        
        // Blood compatibility: exact match gets full score
        bloodCompatibility: donor.bloodGroup === request.bloodGroup ? 1 : 0.7,
        
        // Donation history: based on success rate
        donationHistory: successRate,
        
        // Availability: can donate within eligibility period
        availability: canDonate ? 1 : 0,
        
        // Reliability: from gamification
        reliability: (gamification.reliabilityScore || 50) / 100
      };

      // Calculate weighted total score
      const totalScore = 
        (scores.distance * SCORING_WEIGHTS.distance) +
        (scores.bloodCompatibility * SCORING_WEIGHTS.bloodCompatibility) +
        (scores.donationHistory * SCORING_WEIGHTS.donationHistory) +
        (scores.availability * SCORING_WEIGHTS.availability) +
        (scores.reliability * SCORING_WEIGHTS.reliability);

      return {
        donor: {
          id: donor._id,
          userId: donor.userId._id,
          name: donor.userId.name,
          phone: donor.userId.phone,
          email: donor.userId.email,
          bloodGroup: donor.bloodGroup,
          city: donor.city,
          state: donor.state,
          lastDonationDate: donor.lastDonationDate,
          totalDonations: donor.totalDonations
        },
        metrics: {
          distance: Math.round(distance * 10) / 10, // km with 1 decimal
          distanceScore: scores.distance,
          bloodCompatibilityScore: scores.bloodCompatibility,
          donationHistoryScore: scores.donationHistory,
          availabilityScore: scores.availability,
          reliabilityScore: scores.reliability,
          successRate: Math.round(successRate * 100),
          totalDonations: history.totalDonations
        },
        score: Math.round(totalScore * 100) / 100,
        isExactMatch: donor.bloodGroup === request.bloodGroup,
        canDonate,
        gamification: {
          level: gamification.level || 1,
          points: gamification.totalPoints || 0,
          badges: gamification.achievements?.filter(a => a.unlockedAt)?.length || 0
        }
      };
    }).filter(d => d !== null);

    // Sort by score (descending)
    scoredDonors.sort((a, b) => b.score - a.score);

    // Apply ML re-ranking if enabled
    let finalMatches = scoredDonors;
    if (useMLRanking && scoredDonors.length > 0) {
      try {
        finalMatches = await this.applyMLRanking(scoredDonors, request);
      } catch (error) {
        console.error('ML Ranking failed, using default scoring:', error.message);
      }
    }

    // Apply limit
    const matches = finalMatches.slice(0, limit);

    return {
      matches,
      totalFound: scoredDonors.length,
      requestDetails: {
        bloodGroup: request.bloodGroup,
        urgency: request.urgency,
        hospital: request.hospitalName,
        city: request.city
      },
      compatibleBloodGroups: compatibleGroups,
      scoringWeights: SCORING_WEIGHTS
    };
  }

  /**
   * Check if donor is eligible to donate (3 months gap)
   */
  checkDonationEligibility(lastDonationDate) {
    if (!lastDonationDate) return true;
    
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    return new Date(lastDonationDate) <= threeMonthsAgo;
  }

  /**
   * Apply ML-based re-ranking using Python service
   */
  async applyMLRanking(scoredDonors, request) {
    try {
      const features = scoredDonors.map(d => ({
        distance: d.metrics.distance,
        bloodMatch: d.isExactMatch ? 1 : 0,
        successRate: d.metrics.successRate / 100,
        reliabilityScore: d.metrics.reliabilityScore,
        totalDonations: d.metrics.totalDonations,
        canDonate: d.canDonate ? 1 : 0,
        urgencyFactor: request.urgency === 'critical' ? 3 : (request.urgency === 'urgent' ? 2 : 1)
      }));

      const response = await axios.post(`${this.mlApiUrl}/rank-donors`, {
        donors: features,
        request_urgency: request.urgency
      }, { timeout: 5000 });

      if (response.data.success && response.data.rankings) {
        // Re-order based on ML rankings
        const rankings = response.data.rankings;
        return scoredDonors.map((donor, idx) => ({
          ...donor,
          mlScore: rankings[idx]?.score || donor.score,
          mlConfidence: rankings[idx]?.confidence || 0
        })).sort((a, b) => (b.mlScore || b.score) - (a.mlScore || a.score));
      }
    } catch (error) {
      console.log('ML ranking service unavailable, using default scoring');
    }

    return scoredDonors;
  }

  /**
   * Find donors within a specific radius
   */
  async findNearbyDonors(coordinates, radiusKm = 10, bloodGroup = null) {
    const query = {
      isAvailable: true,
      medicallyFit: true,
      location: {
        $geoWithin: {
          $centerSphere: [coordinates, radiusKm / 6371] // Convert km to radians
        }
      }
    };

    if (bloodGroup) {
      query.bloodGroup = { $in: BLOOD_COMPATIBILITY[bloodGroup] || [bloodGroup] };
    }

    return await Donor.find(query).populate('userId', 'name phone email');
  }

  /**
   * Get matching statistics for analytics
   */
  async getMatchingStats(startDate, endDate) {
    const BloodRequest = require('../../models/BloodRequest');
    
    const stats = await BloodRequest.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
        }
      },
      {
        $group: {
          _id: '$bloodGroup',
          totalRequests: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          avgUnitsRequired: { $avg: '$unitsRequired' }
        }
      }
    ]);

    return stats;
  }
}

module.exports = {
  SmartMatchingEngine,
  BLOOD_COMPATIBILITY,
  SCORING_WEIGHTS,
  calculateDistance
};

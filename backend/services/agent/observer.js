const Donor = require('../../models/Donor');
const BloodRequest = require('../../models/BloodRequest');
const { Gamification } = require('../../models/Gamification');

/**
 * Observer Service
 * Implements the OBSERVE layer of the Agentic AI system
 * Collects and normalizes system state for decision-making
 */

class Observer {
  /**
   * Collect complete system state for a blood request
   */
  async collectSystemState(requestData) {
    const observation = {
      // Basic request info
      bloodGroup: requestData.bloodGroup,
      urgency: requestData.urgency,
      unitsRequired: requestData.unitsRequired,
      location: requestData.location,
      city: requestData.city,
      hospitalName: requestData.hospitalName,
      timeOfRequest: requestData.createdAt || new Date(),
      
      // Environmental context
      timeOfDay: this._getTimeOfDay(),
      isWeekend: this._isWeekend(),
      
      // Donor pool analysis
      totalAvailableDonors: 0,
      eligibleDonors: 0,
      donorsInRadius: 0,
      avgDonorDistance: 0,
      
      // System load
      activeRequestsCount: 0,
      recentRequestsLast24h: 0,
      
      // Admin flags
      adminVerified: requestData.status === 'approved',
      isFlagged: requestData.isFake || false,
      mlFakeScore: requestData.mlScore || 0
    };

    // Analyze donor pool
    const donorPoolStats = await this._analyzeDonorPool(requestData);
    Object.assign(observation, donorPoolStats);

    // Analyze system load
    const systemLoad = await this._analyzeSystemLoad();
    Object.assign(observation, systemLoad);

    return observation;
  }

  /**
   * Get detailed donor data for AI scoring
   */
  async getDonorDataForScoring(requestData, maxDistance = 50) {
    const compatibleGroups = this._getCompatibleBloodGroups(requestData.bloodGroup);

    // Find available donors with geospatial query
    const donors = await Donor.find({
      bloodGroup: { $in: compatibleGroups },
      isAvailable: true,
      medicallyFit: true,
      location: {
        $near: {
          $geometry: requestData.location,
          $maxDistance: maxDistance * 1000 // Convert km to meters
        }
      }
    })
    .populate('userId', 'name email phone createdAt')
    .limit(50); // Reasonable limit

    // Get gamification data for reliability scores
    const donorUserIds = donors.map(d => d.userId?._id).filter(Boolean);
    const gamificationData = await Gamification.find({
      userId: { $in: donorUserIds }
    });

    const gamificationMap = {};
    gamificationData.forEach(g => {
      gamificationMap[g.userId.toString()] = g;
    });

    // Format donor data for ML service
    const donorDataArray = donors.map(donor => {
      const distance = this._calculateDistance(
        requestData.location.coordinates[1],
        requestData.location.coordinates[0],
        donor.location.coordinates[1],
        donor.location.coordinates[0]
      );

      const gamification = gamificationMap[donor.userId?._id.toString()] || {};
      const reliabilityScore = gamification.reliabilityScore || 50;

      const daysSinceLastDonation = donor.lastDonationDate
        ? Math.floor((Date.now() - donor.lastDonationDate) / (1000 * 60 * 60 * 24))
        : 999;

      const canDonate = donor.canDonate();

      // Estimate last active (we'll enhance this with real tracking later)
      const accountAge = donor.userId?.createdAt
        ? Math.floor((Date.now() - donor.userId.createdAt) / (1000 * 60 * 60))
        : 24;

      return {
        donor_id: donor._id.toString(),
        blood_group: donor.bloodGroup,
        distance: parseFloat(distance.toFixed(2)),
        reliability_score: reliabilityScore,
        can_donate: canDonate,
        days_since_last_donation: daysSinceLastDonation,
        is_available: donor.isAvailable,
        last_active_hours: Math.min(accountAge, 72), // Cap at 3 days
        total_donations: donor.totalDonations || 0,
        city: donor.city,
        state: donor.state
      };
    });

    return donorDataArray;
  }

  /**
   * Analyze donor pool availability
   */
  async _analyzeDonorPool(requestData) {
    const compatibleGroups = this._getCompatibleBloodGroups(requestData.bloodGroup);

    // Total available donors with compatible blood
    const totalAvailable = await Donor.countDocuments({
      bloodGroup: { $in: compatibleGroups },
      isAvailable: true,
      medicallyFit: true
    });

    // Eligible donors (can donate now - 3 month gap)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const eligible = await Donor.countDocuments({
      bloodGroup: { $in: compatibleGroups },
      isAvailable: true,
      medicallyFit: true,
      $or: [
        { lastDonationDate: null },
        { lastDonationDate: { $lte: threeMonthsAgo } }
      ]
    });

    // Donors in 25km radius
    const donorsNearby = await Donor.find({
      bloodGroup: { $in: compatibleGroups },
      isAvailable: true,
      medicallyFit: true,
      location: {
        $near: {
          $geometry: requestData.location,
          $maxDistance: 25000 // 25 km
        }
      }
    }).limit(20);

    // Calculate average distance of nearby donors
    let totalDistance = 0;
    donorsNearby.forEach(donor => {
      const dist = this._calculateDistance(
        requestData.location.coordinates[1],
        requestData.location.coordinates[0],
        donor.location.coordinates[1],
        donor.location.coordinates[0]
      );
      totalDistance += dist;
    });

    const avgDistance = donorsNearby.length > 0 ? totalDistance / donorsNearby.length : 0;

    return {
      totalAvailableDonors: totalAvailable,
      eligibleDonors: eligible,
      donorsInRadius: donorsNearby.length,
      avgDonorDistance: parseFloat(avgDistance.toFixed(2))
    };
  }

  /**
   * Analyze current system load
   */
  async _analyzeSystemLoad() {
    // Active requests (pending or approved)
    const activeRequests = await BloodRequest.countDocuments({
      status: { $in: ['pending', 'approved'] }
    });

    // Recent requests in last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentRequests = await BloodRequest.countDocuments({
      createdAt: { $gte: twentyFourHoursAgo }
    });

    return {
      activeRequestsCount: activeRequests,
      recentRequestsLast24h: recentRequests
    };
  }

  /**
   * Get compatible blood groups
   */
  _getCompatibleBloodGroups(bloodGroup) {
    const compatibility = {
      'A+': ['A+', 'A-', 'O+', 'O-'],
      'A-': ['A-', 'O-'],
      'B+': ['B+', 'B-', 'O+', 'O-'],
      'B-': ['B-', 'O-'],
      'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      'AB-': ['A-', 'B-', 'AB-', 'O-'],
      'O+': ['O+', 'O-'],
      'O-': ['O-']
    };

    return compatibility[bloodGroup] || [bloodGroup];
  }

  /**
   * Calculate distance using Haversine formula
   */
  _calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this._deg2rad(lat2 - lat1);
    const dLon = this._deg2rad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this._deg2rad(lat1)) * Math.cos(this._deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }

  _deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  /**
   * Get time of day category
   */
  _getTimeOfDay() {
    const hour = new Date().getHours();
    
    if (hour >= 22 || hour < 6) return 'night';
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    return 'evening';
  }

  /**
   * Check if weekend
   */
  _isWeekend() {
    const day = new Date().getDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
  }
}

module.exports = Observer;

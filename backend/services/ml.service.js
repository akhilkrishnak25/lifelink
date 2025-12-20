const axios = require('axios');

/**
 * Call ML API to analyze blood request for fake detection
 * @param {Object} features - ML features for analysis
 * @returns {Promise<Object>} - ML prediction result
 */
exports.analyzeFakeRequest = async (features) => {
  try {
    const mlApiUrl = process.env.ML_API_URL || 'http://localhost:5001';
    
    const response = await axios.post(`${mlApiUrl}/predict`, {
      features: [
        features.requestsPerDay,
        features.accountAgeDays,
        features.timeGapHours,
        features.locationChanges
      ]
    }, {
      timeout: 5000 // 5 second timeout
    });

    return {
      success: true,
      prediction: response.data.prediction,
      score: response.data.score,
      confidence: response.data.confidence
    };
  } catch (error) {
    console.error('ML API Error:', error.message);
    
    // If ML service is down, return a default response
    return {
      success: false,
      prediction: 'genuine', // Default to genuine if ML fails
      score: 0,
      confidence: 0,
      error: 'ML service unavailable'
    };
  }
};

/**
 * Extract features from user data for ML analysis
 * @param {String} userId - User ID
 * @param {Object} location - Current location coordinates
 * @returns {Promise<Object>} - Extracted features
 */
exports.extractFeatures = async (userId, location) => {
  const User = require('../models/User');
  const BloodRequest = require('../models/BloodRequest');

  try {
    // Get user account age
    const user = await User.findById(userId);
    const accountAgeDays = Math.floor((Date.now() - user.createdAt) / (1000 * 60 * 60 * 24));

    // Get user's previous requests
    const userRequests = await BloodRequest.find({ receiverId: userId }).sort({ createdAt: -1 });

    // Calculate requests in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const requestsPerDay = userRequests.filter(req => req.createdAt >= oneDayAgo).length;

    // Calculate time gap since last request (in hours)
    let timeGapHours = 24 * 365; // Default to 1 year if no previous requests
    if (userRequests.length > 0) {
      const lastRequest = userRequests[0];
      timeGapHours = Math.floor((Date.now() - lastRequest.createdAt) / (1000 * 60 * 60));
    }

    // Calculate location changes
    let locationChanges = 0;
    if (userRequests.length > 1) {
      for (let i = 0; i < userRequests.length - 1; i++) {
        const loc1 = userRequests[i].location.coordinates;
        const loc2 = userRequests[i + 1].location.coordinates;
        
        // If location changed significantly (>5km), count it
        const distance = calculateDistance(loc1[1], loc1[0], loc2[1], loc2[0]);
        if (distance > 5) {
          locationChanges++;
        }
      }
    }

    return {
      requestsPerDay: Math.min(requestsPerDay, 10), // Cap at 10
      accountAgeDays: Math.min(accountAgeDays, 365), // Cap at 365
      timeGapHours: Math.min(timeGapHours, 8760), // Cap at 1 year
      locationChanges: Math.min(locationChanges, 10) // Cap at 10
    };
  } catch (error) {
    console.error('Feature extraction error:', error);
    // Return default safe values
    return {
      requestsPerDay: 0,
      accountAgeDays: 0,
      timeGapHours: 24,
      locationChanges: 0
    };
  }
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Number} lat1 - Latitude 1
 * @param {Number} lon1 - Longitude 1
 * @param {Number} lat2 - Latitude 2
 * @param {Number} lon2 - Longitude 2
 * @returns {Number} - Distance in kilometers
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

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

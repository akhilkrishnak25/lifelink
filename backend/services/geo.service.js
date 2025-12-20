/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Number} lat1 - Latitude 1
 * @param {Number} lon1 - Longitude 1
 * @param {Number} lat2 - Latitude 2
 * @param {Number} lon2 - Longitude 2
 * @returns {Number} - Distance in kilometers
 */
exports.calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Find nearby donors based on location and blood group
 * @param {Number} latitude - Request latitude
 * @param {Number} longitude - Request longitude
 * @param {String} bloodGroup - Required blood group
 * @param {Number} maxDistance - Maximum distance in km (default: 50)
 * @returns {Promise<Array>} - Array of nearby donors
 */
exports.findNearbyDonors = async (latitude, longitude, bloodGroup, maxDistance = 50) => {
  const Donor = require('../models/Donor');
  
  try {
    // Find compatible blood groups
    const compatibleGroups = getCompatibleBloodGroups(bloodGroup);
    
    // Query for nearby donors
    const donors = await Donor.find({
      bloodGroup: { $in: compatibleGroups },
      isAvailable: true,
      medicallyFit: true,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: maxDistance * 1000 // Convert km to meters
        }
      }
    })
    .populate('userId', 'name email phone')
    .limit(50); // Limit to 50 nearest donors

    // Calculate distance for each donor
    const donorsWithDistance = donors.map(donor => {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        donor.location.coordinates[1],
        donor.location.coordinates[0]
      );

      return {
        ...donor.toObject(),
        distance: Math.round(distance * 10) / 10 // Round to 1 decimal
      };
    });

    return donorsWithDistance;
  } catch (error) {
    console.error('Error finding nearby donors:', error);
    throw error;
  }
};

/**
 * Find nearby blood requests for a donor
 * @param {Number} latitude - Donor latitude
 * @param {Number} longitude - Donor longitude
 * @param {String} bloodGroup - Donor blood group
 * @param {Number} maxDistance - Maximum distance in km (default: 50)
 * @returns {Promise<Array>} - Array of nearby requests
 */
exports.findNearbyRequests = async (latitude, longitude, bloodGroup, maxDistance = 50) => {
  const BloodRequest = require('../models/BloodRequest');
  
  try {
    // Find requests that can accept this blood group
    const compatibleRequests = await BloodRequest.find({
      status: { $in: ['pending', 'approved'] },
      isFake: false,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: maxDistance * 1000 // Convert km to meters
        }
      }
    })
    .populate('receiverId', 'name phone')
    .sort({ urgency: -1, createdAt: -1 })
    .limit(30);

    // Filter by blood compatibility and calculate distance
    const requestsWithDistance = compatibleRequests
      .filter(request => canDonateToGroup(bloodGroup, request.bloodGroup))
      .map(request => {
        const distance = this.calculateDistance(
          latitude,
          longitude,
          request.location.coordinates[1],
          request.location.coordinates[0]
        );

        return {
          ...request.toObject(),
          distance: Math.round(distance * 10) / 10
        };
      });

    return requestsWithDistance;
  } catch (error) {
    console.error('Error finding nearby requests:', error);
    throw error;
  }
};

/**
 * Get compatible blood groups for receiving
 * @param {String} bloodGroup - Required blood group
 * @returns {Array} - Array of compatible donor blood groups
 */
function getCompatibleBloodGroups(bloodGroup) {
  const compatibility = {
    'O-': ['O-'],
    'O+': ['O-', 'O+'],
    'A-': ['O-', 'A-'],
    'A+': ['O-', 'O+', 'A-', 'A+'],
    'B-': ['O-', 'B-'],
    'B+': ['O-', 'O+', 'B-', 'B+'],
    'AB-': ['O-', 'A-', 'B-', 'AB-'],
    'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
  };
  
  return compatibility[bloodGroup] || [bloodGroup];
}

/**
 * Check if donor can donate to recipient
 * @param {String} donorGroup - Donor blood group
 * @param {String} recipientGroup - Recipient blood group
 * @returns {Boolean} - Whether donation is compatible
 */
function canDonateToGroup(donorGroup, recipientGroup) {
  const canDonateTo = {
    'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    'O+': ['O+', 'A+', 'B+', 'AB+'],
    'A-': ['A-', 'A+', 'AB-', 'AB+'],
    'A+': ['A+', 'AB+'],
    'B-': ['B-', 'B+', 'AB-', 'AB+'],
    'B+': ['B+', 'AB+'],
    'AB-': ['AB-', 'AB+'],
    'AB+': ['AB+']
  };
  
  return canDonateTo[donorGroup]?.includes(recipientGroup) || false;
}

/**
 * Convert degrees to radians
 */
function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

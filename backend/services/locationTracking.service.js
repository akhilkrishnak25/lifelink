const axios = require('axios');
const RequestTracking = require('../models/RequestTracking');

class LocationTrackingService {
  
  /**
   * Get location from IP address
   */
  async getLocationFromIP(ipAddress) {
    try {
      // Skip localhost/private IPs
      if (ipAddress === '127.0.0.1' || ipAddress === '::1' || ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.')) {
        return {
          city: 'Local',
          region: 'Local',
          country: 'Local',
          latitude: 0,
          longitude: 0,
          timezone: 'UTC',
          isp: 'Local Network'
        };
      }

      // Using ip-api.com (free, no API key needed)
      const response = await axios.get(`http://ip-api.com/json/${ipAddress}`, {
        timeout: 3000
      });
      
      if (response.data.status === 'success') {
        return {
          city: response.data.city,
          region: response.data.regionName,
          country: response.data.country,
          latitude: response.data.lat,
          longitude: response.data.lon,
          timezone: response.data.timezone,
          isp: response.data.isp
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching location from IP:', error.message);
      return null;
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 10) / 10; // Round to 1 decimal
  }

  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Check for suspicious location patterns
   */
  async analyzeLocationPattern(userId, currentIP, currentLocation) {
    const suspicionFlags = [];
    
    // Get user's recent requests (last 24 hours)
    const recentRequests = await RequestTracking.find({
      userId,
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).sort({ timestamp: -1 }).limit(10);

    if (recentRequests.length === 0) {
      return { 
        isSuspicious: false, 
        flags: [], 
        severity: 0,
        details: {
          timeSinceLastRequest: null,
          distanceFromLastLocation: null,
          recentRequestCount: 0,
          uniqueLocations: 0
        }
      };
    }

    const lastRequest = recentRequests[0];
    const timeDiff = (Date.now() - lastRequest.timestamp) / (1000 * 60); // in minutes

    // Flag 1: Different IP in short time
    if (lastRequest.ipAddress !== currentIP && timeDiff < 60) {
      suspicionFlags.push('different_ip');
    }

    let distance = null;

    // Flag 2 & 3: Location jump and impossible travel detection
    if (lastRequest.location && currentLocation && lastRequest.location.latitude && currentLocation.latitude) {
      distance = this.calculateDistance(
        lastRequest.location.latitude,
        lastRequest.location.longitude,
        currentLocation.latitude,
        currentLocation.longitude
      );

      // Flag 3: Impossible travel (e.g., 500km in 2 hours)
      const maxPossibleSpeed = 100; // km/h (reasonable max speed including travel time)
      const possibleDistance = (timeDiff / 60) * maxPossibleSpeed;

      if (distance > 500 && timeDiff < 120) {
        suspicionFlags.push('impossible_travel');
        suspicionFlags.push('location_jump');
      } else if (distance > 50 && timeDiff < 60) {
        // Different city (>50km) in less than an hour
        suspicionFlags.push('location_jump');
      }
    }

    // Flag 4: Rapid requests (velocity check)
    const requestsInLast30Min = recentRequests.filter(
      req => (Date.now() - req.timestamp) / (1000 * 60) < 30
    ).length;

    if (requestsInLast30Min >= 3) {
      suspicionFlags.push('rapid_requests');
    }

    // Flag 5: Multiple cities in short time (6 hours)
    const requestsInLast6Hours = recentRequests.filter(
      req => (Date.now() - req.timestamp) / (1000 * 60 * 60) < 6
    );

    const uniqueCities = new Set(
      requestsInLast6Hours
        .filter(req => req.location && req.location.city)
        .map(req => req.location.city)
    );

    if (uniqueCities.size >= 3) {
      suspicionFlags.push('location_jump');
    }

    // Calculate severity score (0-100)
    let severity = 0;
    if (suspicionFlags.includes('impossible_travel')) severity += 50;
    if (suspicionFlags.includes('location_jump')) severity += 30;
    if (suspicionFlags.includes('rapid_requests')) severity += 20;
    if (suspicionFlags.includes('different_ip')) severity += 15;

    return {
      isSuspicious: suspicionFlags.length > 0,
      flags: suspicionFlags,
      severity: Math.min(severity, 100),
      details: {
        timeSinceLastRequest: Math.round(timeDiff),
        distanceFromLastLocation: distance,
        recentRequestCount: recentRequests.length,
        uniqueLocations: uniqueCities.size
      }
    };
  }

  /**
   * Track a new request
   */
  async trackRequest(userId, requestId, req, bloodRequestLocation = null) {
    // Extract IP address
    let ipAddress = req.ip || 
                    req.connection.remoteAddress || 
                    req.headers['x-forwarded-for']?.split(',')[0] || 
                    '127.0.0.1';
    
    // Clean up IPv6 mapped IPv4
    if (ipAddress.includes('::ffff:')) {
      ipAddress = ipAddress.split('::ffff:')[1];
    }

    // 🔄 Use blood request coordinates if provided, otherwise fallback to IP geolocation
    let location = bloodRequestLocation ? {
      city: bloodRequestLocation.city,
      latitude: bloodRequestLocation.latitude,
      longitude: bloodRequestLocation.longitude,
      region: bloodRequestLocation.state || '',
      country: 'India'
    } : await this.getLocationFromIP(ipAddress);
    
    const tracking = new RequestTracking({
      userId,
      requestId,
      ipAddress,
      location,
      userAgent: req.headers['user-agent'],
      timestamp: new Date()
    });

    // Analyze pattern before saving
    const analysis = await this.analyzeLocationPattern(userId, ipAddress, location);
    
    if (analysis.isSuspicious) {
      tracking.suspicionFlags = analysis.flags;
      if (analysis.details.distanceFromLastLocation) {
        tracking.distanceFromLastRequest = analysis.details.distanceFromLastLocation;
      }
      if (analysis.details.timeSinceLastRequest) {
        tracking.timeFromLastRequest = analysis.details.timeSinceLastRequest;
      }
    }

    await tracking.save();

    return {
      tracking,
      analysis
    };
  }

  /**
   * Get user's location history
   */
  async getUserLocationHistory(userId, days = 7) {
    const requests = await RequestTracking.find({
      userId,
      timestamp: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
    }).sort({ timestamp: -1 });

    return requests;
  }

  /**
   * Get suspicious requests across all users (for admin)
   */
  async getSuspiciousRequests(limit = 50) {
    const suspicious = await RequestTracking.find({
      suspicionFlags: { $exists: true, $ne: [] }
    })
    .populate('userId', 'name email phone')
    .populate('requestId', 'bloodGroup urgency status')
    .sort({ timestamp: -1 })
    .limit(limit);

    return suspicious;
  }
}

module.exports = new LocationTrackingService();

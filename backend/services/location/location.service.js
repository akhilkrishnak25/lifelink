/**
 * LifeLink - GPS Location Tracking Service
 * Real-time tracking of donors and hospitals for emergency response
 */

const Redis = require('ioredis');
const Donor = require('../../models/Donor');

/**
 * Location configuration
 */
const LOCATION_CONFIG = {
  // Cache expiry for live locations (5 minutes)
  cacheExpiry: 300,
  // Default search radius in km
  defaultRadius: 25,
  // Maximum search radius in km
  maxRadius: 100,
  // Location update throttle (minimum seconds between updates)
  updateThrottle: 30,
  // Geofence alert radius in meters
  geofenceRadius: 1000
};

/**
 * Redis client for live location caching
 */
class LocationCache {
  constructor() {
    this.enabled = !!process.env.REDIS_URL;
    if (this.enabled) {
      this.client = new Redis(process.env.REDIS_URL);
      this.client.on('error', (err) => {
        console.error('Redis Location Cache Error:', err.message);
      });
      this.client.on('connect', () => {
        console.log('✅ Redis Location Cache connected');
      });
    } else {
      // In-memory fallback cache
      this.memoryCache = new Map();
      console.log('⚠️ Redis not configured, using in-memory location cache');
    }
  }

  /**
   * Store user location in cache
   */
  async setLocation(userId, location) {
    const key = `location:${userId}`;
    const data = JSON.stringify({
      ...location,
      timestamp: Date.now()
    });

    if (this.enabled) {
      await this.client.setex(key, LOCATION_CONFIG.cacheExpiry, data);
    } else {
      this.memoryCache.set(key, {
        data,
        expiry: Date.now() + (LOCATION_CONFIG.cacheExpiry * 1000)
      });
    }
  }

  /**
   * Get user location from cache
   */
  async getLocation(userId) {
    const key = `location:${userId}`;

    if (this.enabled) {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } else {
      const cached = this.memoryCache.get(key);
      if (cached && cached.expiry > Date.now()) {
        return JSON.parse(cached.data);
      }
      this.memoryCache.delete(key);
      return null;
    }
  }

  /**
   * Get all live locations (for map display)
   */
  async getAllLiveLocations() {
    if (this.enabled) {
      const keys = await this.client.keys('location:*');
      if (keys.length === 0) return [];

      const pipeline = this.client.pipeline();
      keys.forEach(key => pipeline.get(key));
      const results = await pipeline.exec();

      return results
        .map(([err, data], index) => {
          if (err || !data) return null;
          const parsed = JSON.parse(data);
          return {
            userId: keys[index].replace('location:', ''),
            ...parsed
          };
        })
        .filter(Boolean);
    } else {
      const locations = [];
      const now = Date.now();
      
      for (const [key, value] of this.memoryCache.entries()) {
        if (key.startsWith('location:') && value.expiry > now) {
          locations.push({
            userId: key.replace('location:', ''),
            ...JSON.parse(value.data)
          });
        }
      }
      return locations;
    }
  }

  /**
   * Remove user location from cache
   */
  async removeLocation(userId) {
    const key = `location:${userId}`;
    
    if (this.enabled) {
      await this.client.del(key);
    } else {
      this.memoryCache.delete(key);
    }
  }
}

/**
 * Haversine formula for distance calculation
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
 * GPS Location Tracking Service
 */
class LocationService {
  constructor() {
    this.cache = new LocationCache();
    this.geofences = new Map(); // Active geofences
    this.lastUpdateTime = new Map(); // Throttle tracking
  }

  /**
   * Update user's live location
   */
  async updateLocation(userId, locationData) {
    const { latitude, longitude, accuracy, heading, speed } = locationData;

    // Validate coordinates
    if (!this.isValidCoordinate(latitude, longitude)) {
      throw new Error('Invalid GPS coordinates');
    }

    // Throttle updates
    const lastUpdate = this.lastUpdateTime.get(userId);
    if (lastUpdate && (Date.now() - lastUpdate) < (LOCATION_CONFIG.updateThrottle * 1000)) {
      return { throttled: true, message: 'Update throttled, try again later' };
    }

    // Prepare location data
    const location = {
      latitude,
      longitude,
      accuracy: accuracy || null,
      heading: heading || null,
      speed: speed || null,
      updatedAt: new Date().toISOString()
    };

    // Store in cache for real-time access
    await this.cache.setLocation(userId, location);

    // Update last update time
    this.lastUpdateTime.set(userId, Date.now());

    // Check geofences
    const geofenceAlerts = await this.checkGeofences(userId, latitude, longitude);

    // Update donor's location in database (less frequent, for persistence)
    await this.updateDonorLocation(userId, latitude, longitude);

    return {
      success: true,
      location,
      geofenceAlerts
    };
  }

  /**
   * Get nearby donors based on location
   */
  async getNearbyDonors(latitude, longitude, options = {}) {
    const {
      radius = LOCATION_CONFIG.defaultRadius,
      bloodGroup = null,
      limit = 50,
      availableOnly = true
    } = options;

    // Validate coordinates
    if (!this.isValidCoordinate(latitude, longitude)) {
      throw new Error('Invalid GPS coordinates');
    }

    // Clamp radius
    const searchRadius = Math.min(radius, LOCATION_CONFIG.maxRadius);

    // Build query
    const query = {
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: searchRadius * 1000 // Convert km to meters
        }
      }
    };

    if (bloodGroup) {
      query.bloodGroup = bloodGroup;
    }

    if (availableOnly) {
      query.isAvailable = true;
      query.medicallyFit = true;
    }

    // Find donors
    const donors = await Donor.find(query)
      .limit(limit)
      .populate('userId', 'name phone');

    // Enhance with live location data and calculate distance
    const enhancedDonors = await Promise.all(
      donors.map(async (donor) => {
        const liveLocation = await this.cache.getLocation(donor.userId._id.toString());
        
        // Use live location if available, otherwise use stored location
        const donorLat = liveLocation?.latitude || donor.location.coordinates[1];
        const donorLon = liveLocation?.longitude || donor.location.coordinates[0];
        
        const distance = calculateDistance(latitude, longitude, donorLat, donorLon);

        return {
          donor: {
            id: donor._id,
            userId: donor.userId._id,
            name: donor.userId.name,
            phone: donor.userId.phone,
            bloodGroup: donor.bloodGroup,
            isAvailable: donor.isAvailable,
            lastDonationDate: donor.lastDonationDate
          },
          location: {
            latitude: donorLat,
            longitude: donorLon,
            isLive: !!liveLocation,
            lastUpdated: liveLocation?.updatedAt || donor.updatedAt
          },
          distance: Math.round(distance * 100) / 100 // Round to 2 decimal places
        };
      })
    );

    // Sort by distance
    enhancedDonors.sort((a, b) => a.distance - b.distance);

    return {
      donors: enhancedDonors,
      searchCenter: { latitude, longitude },
      searchRadius,
      totalFound: enhancedDonors.length
    };
  }

  /**
   * Get nearby hospitals based on location
   */
  async getNearbyHospitals(latitude, longitude, options = {}) {
    const {
      radius = LOCATION_CONFIG.defaultRadius,
      limit = 20,
      hasBloodBank = false
    } = options;

    // Validate coordinates
    if (!this.isValidCoordinate(latitude, longitude)) {
      throw new Error('Invalid GPS coordinates');
    }

    const searchRadius = Math.min(radius, LOCATION_CONFIG.maxRadius);

    // Query hospitals from database
    const Hospital = require('../../models/Hospital');
    
    const query = {
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: searchRadius * 1000
        }
      },
      isActive: true
    };

    if (hasBloodBank) {
      query.hasBloodBank = true;
    }

    try {
      const hospitals = await Hospital.find(query).limit(limit);

      const enhancedHospitals = hospitals.map(hospital => {
        const distance = calculateDistance(
          latitude, longitude,
          hospital.location.coordinates[1],
          hospital.location.coordinates[0]
        );

        return {
          hospital: {
            id: hospital._id,
            name: hospital.name,
            address: hospital.address,
            phone: hospital.contactNumber,
            hasBloodBank: hospital.hasBloodBank,
            bloodStock: hospital.bloodStock
          },
          location: {
            latitude: hospital.location.coordinates[1],
            longitude: hospital.location.coordinates[0]
          },
          distance: Math.round(distance * 100) / 100
        };
      });

      enhancedHospitals.sort((a, b) => a.distance - b.distance);

      return {
        hospitals: enhancedHospitals,
        searchCenter: { latitude, longitude },
        searchRadius,
        totalFound: enhancedHospitals.length
      };
    } catch (error) {
      // Hospital model may not exist yet
      console.warn('Hospital model not available:', error.message);
      return {
        hospitals: [],
        searchCenter: { latitude, longitude },
        searchRadius,
        totalFound: 0
      };
    }
  }

  /**
   * Create a geofence for a blood request location
   */
  async createGeofence(requestId, centerLat, centerLon, radiusMeters = LOCATION_CONFIG.geofenceRadius) {
    const geofence = {
      requestId,
      center: { latitude: centerLat, longitude: centerLon },
      radius: radiusMeters,
      createdAt: new Date(),
      triggeredUsers: new Set()
    };

    this.geofences.set(requestId, geofence);

    return {
      success: true,
      geofence: {
        ...geofence,
        triggeredUsers: Array.from(geofence.triggeredUsers)
      }
    };
  }

  /**
   * Check if user entered any geofences
   */
  async checkGeofences(userId, latitude, longitude) {
    const alerts = [];

    for (const [requestId, geofence] of this.geofences.entries()) {
      // Skip if user already triggered this geofence
      if (geofence.triggeredUsers.has(userId)) continue;

      const distance = calculateDistance(
        latitude, longitude,
        geofence.center.latitude,
        geofence.center.longitude
      ) * 1000; // Convert to meters

      if (distance <= geofence.radius) {
        geofence.triggeredUsers.add(userId);
        alerts.push({
          type: 'geofence_entered',
          requestId,
          distance: Math.round(distance),
          message: `You are near a blood request location (${Math.round(distance)}m away)`
        });
      }
    }

    return alerts;
  }

  /**
   * Remove geofence
   */
  removeGeofence(requestId) {
    return this.geofences.delete(requestId);
  }

  /**
   * Get user's current location from cache
   */
  async getUserLocation(userId) {
    return await this.cache.getLocation(userId);
  }

  /**
   * Get all live donor locations for map display
   */
  async getAllLiveLocations() {
    const locations = await this.cache.getAllLiveLocations();
    
    // Enhance with donor info
    const enhancedLocations = await Promise.all(
      locations.map(async (loc) => {
        try {
          const donor = await Donor.findOne({ userId: loc.userId })
            .populate('userId', 'name');
          
          if (donor) {
            return {
              ...loc,
              donorInfo: {
                name: donor.userId.name,
                bloodGroup: donor.bloodGroup,
                isAvailable: donor.isAvailable
              }
            };
          }
          return loc;
        } catch (error) {
          return loc;
        }
      })
    );

    return enhancedLocations;
  }

  /**
   * Update donor location in database
   */
  async updateDonorLocation(userId, latitude, longitude) {
    try {
      await Donor.findOneAndUpdate(
        { userId },
        {
          location: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          updatedAt: new Date()
        }
      );
    } catch (error) {
      console.error('Error updating donor location in DB:', error.message);
    }
  }

  /**
   * Validate GPS coordinates
   */
  isValidCoordinate(latitude, longitude) {
    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      latitude >= -90 && latitude <= 90 &&
      longitude >= -180 && longitude <= 180 &&
      !isNaN(latitude) && !isNaN(longitude)
    );
  }

  /**
   * Calculate ETA between two points (basic estimation)
   */
  calculateETA(fromLat, fromLon, toLat, toLon, speedKmh = 30) {
    const distance = calculateDistance(fromLat, fromLon, toLat, toLon);
    const hours = distance / speedKmh;
    const minutes = Math.round(hours * 60);

    return {
      distance: Math.round(distance * 100) / 100,
      estimatedMinutes: minutes,
      formattedETA: minutes < 60 
        ? `${minutes} min` 
        : `${Math.floor(minutes / 60)}h ${minutes % 60}m`
    };
  }

  /**
   * Get directions URL (Google Maps)
   */
  getDirectionsUrl(fromLat, fromLon, toLat, toLon) {
    return `https://www.google.com/maps/dir/${fromLat},${fromLon}/${toLat},${toLon}`;
  }

  /**
   * Clear user's live location
   */
  async clearLocation(userId) {
    await this.cache.removeLocation(userId);
    this.lastUpdateTime.delete(userId);
  }
}

// Singleton instance
const locationService = new LocationService();

module.exports = {
  LocationService,
  locationService,
  LocationCache,
  LOCATION_CONFIG,
  calculateDistance
};

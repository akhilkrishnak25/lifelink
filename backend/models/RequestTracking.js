const mongoose = require('mongoose');

const requestTrackingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BloodRequest'
  },
  ipAddress: {
    type: String,
    required: true
  },
  location: {
    city: String,
    region: String,
    country: String,
    latitude: Number,
    longitude: Number,
    timezone: String,
    isp: String
  },
  userAgent: String,
  deviceFingerprint: String,
  timestamp: {
    type: Date,
    default: Date.now
  },
  suspicionFlags: [{
    type: String,
    enum: [
      'location_jump',
      'rapid_requests',
      'different_ip',
      'vpn_detected',
      'impossible_travel'
    ]
  }],
  distanceFromLastRequest: Number, // in kilometers
  timeFromLastRequest: Number // in minutes
});

requestTrackingSchema.index({ userId: 1, timestamp: -1 });
requestTrackingSchema.index({ ipAddress: 1, timestamp: -1 });

module.exports = mongoose.model('RequestTracking', requestTrackingSchema);

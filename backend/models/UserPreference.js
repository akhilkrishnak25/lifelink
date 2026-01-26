const mongoose = require('mongoose');

const userPreferenceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  // Notification Preferences
  notifications: {
    email: {
      enabled: { type: Boolean, default: true },
      requests: { type: Boolean, default: true },
      matches: { type: Boolean, default: true },
      reminders: { type: Boolean, default: true },
      newsletters: { type: Boolean, default: false }
    },
    push: {
      enabled: { type: Boolean, default: true },
      critical: { type: Boolean, default: true },
      urgent: { type: Boolean, default: true },
      normal: { type: Boolean, default: false }
    },
    sms: {
      enabled: { type: Boolean, default: false },
      critical: { type: Boolean, default: false }
    },
    quietHours: {
      enabled: { type: Boolean, default: false },
      startTime: { type: String, default: '22:00' },
      endTime: { type: String, default: '08:00' }
    }
  },
  // Privacy Settings
  privacy: {
    showExactLocation: { type: Boolean, default: false },
    showPhone: { type: Boolean, default: true },
    profileVisibility: {
      type: String,
      enum: ['public', 'donors-only', 'private'],
      default: 'public'
    },
    dataSharing: { type: Boolean, default: false }
  },
  // Language
  language: {
    type: String,
    default: 'en',
    enum: ['en', 'hi', 'es', 'fr', 'de']
  },
  // Theme
  theme: {
    type: String,
    enum: ['light', 'dark', 'auto'],
    default: 'light'
  },
  // Search Radius (in km)
  searchRadius: {
    type: Number,
    default: 10,
    min: 1,
    max: 100
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('UserPreference', userPreferenceSchema);

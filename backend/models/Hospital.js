const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Hospital name is required'],
    trim: true,
    maxlength: 200
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true
  },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  pincode: {
    type: String,
    required: true,
    match: [/^[0-9]{6}$/, 'Please provide a valid 6-digit pincode']
  },
  contactNumber: {
    type: String,
    required: true,
    match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true // [longitude, latitude]
    }
  },
  hasBloodBank: {
    type: Boolean,
    default: true
  },
  bloodStock: {
    // units available per blood group
    'A+': { type: Number, default: 0 },
    'A-': { type: Number, default: 0 },
    'B+': { type: Number, default: 0 },
    'B-': { type: Number, default: 0 },
    'AB+': { type: Number, default: 0 },
    'AB-': { type: Number, default: 0 },
    'O+': { type: Number, default: 0 },
    'O-': { type: Number, default: 0 }
  },
  syncStatus: {
    type: String,
    enum: ['active', 'paused', 'error'],
    default: 'active'
  },
  // Shared secret for webhook HMAC verification
  webhookSecret: {
    type: String,
    select: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastSyncedAt: {
    type: Date
  }
}, {
  timestamps: true
});

hospitalSchema.index({ location: '2dsphere' });
hospitalSchema.index({ city: 1, state: 1 });
hospitalSchema.index({ isActive: 1, hasBloodBank: 1 });

module.exports = mongoose.model('Hospital', hospitalSchema);

const mongoose = require('mongoose');

const donorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  bloodGroup: {
    type: String,
    required: [true, 'Blood group is required'],
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: [true, 'Location coordinates are required']
    }
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true
  },
  pincode: {
    type: String,
    required: [true, 'Pincode is required'],
    match: [/^[0-9]{6}$/, 'Please provide a valid 6-digit pincode']
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  lastDonationDate: {
    type: Date,
    default: null
  },
  totalDonations: {
    type: Number,
    default: 0
  },
  medicallyFit: {
    type: Boolean,
    default: true
  },
  ageGroup: {
    type: String,
    enum: ['18-25', '26-35', '36-45', '46-60'],
    required: [true, 'Age group is required']
  }
}, {
  timestamps: true
});

// Create 2dsphere index for geospatial queries
donorSchema.index({ location: '2dsphere' });

// Index for blood group queries
donorSchema.index({ bloodGroup: 1 });

// Index for availability
donorSchema.index({ isAvailable: 1 });

// Compound index for common queries
donorSchema.index({ bloodGroup: 1, isAvailable: 1 });

// Method to check if donor can donate (minimum 3 months gap)
donorSchema.methods.canDonate = function() {
  if (!this.lastDonationDate) {
    return true;
  }
  
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  
  return this.lastDonationDate <= threeMonthsAgo;
};

// Virtual for calculating days since last donation
donorSchema.virtual('daysSinceLastDonation').get(function() {
  if (!this.lastDonationDate) {
    return null;
  }
  
  const diffTime = Math.abs(new Date() - this.lastDonationDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

const Donor = mongoose.model('Donor', donorSchema);

module.exports = Donor;

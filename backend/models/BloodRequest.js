const mongoose = require('mongoose');

const bloodRequestSchema = new mongoose.Schema({
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bloodGroup: {
    type: String,
    required: [true, 'Blood group is required'],
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  urgency: {
    type: String,
    required: [true, 'Urgency level is required'],
    enum: ['critical', 'urgent', 'normal'],
    default: 'normal'
  },
  hospitalName: {
    type: String,
    required: [true, 'Hospital name is required'],
    trim: true
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
  contactNumber: {
    type: String,
    required: [true, 'Contact number is required'],
    match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
  },
  unitsRequired: {
    type: Number,
    required: [true, 'Number of units required is mandatory'],
    min: [1, 'At least 1 unit is required'],
    max: [10, 'Maximum 10 units can be requested']
  },
  patientName: {
    type: String,
    required: [true, 'Patient name is required'],
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'completed', 'rejected', 'cancelled'],
    default: 'pending'
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  // ML-related fields
  isFake: {
    type: Boolean,
    default: false
  },
  mlScore: {
    type: Number,
    default: 0
  },
  mlAnalysisDate: {
    type: Date
  },
  // Donor responses
  interestedDonors: [{
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donor'
    },
    respondedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['interested', 'accepted', 'rejected'],
      default: 'interested'
    }
  }],
  acceptedDonorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Donor',
    default: null
  },
  completedAt: {
    type: Date
  },
  // Admin fields
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  adminNotes: {
    type: String
  }
}, {
  timestamps: true
});

// Create 2dsphere index for geospatial queries
bloodRequestSchema.index({ location: '2dsphere' });

// Index for status queries
bloodRequestSchema.index({ status: 1 });

// Index for blood group queries
bloodRequestSchema.index({ bloodGroup: 1 });

// Index for urgency
bloodRequestSchema.index({ urgency: 1 });

// Index for fake detection
bloodRequestSchema.index({ isFake: 1 });

// Index for receiver's requests
bloodRequestSchema.index({ receiverId: 1, createdAt: -1 });

// Compound index for active requests
bloodRequestSchema.index({ status: 1, bloodGroup: 1, urgency: -1 });

// Virtual for age of request in hours
bloodRequestSchema.virtual('ageInHours').get(function() {
  const diffTime = Math.abs(new Date() - this.createdAt);
  const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
  return diffHours;
});

// Method to check if request is still active
bloodRequestSchema.methods.isActive = function() {
  return ['pending', 'approved'].includes(this.status);
};

const BloodRequest = mongoose.model('BloodRequest', bloodRequestSchema);

module.exports = BloodRequest;

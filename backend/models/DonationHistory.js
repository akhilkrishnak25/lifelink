const mongoose = require('mongoose');

const donationHistorySchema = new mongoose.Schema({
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Donor',
    required: true
  },
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BloodRequest',
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bloodGroup: {
    type: String,
    required: true,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  donationDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  hospitalName: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number] // [longitude, latitude]
    }
  },
  unitsGiven: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  status: {
    type: String,
    enum: ['completed', 'cancelled', 'no-show'],
    default: 'completed'
  },
  feedback: {
    type: String,
    trim: true,
    maxlength: [300, 'Feedback cannot exceed 300 characters']
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for donor's history
donationHistorySchema.index({ donorId: 1, donationDate: -1 });

// Index for request tracking
donationHistorySchema.index({ requestId: 1 });

// Index for receiver's received donations
donationHistorySchema.index({ receiverId: 1 });

// Index for blood group statistics
donationHistorySchema.index({ bloodGroup: 1 });

const DonationHistory = mongoose.model('DonationHistory', donationHistorySchema);

module.exports = DonationHistory;

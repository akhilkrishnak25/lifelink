const mongoose = require('mongoose');

const fakeRequestAnalysisSchema = new mongoose.Schema({
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BloodRequest',
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Features used for ML analysis
  features: {
    requestsPerDay: {
      type: Number,
      required: true,
      default: 0
    },
    accountAgeDays: {
      type: Number,
      required: true,
      default: 0
    },
    timeGapHours: {
      type: Number,
      required: true,
      default: 0
    },
    locationChanges: {
      type: Number,
      required: true,
      default: 0
    }
  },
  // ML Results
  mlScore: {
    type: Number,
    required: true
  },
  prediction: {
    type: String,
    enum: ['genuine', 'fake'],
    required: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1
  },
  analyzedAt: {
    type: Date,
    default: Date.now
  },
  // Admin review
  adminReviewed: {
    type: Boolean,
    default: false
  },
  adminDecision: {
    type: String,
    enum: ['approved', 'rejected', 'pending'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewNotes: {
    type: String
  }
}, {
  timestamps: true
});

// Index for quick lookup by request
fakeRequestAnalysisSchema.index({ requestId: 1 });

// Index for admin review queue
fakeRequestAnalysisSchema.index({ prediction: 1, adminReviewed: 1 });

// Index for user analysis history
fakeRequestAnalysisSchema.index({ userId: 1, analyzedAt: -1 });

const FakeRequestAnalysis = mongoose.model('FakeRequestAnalysis', fakeRequestAnalysisSchema);

module.exports = FakeRequestAnalysis;

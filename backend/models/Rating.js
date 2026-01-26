const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  fromUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  toUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BloodRequest',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  review: {
    type: String,
    trim: true,
    maxlength: 500
  },
  category: {
    type: String,
    enum: ['donor', 'receiver'],
    required: true
  },
  tags: [{
    type: String,
    enum: ['responsive', 'professional', 'helpful', 'reliable', 'friendly', 'punctual']
  }],
  verified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Ensure one rating per request per user
ratingSchema.index({ fromUserId: 1, toUserId: 1, requestId: 1 }, { unique: true });
ratingSchema.index({ toUserId: 1, category: 1 });

module.exports = mongoose.model('Rating', ratingSchema);

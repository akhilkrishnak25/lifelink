const mongoose = require('mongoose');

const blockchainRecordSchema = new mongoose.Schema({
  transactionHash: {
    type: String,
    required: [true, 'Transaction hash is required'],
    index: true,
    trim: true
  },
  chain: {
    type: String,
    default: 'polygon',
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  donationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DonationHistory',
    index: true
  },
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BloodRequest',
    index: true
  },
  action: {
    type: String,
    enum: ['donation_record', 'request_verification', 'trust_score_update'],
    required: true
  },
  ipfsHash: {
    type: String,
    trim: true
  },
  payloadHash: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'failed'],
    default: 'pending',
    index: true
  },
  error: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('BlockchainRecord', blockchainRecordSchema);

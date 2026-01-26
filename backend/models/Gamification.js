const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['first_donation', 'hero', 'lifesaver', 'champion', 'streak_3', 'streak_5', 'streak_10', 'distance_warrior', 'quick_responder', 'verified_donor'],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: '🏆'
  },
  points: {
    type: Number,
    default: 0
  },
  unlockedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

achievementSchema.index({ userId: 1, type: 1 }, { unique: true });

const gamificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  points: {
    type: Number,
    default: 0,
    index: true
  },
  level: {
    type: Number,
    default: 1
  },
  badges: [{
    type: String
  }],
  achievements: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Achievement'
  }],
  streakCount: {
    type: Number,
    default: 0
  },
  lastDonationDate: {
    type: Date
  },
  totalDonations: {
    type: Number,
    default: 0
  },
  totalRequests: {
    type: Number,
    default: 0
  },
  responseRate: {
    type: Number,
    default: 0
  },
  averageResponseTime: {
    type: Number,
    default: 0
  },
  reliabilityScore: {
    type: Number,
    default: 100,
    min: 0,
    max: 100
  }
}, {
  timestamps: true
});

// Calculate level based on points
gamificationSchema.methods.calculateLevel = function() {
  this.level = Math.floor(this.points / 100) + 1;
  return this.level;
};

// Add points and check for level up
gamificationSchema.methods.addPoints = function(points) {
  const oldLevel = this.level;
  this.points += points;
  this.calculateLevel();
  return { levelUp: this.level > oldLevel, newLevel: this.level };
};

const Achievement = mongoose.model('Achievement', achievementSchema);
const Gamification = mongoose.model('Gamification', gamificationSchema);

module.exports = { Achievement, Gamification };

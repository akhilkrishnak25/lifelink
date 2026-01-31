const mongoose = require('mongoose');

/**
 * AgentState Model - Stores the system state for agentic decision making
 * Tracks each blood request's journey through the Observe-Decide-Plan-Act-Learn loop
 */
const agentStateSchema = new mongoose.Schema({
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BloodRequest',
    required: true,
    unique: true
  },
  
  // OBSERVE - System perception data
  observation: {
    bloodGroup: String,
    urgency: { type: String, enum: ['critical', 'urgent', 'normal'] },
    unitsRequired: Number,
    location: {
      type: { type: String, default: 'Point' },
      coordinates: [Number]
    },
    city: String,
    hospitalName: String,
    timeOfRequest: Date,
    
    // Environmental context
    timeOfDay: { type: String, enum: ['night', 'morning', 'afternoon', 'evening'] },
    isWeekend: Boolean,
    
    // Available donor pool snapshot
    totalAvailableDonors: Number,
    eligibleDonors: Number,
    donorsInRadius: Number,
    avgDonorDistance: Number,
    
    // System load
    activeRequestsCount: Number,
    recentRequestsLast24h: Number,
    
    // Admin flags
    adminVerified: Boolean,
    isFlagged: Boolean,
    mlFakeScore: Number
  },
  
  // DECIDE - AI decision and scoring
  decision: {
    rankedDonors: [{
      donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor' },
      score: Number,
      confidence: Number,
      distance: Number,
      reliabilityScore: Number,
      responseTimePrediction: Number, // predicted minutes
      successProbability: Number, // 0-1
      reason: String // why this donor was selected
    }],
    
    strategyType: {
      type: String,
      enum: ['targeted', 'broadcast', 'escalation', 'hybrid'],
      default: 'targeted'
    },
    
    mlRecommendation: {
      suggestedStrategy: String,
      confidence: Number,
      topDonorCount: Number,
      reasoning: String
    },
    
    decisionTimestamp: Date,
    processingTimeMs: Number
  },
  
  // PLAN - Multi-step strategy
  plan: {
    steps: [{
      stepNumber: Number,
      action: String, // 'notify_donors', 'broadcast', 'escalate', 'open_chat', 'lock_slot'
      targetDonors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Donor' }],
      scheduledTime: Date,
      timeout: Number, // milliseconds
      fallbackAction: String,
      status: { type: String, enum: ['pending', 'executing', 'completed', 'failed', 'skipped'], default: 'pending' }
    }],
    
    responseWindow: Number, // minutes to wait for donor response
    escalationTrigger: String, // 'no_response', 'insufficient_donors', 'time_critical'
    escalationPlan: {
      enabled: Boolean,
      triggerAfterMinutes: Number,
      expandRadiusKm: Number,
      broadcastToAll: Boolean
    },
    
    createdAt: Date
  },
  
  // ACT - Execution tracking
  execution: {
    actions: [{
      actionId: String,
      type: String, // 'socket_notification', 'email', 'sms', 'chat_opened', 'donor_locked'
      targetId: mongoose.Schema.Types.ObjectId,
      executedAt: Date,
      success: Boolean,
      errorMessage: String,
      metadata: mongoose.Schema.Types.Mixed
    }],
    
    notificationsSent: Number,
    chatSessionsOpened: Number,
    donorsContacted: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Donor' }],
    
    currentStep: Number,
    status: { type: String, enum: ['initialized', 'executing', 'awaiting_response', 'escalated', 'completed', 'failed'], default: 'initialized' }
  },
  
  // LEARN - Feedback and outcomes
  learning: {
    donorResponses: [{
      donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor' },
      respondedAt: Date,
      responseTimeMinutes: Number,
      accepted: Boolean,
      rejectionReason: String,
      predictedVsActual: {
        predictedTime: Number,
        actualTime: Number,
        accuracyScore: Number
      }
    }],
    
    finalOutcome: {
      matched: Boolean,
      matchedDonorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor' },
      completedAt: Date,
      totalTimeMinutes: Number,
      donationCompleted: Boolean,
      receiverRating: Number,
      adminIntervention: Boolean
    },
    
    performanceMetrics: {
      responseRate: Number, // percentage of donors who responded
      successRate: Number, // percentage of successful matches
      avgResponseTime: Number, // minutes
      strategyEffectiveness: Number, // 0-1 score
      predictionAccuracy: Number // 0-1 score
    },
    
    improvements: [{
      aspect: String, // 'donor_selection', 'timing', 'strategy', 'prediction'
      observation: String,
      suggestedAdjustment: String,
      timestamp: Date
    }],
    
    feedbackCollectedAt: Date,
    usedForTraining: { type: Boolean, default: false }
  },
  
  // Control and safety
  safetyChecks: {
    adminOverride: Boolean,
    overrideReason: String,
    medicalEligibilityVerified: Boolean,
    cooldownRespected: Boolean,
    duplicateRequestCheck: Boolean
  },
  
  // Metadata
  agentVersion: { type: String, default: '1.0.0' },
  loopIterations: { type: Number, default: 0 }, // times the agent re-evaluated
  lastUpdated: Date
}, {
  timestamps: true
});

// Indexes for performance
agentStateSchema.index({ requestId: 1 });
agentStateSchema.index({ 'execution.status': 1 });
agentStateSchema.index({ 'learning.feedbackCollectedAt': 1 });
agentStateSchema.index({ 'observation.urgency': 1, 'execution.status': 1 });
agentStateSchema.index({ createdAt: -1 });

// Method to check if agent should re-evaluate
agentStateSchema.methods.shouldReEvaluate = function() {
  // Re-evaluate if:
  // 1. No response after timeout
  // 2. Critical request with no match
  // 3. Admin flagged for review
  
  const now = new Date();
  const timeSinceCreation = (now - this.createdAt) / (1000 * 60); // minutes
  
  if (this.observation.urgency === 'critical' && timeSinceCreation > 10 && this.execution.status === 'awaiting_response') {
    return true;
  }
  
  if (this.plan.escalationTrigger && this.execution.status === 'awaiting_response') {
    const responseWindow = this.plan.responseWindow || 30;
    if (timeSinceCreation > responseWindow) {
      return true;
    }
  }
  
  return false;
};

// Method to calculate system performance for this request
agentStateSchema.methods.calculatePerformance = function() {
  const responses = this.learning.donorResponses || [];
  const totalContacted = this.execution.donorsContacted.length;
  
  if (totalContacted === 0) {
    return { responseRate: 0, avgResponseTime: 0 };
  }
  
  const responseRate = (responses.length / totalContacted) * 100;
  const avgResponseTime = responses.length > 0
    ? responses.reduce((sum, r) => sum + (r.responseTimeMinutes || 0), 0) / responses.length
    : 0;
  
  return { responseRate, avgResponseTime };
};

module.exports = mongoose.model('AgentState', agentStateSchema);

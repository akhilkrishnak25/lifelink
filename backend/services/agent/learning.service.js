const axios = require('axios');
const AgentState = require('../../models/AgentState');

/**
 * Learning Service
 * Implements the LEARN layer of the Agentic AI system
 * Collects feedback and improves system performance over time
 */

class LearningService {
  constructor() {
    this.mlApiUrl = process.env.ML_API_URL || 'http://localhost:5001';
  }

  /**
   * Record donor response for learning
   */
  async recordDonorResponse(agentStateId, donorId, accepted, rejectionReason = null) {
    const agentState = await AgentState.findById(agentStateId);
    if (!agentState) {
      throw new Error('Agent state not found');
    }

    const respondedAt = new Date();
    const requestTime = agentState.createdAt;
    const responseTimeMinutes = (respondedAt - requestTime) / (1000 * 60);

    // Find predicted response time for this donor
    const donorDecision = agentState.decision.rankedDonors.find(
      d => d.donorId.toString() === donorId.toString()
    );

    const predictedTime = donorDecision?.responseTimePrediction || 0;
    const accuracyScore = this._calculateAccuracy(predictedTime, responseTimeMinutes);

    // Record response
    const responseRecord = {
      donorId,
      respondedAt,
      responseTimeMinutes: parseFloat(responseTimeMinutes.toFixed(2)),
      accepted,
      rejectionReason,
      predictedVsActual: {
        predictedTime,
        actualTime: responseTimeMinutes,
        accuracyScore
      }
    };

    agentState.learning.donorResponses.push(responseRecord);
    await agentState.save();

    // Send feedback to ML service for learning
    await this._updateMLLearning(donorId, responseTimeMinutes, accepted);

    console.log(`📚 Recorded response: Donor ${donorId}, Time: ${responseTimeMinutes.toFixed(1)}min, Accepted: ${accepted}`);

    return responseRecord;
  }

  /**
   * Record final outcome when donation is completed or request is fulfilled
   */
  async recordFinalOutcome(agentStateId, outcomeData) {
    const agentState = await AgentState.findById(agentStateId);
    if (!agentState) {
      throw new Error('Agent state not found');
    }

    const completedAt = new Date();
    const totalTimeMinutes = (completedAt - agentState.createdAt) / (1000 * 60);

    agentState.learning.finalOutcome = {
      matched: outcomeData.matched || false,
      matchedDonorId: outcomeData.matchedDonorId || null,
      completedAt,
      totalTimeMinutes: parseFloat(totalTimeMinutes.toFixed(2)),
      donationCompleted: outcomeData.donationCompleted || false,
      receiverRating: outcomeData.receiverRating || null,
      adminIntervention: outcomeData.adminIntervention || false
    };

    // Calculate performance metrics
    const metrics = this._calculatePerformanceMetrics(agentState);
    agentState.learning.performanceMetrics = metrics;

    // Generate improvement suggestions
    const improvements = this._generateImprovements(agentState, metrics);
    agentState.learning.improvements = improvements;

    agentState.learning.feedbackCollectedAt = new Date();

    await agentState.save();

    console.log(`📊 Final outcome recorded: Matched=${outcomeData.matched}, Time=${totalTimeMinutes.toFixed(1)}min, Strategy=${agentState.decision.strategyType}`);

    return agentState.learning;
  }

  /**
   * Calculate performance metrics
   */
  _calculatePerformanceMetrics(agentState) {
    const responses = agentState.learning.donorResponses || [];
    const contacted = agentState.execution.donorsContacted.length || 1;

    // Response rate
    const responseRate = (responses.length / contacted) * 100;

    // Success rate (donors who accepted)
    const acceptedResponses = responses.filter(r => r.accepted).length;
    const successRate = responses.length > 0 ? (acceptedResponses / responses.length) * 100 : 0;

    // Average response time
    const avgResponseTime = responses.length > 0
      ? responses.reduce((sum, r) => sum + r.responseTimeMinutes, 0) / responses.length
      : 0;

    // Strategy effectiveness (based on whether we matched successfully)
    const matched = agentState.learning.finalOutcome.matched || false;
    const urgency = agentState.observation.urgency;
    
    let strategyEffectiveness = 0;
    if (matched) {
      // Critical: should complete in < 30 min
      // Urgent: should complete in < 60 min
      // Normal: should complete in < 120 min
      const totalTime = agentState.learning.finalOutcome.totalTimeMinutes || 999;
      const thresholds = { critical: 30, urgent: 60, normal: 120 };
      const threshold = thresholds[urgency] || 120;
      
      strategyEffectiveness = Math.max(0, Math.min(1, 1 - (totalTime / threshold)));
    }

    // Prediction accuracy
    const accuracyScores = responses
      .map(r => r.predictedVsActual.accuracyScore)
      .filter(score => score > 0);
    
    const predictionAccuracy = accuracyScores.length > 0
      ? accuracyScores.reduce((sum, score) => sum + score, 0) / accuracyScores.length
      : 0;

    return {
      responseRate: parseFloat(responseRate.toFixed(2)),
      successRate: parseFloat(successRate.toFixed(2)),
      avgResponseTime: parseFloat(avgResponseTime.toFixed(2)),
      strategyEffectiveness: parseFloat(strategyEffectiveness.toFixed(2)),
      predictionAccuracy: parseFloat(predictionAccuracy.toFixed(2))
    };
  }

  /**
   * Generate improvement suggestions based on performance
   */
  _generateImprovements(agentState, metrics) {
    const improvements = [];

    // Low response rate
    if (metrics.responseRate < 30) {
      improvements.push({
        aspect: 'donor_selection',
        observation: `Low response rate (${metrics.responseRate}%)`,
        suggestedAdjustment: 'Increase donor pool size or improve targeting criteria',
        timestamp: new Date()
      });
    }

    // Slow average response time
    if (metrics.avgResponseTime > 30) {
      improvements.push({
        aspect: 'timing',
        observation: `Slow average response time (${metrics.avgResponseTime} minutes)`,
        suggestedAdjustment: 'Consider time-of-day factors or donor notification preferences',
        timestamp: new Date()
      });
    }

    // Low strategy effectiveness
    if (metrics.strategyEffectiveness < 0.5 && agentState.learning.finalOutcome.matched) {
      improvements.push({
        aspect: 'strategy',
        observation: `Strategy took longer than optimal (effectiveness: ${metrics.strategyEffectiveness})`,
        suggestedAdjustment: `Try different strategy for ${agentState.observation.urgency} requests`,
        timestamp: new Date()
      });
    }

    // Low prediction accuracy
    if (metrics.predictionAccuracy < 0.6) {
      improvements.push({
        aspect: 'prediction',
        observation: `ML predictions not accurate (${metrics.predictionAccuracy})`,
        suggestedAdjustment: 'Retrain model with recent feedback data',
        timestamp: new Date()
      });
    }

    // No match achieved
    if (!agentState.learning.finalOutcome.matched) {
      improvements.push({
        aspect: 'strategy',
        observation: 'Failed to match donor with receiver',
        suggestedAdjustment: 'Expand search radius earlier or use hybrid strategy',
        timestamp: new Date()
      });
    }

    return improvements;
  }

  /**
   * Calculate accuracy of prediction vs actual
   */
  _calculateAccuracy(predicted, actual) {
    if (predicted === 0) return 0;
    
    const error = Math.abs(predicted - actual);
    const percentageError = (error / Math.max(predicted, actual)) * 100;
    
    // Convert to accuracy score (0-1)
    return Math.max(0, Math.min(1, 1 - (percentageError / 100)));
  }

  /**
   * Update ML service with learning data
   */
  async _updateMLLearning(donorId, responseTimeMinutes, success) {
    try {
      await axios.post(`${this.mlApiUrl}/update-learning`, {
        donor_id: donorId.toString(),
        response_time_minutes: responseTimeMinutes,
        success: success
      });
    } catch (error) {
      console.error('Failed to update ML learning:', error.message);
      // Don't throw - learning update is non-critical
    }
  }

  /**
   * Get system-wide learning insights
   */
  async getSystemInsights(timeRange = 7) {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - timeRange);

    const recentStates = await AgentState.find({
      'learning.feedbackCollectedAt': { $gte: daysAgo }
    });

    if (recentStates.length === 0) {
      return { message: 'Not enough data for insights', dataPoints: 0 };
    }

    // Aggregate metrics
    const totalRequests = recentStates.length;
    const matchedRequests = recentStates.filter(s => s.learning.finalOutcome.matched).length;
    const matchRate = (matchedRequests / totalRequests) * 100;

    const avgMetrics = {
      responseRate: 0,
      successRate: 0,
      avgResponseTime: 0,
      strategyEffectiveness: 0,
      predictionAccuracy: 0
    };

    recentStates.forEach(state => {
      Object.keys(avgMetrics).forEach(key => {
        avgMetrics[key] += state.learning.performanceMetrics[key] || 0;
      });
    });

    Object.keys(avgMetrics).forEach(key => {
      avgMetrics[key] = parseFloat((avgMetrics[key] / totalRequests).toFixed(2));
    });

    // Strategy effectiveness by urgency
    const strategyByUrgency = {
      critical: { total: 0, matched: 0, avgTime: 0 },
      urgent: { total: 0, matched: 0, avgTime: 0 },
      normal: { total: 0, matched: 0, avgTime: 0 }
    };

    recentStates.forEach(state => {
      const urgency = state.observation.urgency;
      if (strategyByUrgency[urgency]) {
        strategyByUrgency[urgency].total++;
        if (state.learning.finalOutcome.matched) {
          strategyByUrgency[urgency].matched++;
          strategyByUrgency[urgency].avgTime += state.learning.finalOutcome.totalTimeMinutes;
        }
      }
    });

    Object.keys(strategyByUrgency).forEach(urgency => {
      const data = strategyByUrgency[urgency];
      if (data.matched > 0) {
        data.avgTime = parseFloat((data.avgTime / data.matched).toFixed(2));
      }
      data.matchRate = data.total > 0 ? parseFloat(((data.matched / data.total) * 100).toFixed(2)) : 0;
    });

    return {
      timeRangeDays: timeRange,
      totalRequests,
      matchRate: parseFloat(matchRate.toFixed(2)),
      averageMetrics: avgMetrics,
      performanceByUrgency: strategyByUrgency,
      topImprovements: this._getTopImprovements(recentStates)
    };
  }

  /**
   * Get most common improvement suggestions
   */
  _getTopImprovements(states) {
    const improvementCounts = {};

    states.forEach(state => {
      (state.learning.improvements || []).forEach(imp => {
        const key = `${imp.aspect}: ${imp.suggestedAdjustment}`;
        improvementCounts[key] = (improvementCounts[key] || 0) + 1;
      });
    });

    return Object.entries(improvementCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([suggestion, count]) => ({ suggestion, count }));
  }

  /**
   * Check if model needs retraining
   */
  async shouldRetrainModel() {
    const insights = await this.getSystemInsights(7);
    
    // Retrain if prediction accuracy is low or we have enough new data
    return (
      insights.averageMetrics?.predictionAccuracy < 0.6 ||
      insights.totalRequests >= 100
    );
  }
}

module.exports = LearningService;

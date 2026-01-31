const axios = require('axios');

/**
 * Strategy Planner Service
 * Implements the PLAN layer of the Agentic AI system
 * Converts AI decisions into executable multi-step plans
 */

class StrategyPlanner {
  constructor() {
    this.mlApiUrl = process.env.ML_API_URL || 'http://localhost:5001';
  }

  /**
   * Generate execution plan based on strategy type and scored donors
   */
  async generatePlan(strategyType, scoredDonors, requestContext) {
    switch (strategyType) {
      case 'targeted':
        return this._createTargetedPlan(scoredDonors, requestContext);
      
      case 'broadcast':
        return this._createBroadcastPlan(scoredDonors, requestContext);
      
      case 'escalation':
        return this._createEscalationPlan(scoredDonors, requestContext);
      
      case 'hybrid':
        return this._createHybridPlan(scoredDonors, requestContext);
      
      default:
        return this._createTargetedPlan(scoredDonors, requestContext);
    }
  }

  /**
   * Targeted Plan - Notify specific high-score donors
   */
  _createTargetedPlan(scoredDonors, requestContext) {
    const topCount = Math.min(5, scoredDonors.length);
    const topDonors = scoredDonors.slice(0, topCount);
    const urgency = requestContext.urgency || 'normal';

    // Set response window based on urgency
    const responseWindows = {
      'critical': 10,
      'urgent': 20,
      'normal': 30
    };

    const plan = {
      steps: [
        {
          stepNumber: 1,
          action: 'notify_donors',
          targetDonors: topDonors.map(d => d.donor_id),
          scheduledTime: new Date(),
          timeout: responseWindows[urgency] * 60 * 1000, // Convert to ms
          fallbackAction: 'escalate',
          status: 'pending'
        },
        {
          stepNumber: 2,
          action: 'open_chat',
          targetDonors: topDonors.map(d => d.donor_id),
          scheduledTime: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes after notifications
          timeout: null,
          fallbackAction: null,
          status: 'pending'
        }
      ],
      responseWindow: responseWindows[urgency],
      escalationTrigger: 'no_response',
      escalationPlan: {
        enabled: true,
        triggerAfterMinutes: responseWindows[urgency],
        expandRadiusKm: 10,
        broadcastToAll: urgency === 'critical'
      },
      createdAt: new Date()
    };

    return plan;
  }

  /**
   * Broadcast Plan - Notify all available donors in area
   */
  _createBroadcastPlan(scoredDonors, requestContext) {
    const urgency = requestContext.urgency || 'normal';
    const broadcastRadius = urgency === 'critical' ? 20 : 10;

    const plan = {
      steps: [
        {
          stepNumber: 1,
          action: 'broadcast',
          targetDonors: scoredDonors.map(d => d.donor_id),
          scheduledTime: new Date(),
          timeout: 15 * 60 * 1000, // 15 minutes
          fallbackAction: 'expand_radius',
          status: 'pending',
          metadata: { radiusKm: broadcastRadius }
        }
      ],
      responseWindow: 15,
      escalationTrigger: 'insufficient_donors',
      escalationPlan: {
        enabled: true,
        triggerAfterMinutes: 15,
        expandRadiusKm: broadcastRadius + 10,
        broadcastToAll: true
      },
      createdAt: new Date()
    };

    return plan;
  }

  /**
   * Escalation Plan - Gradually increase donor pool
   */
  _createEscalationPlan(scoredDonors, requestContext) {
    const steps = [];
    const batchSize = 3;
    const maxSteps = Math.min(4, Math.ceil(scoredDonors.length / batchSize));

    for (let i = 0; i < maxSteps; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, scoredDonors.length);
      const batchDonors = scoredDonors.slice(start, end);

      steps.push({
        stepNumber: i + 1,
        action: 'notify_donors',
        targetDonors: batchDonors.map(d => d.donor_id),
        scheduledTime: new Date(Date.now() + i * 10 * 60 * 1000), // 10 min intervals
        timeout: 10 * 60 * 1000,
        fallbackAction: i < maxSteps - 1 ? 'next_batch' : 'broadcast',
        status: 'pending'
      });
    }

    const plan = {
      steps,
      responseWindow: 10,
      escalationTrigger: 'time_critical',
      escalationPlan: {
        enabled: true,
        triggerAfterMinutes: maxSteps * 10,
        expandRadiusKm: 15,
        broadcastToAll: false
      },
      createdAt: new Date()
    };

    return plan;
  }

  /**
   * Hybrid Plan - Targeted first, then broadcast
   */
  _createHybridPlan(scoredDonors, requestContext) {
    const topCount = Math.min(5, scoredDonors.length);
    const topDonors = scoredDonors.slice(0, topCount);
    const remainingDonors = scoredDonors.slice(topCount);

    const plan = {
      steps: [
        {
          stepNumber: 1,
          action: 'notify_donors',
          targetDonors: topDonors.map(d => d.donor_id),
          scheduledTime: new Date(),
          timeout: 5 * 60 * 1000, // 5 minutes for critical
          fallbackAction: 'broadcast',
          status: 'pending'
        },
        {
          stepNumber: 2,
          action: 'broadcast',
          targetDonors: remainingDonors.map(d => d.donor_id),
          scheduledTime: new Date(Date.now() + 5 * 60 * 1000), // After 5 minutes
          timeout: 10 * 60 * 1000,
          fallbackAction: 'expand_radius',
          status: 'pending',
          metadata: { radiusKm: 15 }
        }
      ],
      responseWindow: 15,
      escalationTrigger: 'no_response',
      escalationPlan: {
        enabled: true,
        triggerAfterMinutes: 15,
        expandRadiusKm: 25,
        broadcastToAll: true
      },
      createdAt: new Date()
    };

    return plan;
  }

  /**
   * Adjust plan based on real-time feedback
   */
  adjustPlan(currentPlan, feedback) {
    // If we're getting responses, no need to escalate
    if (feedback.responseCount > 0) {
      currentPlan.escalationPlan.enabled = false;
    }

    // If critical and no responses, speed up escalation
    if (feedback.urgency === 'critical' && feedback.responseCount === 0) {
      currentPlan.escalationPlan.triggerAfterMinutes = Math.max(
        5,
        currentPlan.escalationPlan.triggerAfterMinutes / 2
      );
    }

    return currentPlan;
  }

  /**
   * Check if plan should escalate
   */
  shouldEscalate(agentState) {
    if (!agentState.plan.escalationPlan.enabled) {
      return false;
    }

    const timeSinceCreation = (Date.now() - agentState.createdAt) / (1000 * 60); // minutes
    const triggerTime = agentState.plan.escalationPlan.triggerAfterMinutes;

    // Check trigger conditions
    if (timeSinceCreation >= triggerTime) {
      // Check if we have trigger condition met
      if (agentState.plan.escalationTrigger === 'no_response') {
        return agentState.learning.donorResponses.length === 0;
      }

      if (agentState.plan.escalationTrigger === 'insufficient_donors') {
        return agentState.learning.donorResponses.length < 2;
      }

      if (agentState.plan.escalationTrigger === 'time_critical') {
        return !agentState.learning.finalOutcome.matched;
      }
    }

    return false;
  }

  /**
   * Generate escalation plan
   */
  generateEscalationPlan(currentPlan, allAvailableDonors) {
    const escalationConfig = currentPlan.escalationPlan;

    // Create new broadcast step with expanded parameters
    const escalationStep = {
      stepNumber: currentPlan.steps.length + 1,
      action: 'broadcast',
      targetDonors: allAvailableDonors.map(d => d._id || d.donor_id),
      scheduledTime: new Date(),
      timeout: 20 * 60 * 1000,
      fallbackAction: 'admin_alert',
      status: 'pending',
      metadata: {
        radiusKm: escalationConfig.expandRadiusKm,
        escalated: true
      }
    };

    currentPlan.steps.push(escalationStep);
    currentPlan.escalationPlan.enabled = false; // Don't escalate again

    return currentPlan;
  }
}

module.exports = StrategyPlanner;

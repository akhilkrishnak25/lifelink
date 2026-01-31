const axios = require('axios');
const AgentState = require('../../models/AgentState');
const Observer = require('./observer');
const StrategyPlanner = require('./strategy.planner');
const ActionExecutor = require('./action.executor');
const LearningService = require('./learning.service');

/**
 * Agent Controller
 * Main orchestrator for the Agentic AI Matching System
 * Implements the complete Observe → Decide → Plan → Act → Learn loop
 */

class AgentController {
  constructor(io) {
    this.io = io; // Socket.IO instance
    this.mlApiUrl = process.env.ML_API_URL || 'http://localhost:5001';
    
    // Initialize all subsystems
    this.observer = new Observer();
    this.strategyPlanner = new StrategyPlanner();
    this.actionExecutor = new ActionExecutor(io);
    this.learningService = new LearningService();
    
    this.agentVersion = '1.0.0';
  }

  /**
   * Main entry point: Run the complete agentic loop for a new blood request
   */
  async processBloodRequest(requestData) {
    console.log(`\n🤖 ===== AGENTIC AI PROCESSING REQUEST ${requestData._id} =====`);
    
    let agentState;
    const startTime = Date.now();

    try {
      // PHASE 1: OBSERVE
      console.log('\n👁️  PHASE 1: OBSERVE - Collecting system state...');
      const observation = await this.observer.collectSystemState(requestData);
      const donorData = await this.observer.getDonorDataForScoring(requestData);
      
      console.log(`   ✓ Found ${donorData.length} potential donors`);
      console.log(`   ✓ Urgency: ${observation.urgency}`);
      console.log(`   ✓ Time of day: ${observation.timeOfDay}`);
      console.log(`   ✓ Weekend: ${observation.isWeekend}`);

      // PHASE 2: DECIDE
      console.log('\n🧠 PHASE 2: DECIDE - AI scoring and strategy selection...');
      const decision = await this._makeDecision(donorData, requestData);
      
      console.log(`   ✓ Scored ${decision.rankedDonors.length} donors`);
      console.log(`   ✓ Top score: ${decision.rankedDonors[0]?.score || 'N/A'}`);
      console.log(`   ✓ Strategy: ${decision.strategyType}`);
      console.log(`   ✓ Reasoning: ${decision.mlRecommendation.reasoning}`);

      // PHASE 3: PLAN
      console.log('\n📋 PHASE 3: PLAN - Creating execution strategy...');
      const plan = await this.strategyPlanner.generatePlan(
        decision.strategyType,
        decision.rankedDonors,
        {
          urgency: requestData.urgency,
          bloodGroup: requestData.bloodGroup,
          unitsRequired: requestData.unitsRequired
        }
      );
      
      console.log(`   ✓ Generated ${plan.steps.length} execution steps`);
      console.log(`   ✓ Response window: ${plan.responseWindow} minutes`);
      console.log(`   ✓ Escalation: ${plan.escalationPlan.enabled ? 'Enabled' : 'Disabled'}`);

      // Create AgentState record
      const processingTime = Date.now() - startTime;
      
      agentState = await AgentState.create({
        requestId: requestData._id,
        observation,
        decision: {
          ...decision,
          decisionTimestamp: new Date(),
          processingTimeMs: processingTime
        },
        plan,
        execution: {
          actions: [],
          notificationsSent: 0,
          chatSessionsOpened: 0,
          donorsContacted: [],
          currentStep: 0,
          status: 'initialized'
        },
        learning: {
          donorResponses: [],
          finalOutcome: {
            matched: false
          },
          performanceMetrics: {},
          improvements: [],
          usedForTraining: false
        },
        safetyChecks: {
          adminOverride: false,
          medicalEligibilityVerified: true,
          cooldownRespected: true,
          duplicateRequestCheck: true
        },
        agentVersion: this.agentVersion,
        loopIterations: 1
      });

      console.log(`   ✓ Agent state created: ${agentState._id}`);

      // PHASE 4: ACT
      console.log('\n⚡ PHASE 4: ACT - Executing plan...');
      await this._executePlan(agentState, requestData);

      const processingTimeTotal = Date.now() - startTime;
      console.log(`\n✅ Agent processing complete in ${processingTimeTotal}ms`);
      console.log(`   Status: ${agentState.execution.status}`);
      console.log(`   Donors contacted: ${agentState.execution.donorsContacted.length}`);
      console.log(`   Actions executed: ${agentState.execution.actions.length}`);
      console.log(`🤖 ===== END OF AGENT PROCESSING =====\n`);

      return {
        success: true,
        agentStateId: agentState._id,
        processingTimeMs: processingTimeTotal,
        donorsContacted: agentState.execution.donorsContacted.length,
        strategy: decision.strategyType
      };

    } catch (error) {
      console.error('❌ Agent processing error:', error);
      
      // Fallback to rule-based matching
      console.log('🔄 Falling back to rule-based matching...');
      return {
        success: false,
        error: error.message,
        fallback: 'rule_based'
      };
    }
  }

  /**
   * DECIDE: Call ML service for scoring and strategy recommendation
   */
  async _makeDecision(donorData, requestContext) {
    // Fallback if ML service unavailable
    if (donorData.length === 0) {
      return {
        rankedDonors: [],
        strategyType: 'broadcast',
        mlRecommendation: {
          suggestedStrategy: 'broadcast',
          confidence: 0.5,
          topDonorCount: 0,
          reasoning: 'No donors available - will broadcast when donors become available'
        }
      };
    }

    try {
      // Score donors via ML service
      const scoringResponse = await axios.post(`${this.mlApiUrl}/score-donors`, {
        donors: donorData,
        request_context: {
          blood_group: requestContext.bloodGroup,
          urgency: requestContext.urgency,
          location: requestContext.location,
          units_required: requestContext.unitsRequired
        }
      }, { timeout: 5000 });

      const scoredDonors = scoringResponse.data.scored_donors || [];

      // Convert ML format to our format
      const rankedDonors = scoredDonors.map(donor => ({
        donorId: donor.donor_id,
        score: donor.total_score,
        confidence: donor.confidence,
        distance: donorData.find(d => d.donor_id === donor.donor_id)?.distance || 0,
        reliabilityScore: donorData.find(d => d.donor_id === donor.donor_id)?.reliability_score || 50,
        responseTimePrediction: donor.predictions.response_time_minutes,
        successProbability: donor.predictions.success_probability,
        reason: donor.reason
      }));

      // Get strategy recommendation
      const strategyResponse = await axios.post(`${this.mlApiUrl}/recommend-strategy`, {
        scored_donors: scoredDonors,
        request_context: {
          urgency: requestContext.urgency,
          blood_group: requestContext.bloodGroup,
          units_required: requestContext.unitsRequired
        }
      }, { timeout: 5000 });

      const strategy = strategyResponse.data.strategy;

      return {
        rankedDonors,
        strategyType: strategy.type,
        mlRecommendation: {
          suggestedStrategy: strategy.type,
          confidence: strategy.confidence,
          topDonorCount: strategy.top_donor_count || rankedDonors.length,
          reasoning: strategy.reasoning
        }
      };

    } catch (error) {
      console.error('ML service error, using rule-based fallback:', error.message);
      
      // Rule-based fallback
      return this._ruleBasedDecision(donorData, requestContext);
    }
  }

  /**
   * Rule-based fallback decision when ML service is unavailable
   */
  _ruleBasedDecision(donorData, requestContext) {
    // Simple scoring: distance + eligibility
    const scored = donorData.map(donor => {
      let score = 100 - (donor.distance * 2); // Penalize distance
      if (donor.can_donate) score += 20;
      if (donor.is_available) score += 10;
      if (donor.blood_group === requestContext.bloodGroup) score += 15;
      
      return {
        donorId: donor.donor_id,
        score: Math.max(0, score),
        confidence: 0.6,
        distance: donor.distance,
        reliabilityScore: donor.reliability_score,
        responseTimePrediction: 20,
        successProbability: 0.5,
        reason: 'Rule-based scoring (ML unavailable)'
      };
    });

    scored.sort((a, b) => b.score - a.score);

    // Simple strategy: targeted for normal, broadcast for urgent/critical
    const strategyType = requestContext.urgency === 'normal' ? 'targeted' : 'broadcast';

    return {
      rankedDonors: scored,
      strategyType,
      mlRecommendation: {
        suggestedStrategy: strategyType,
        confidence: 0.6,
        topDonorCount: Math.min(5, scored.length),
        reasoning: 'Rule-based fallback strategy (ML service unavailable)'
      }
    };
  }

  /**
   * ACT: Execute the plan step by step
   */
  async _executePlan(agentState, requestData) {
    agentState.execution.status = 'executing';
    await agentState.save();

    for (const step of agentState.plan.steps) {
      if (step.status !== 'pending') continue;

      console.log(`   → Executing step ${step.stepNumber}: ${step.action}`);
      
      // Execute action
      const executionRecord = await this.actionExecutor.executeAction(step, agentState, requestData);
      
      // Record execution
      agentState.execution.actions.push(executionRecord);
      
      if (executionRecord.success) {
        agentState.execution.currentStep = step.stepNumber;
        
        // Track contacted donors
        if (step.targetDonors && step.targetDonors.length > 0) {
          const newDonors = step.targetDonors.filter(
            d => !agentState.execution.donorsContacted.includes(d)
          );
          agentState.execution.donorsContacted.push(...newDonors);
        }
        
        if (step.action === 'notify_donors' || step.action === 'broadcast') {
          agentState.execution.notificationsSent += step.targetDonors.length;
        }
        
        if (step.action === 'open_chat') {
          agentState.execution.chatSessionsOpened += step.targetDonors.length;
        }
        
        console.log(`      ✓ Step ${step.stepNumber} completed`);
      } else {
        console.log(`      ✗ Step ${step.stepNumber} failed: ${executionRecord.errorMessage}`);
      }

      await agentState.save();

      // Add small delay between steps
      if (step.stepNumber < agentState.plan.steps.length) {
        await this._sleep(1000); // 1 second delay
      }
    }

    agentState.execution.status = 'awaiting_response';
    await agentState.save();
  }

  /**
   * Handle donor response (called when donor accepts/rejects request)
   */
  async handleDonorResponse(requestId, donorId, accepted, rejectionReason = null) {
    const agentState = await AgentState.findOne({ requestId });
    
    if (!agentState) {
      console.log('⚠️  No agent state found for this request');
      return null;
    }

    // LEARN: Record the response
    await this.learningService.recordDonorResponse(
      agentState._id,
      donorId,
      accepted,
      rejectionReason
    );

    console.log(`📚 Donor response recorded: ${accepted ? 'Accepted' : 'Rejected'}`);

    return agentState;
  }

  /**
   * Record final outcome (called when donation is completed or request fulfilled)
   */
  async recordFinalOutcome(requestId, outcomeData) {
    const agentState = await AgentState.findOne({ requestId });
    
    if (!agentState) {
      console.log('⚠️  No agent state found for this request');
      return null;
    }

    // LEARN: Record final outcome and calculate metrics
    const learning = await this.learningService.recordFinalOutcome(agentState._id, outcomeData);

    console.log(`✅ Final outcome recorded for request ${requestId}`);
    console.log(`   Match: ${outcomeData.matched}`);
    console.log(`   Performance: ${JSON.stringify(learning.performanceMetrics)}`);

    // Check if we should retrain
    const shouldRetrain = await this.learningService.shouldRetrainModel();
    if (shouldRetrain) {
      console.log('💡 Model retraining recommended based on recent feedback');
    }

    return learning;
  }

  /**
   * Re-evaluate and escalate if needed (called periodically or on trigger)
   */
  async checkAndEscalate(requestId) {
    const agentState = await AgentState.findOne({ requestId }).populate('requestId');
    
    if (!agentState) {
      return { escalated: false, reason: 'Agent state not found' };
    }

    // Check if should escalate
    const shouldEscalate = this.strategyPlanner.shouldEscalate(agentState);
    
    if (shouldEscalate) {
      console.log(`⚠️  Escalation triggered for request ${requestId}`);
      
      // Get more donors
      const requestData = agentState.requestId;
      const additionalDonors = await this.observer.getDonorDataForScoring(requestData, 50); // Expand radius
      
      // Generate escalation plan
      const updatedPlan = this.strategyPlanner.generateEscalationPlan(
        agentState.plan,
        additionalDonors
      );
      
      agentState.plan = updatedPlan;
      agentState.loopIterations += 1;
      await agentState.save();
      
      // Execute escalation steps
      const newSteps = updatedPlan.steps.filter(s => s.metadata?.escalated);
      for (const step of newSteps) {
        await this.actionExecutor.executeAction(step, agentState, requestData);
      }
      
      return { escalated: true, newDonorsContacted: additionalDonors.length };
    }

    return { escalated: false, reason: 'Escalation conditions not met' };
  }

  /**
   * Get system insights for admin dashboard
   */
  async getSystemInsights(days = 7) {
    return await this.learningService.getSystemInsights(days);
  }

  /**
   * Get detailed agent state for a request (admin visibility)
   */
  async getAgentStateForRequest(requestId) {
    const agentState = await AgentState.findOne({ requestId })
      .populate('decision.rankedDonors.donorId', 'bloodGroup city')
      .populate('learning.donorResponses.donorId', 'bloodGroup city')
      .populate('learning.finalOutcome.matchedDonorId', 'bloodGroup city');

    return agentState;
  }

  /**
   * Helper: Sleep for delay
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = AgentController;

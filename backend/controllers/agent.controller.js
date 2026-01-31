const AgentController = require('../services/agent/agent.controller');
const AgentState = require('../models/AgentState');

/**
 * @desc    Get AI system insights (last 7 days)
 * @route   GET /api/agent/insights
 * @access  Admin only
 */
exports.getAgentInsights = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const agentController = new AgentController(req.app.get('io'));
    
    const insights = await agentController.getSystemInsights(days);

    res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching agent insights'
    });
  }
};

/**
 * @desc    Get agent state for specific request
 * @route   GET /api/agent/request/:requestId/state
 * @access  Admin only
 */
exports.getRequestAgentState = async (req, res) => {
  try {
    const agentController = new AgentController(req.app.get('io'));
    const agentState = await agentController.getAgentStateForRequest(req.params.requestId);

    if (!agentState) {
      return res.status(404).json({
        success: false,
        message: 'No agent state found for this request'
      });
    }

    res.json({
      success: true,
      data: agentState
    });
  } catch (error) {
    console.error('Get agent state error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching agent state'
    });
  }
};

/**
 * @desc    Get all agent states (paginated)
 * @route   GET /api/agent/states
 * @access  Admin only
 */
exports.getAllAgentStates = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const states = await AgentState.find()
      .populate('requestId', 'bloodGroup urgency hospitalName status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await AgentState.countDocuments();

    res.json({
      success: true,
      data: states,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get agent states error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching agent states'
    });
  }
};

/**
 * @desc    Manually trigger escalation for a request
 * @route   POST /api/agent/request/:requestId/escalate
 * @access  Admin only
 */
exports.triggerEscalation = async (req, res) => {
  try {
    const agentController = new AgentController(req.app.get('io'));
    const result = await agentController.checkAndEscalate(req.params.requestId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Trigger escalation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error triggering escalation'
    });
  }
};

/**
 * @desc    Get overall system performance metrics
 * @route   GET /api/agent/performance
 * @access  Admin only
 */
exports.getSystemPerformance = async (req, res) => {
  try {
    const timeRange = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeRange);

    // Aggregate performance data
    const states = await AgentState.find({
      createdAt: { $gte: startDate }
    });

    if (states.length === 0) {
      return res.json({
        success: true,
        data: {
          message: 'No data available for the specified time range',
          dataPoints: 0
        }
      });
    }

    // Calculate aggregated metrics
    const totalRequests = states.length;
    const matchedRequests = states.filter(s => s.learning?.finalOutcome?.matched).length;
    const overallMatchRate = (matchedRequests / totalRequests) * 100;

    // Strategy breakdown
    const strategyStats = {
      targeted: { count: 0, matched: 0, avgTime: 0 },
      broadcast: { count: 0, matched: 0, avgTime: 0 },
      escalation: { count: 0, matched: 0, avgTime: 0 },
      hybrid: { count: 0, matched: 0, avgTime: 0 }
    };

    states.forEach(state => {
      const strategy = state.decision?.strategyType;
      if (strategy && strategyStats[strategy]) {
        strategyStats[strategy].count++;
        if (state.learning?.finalOutcome?.matched) {
          strategyStats[strategy].matched++;
          strategyStats[strategy].avgTime += state.learning.finalOutcome.totalTimeMinutes || 0;
        }
      }
    });

    // Calculate averages
    Object.keys(strategyStats).forEach(strategy => {
      const stats = strategyStats[strategy];
      if (stats.matched > 0) {
        stats.avgTime = parseFloat((stats.avgTime / stats.matched).toFixed(2));
      }
      stats.matchRate = stats.count > 0 
        ? parseFloat(((stats.matched / stats.count) * 100).toFixed(2)) 
        : 0;
    });

    // Urgency breakdown
    const urgencyStats = {
      critical: { count: 0, matched: 0, avgTime: 0 },
      urgent: { count: 0, matched: 0, avgTime: 0 },
      normal: { count: 0, matched: 0, avgTime: 0 }
    };

    states.forEach(state => {
      const urgency = state.observation?.urgency;
      if (urgency && urgencyStats[urgency]) {
        urgencyStats[urgency].count++;
        if (state.learning?.finalOutcome?.matched) {
          urgencyStats[urgency].matched++;
          urgencyStats[urgency].avgTime += state.learning.finalOutcome.totalTimeMinutes || 0;
        }
      }
    });

    Object.keys(urgencyStats).forEach(urgency => {
      const stats = urgencyStats[urgency];
      if (stats.matched > 0) {
        stats.avgTime = parseFloat((stats.avgTime / stats.matched).toFixed(2));
      }
      stats.matchRate = stats.count > 0 
        ? parseFloat(((stats.matched / stats.count) * 100).toFixed(2)) 
        : 0;
    });

    // Average metrics across all requests
    let totalResponseRate = 0;
    let totalSuccessRate = 0;
    let totalAvgResponseTime = 0;
    let totalStrategyEffectiveness = 0;
    let totalPredictionAccuracy = 0;
    let metricsCount = 0;

    states.forEach(state => {
      if (state.learning?.performanceMetrics) {
        const metrics = state.learning.performanceMetrics;
        totalResponseRate += metrics.responseRate || 0;
        totalSuccessRate += metrics.successRate || 0;
        totalAvgResponseTime += metrics.avgResponseTime || 0;
        totalStrategyEffectiveness += metrics.strategyEffectiveness || 0;
        totalPredictionAccuracy += metrics.predictionAccuracy || 0;
        metricsCount++;
      }
    });

    const averageMetrics = metricsCount > 0 ? {
      responseRate: parseFloat((totalResponseRate / metricsCount).toFixed(2)),
      successRate: parseFloat((totalSuccessRate / metricsCount).toFixed(2)),
      avgResponseTime: parseFloat((totalAvgResponseTime / metricsCount).toFixed(2)),
      strategyEffectiveness: parseFloat((totalStrategyEffectiveness / metricsCount).toFixed(2)),
      predictionAccuracy: parseFloat((totalPredictionAccuracy / metricsCount).toFixed(2))
    } : null;

    res.json({
      success: true,
      data: {
        timeRangeDays: timeRange,
        totalRequests,
        matchedRequests,
        overallMatchRate: parseFloat(overallMatchRate.toFixed(2)),
        averageMetrics,
        strategyPerformance: strategyStats,
        urgencyPerformance: urgencyStats
      }
    });

  } catch (error) {
    console.error('Get system performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching system performance'
    });
  }
};

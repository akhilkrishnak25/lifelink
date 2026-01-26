const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Donor = require('../models/Donor');
const BloodRequest = require('../models/BloodRequest');

/**
 * @route   GET /api/public/stats
 * @desc    Get public system statistics (no auth)
 * @access  Public
 */
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalDonors, pendingRequests, completedRequests, citiesCount] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Donor.countDocuments({ isAvailable: true }),
      BloodRequest.countDocuments({ status: 'pending' }),
      BloodRequest.countDocuments({ status: 'completed' }),
      Donor.distinct('city').then(cities => cities.length)
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        activeDonors: totalDonors,
        pendingRequests,
        completedDonations: completedRequests,
        citiesServed: citiesCount || 1
      }
    });
  } catch (error) {
    console.error('Public stats error:', error);
    res.status(500).json({ success: false, message: 'Error fetching stats' });
  }
});

/**
 * @route   GET /api/public/health
 * @desc    Extended health check including ML service
 * @access  Public
 */
router.get('/health', async (req, res) => {
  let mlReachable = false;
  try {
    const mlUrl = process.env.ML_API_URL || 'http://localhost:5001';
    const axios = require('axios');
    const resp = await axios.get(`${mlUrl}/health`, { timeout: 2000 });
    mlReachable = resp.status === 200;
  } catch {
    mlReachable = false;
  }

  res.json({
    success: true,
    backend: true,
    ml: mlReachable,
    timestamp: new Date().toISOString()
  });
});

/**
 * @route   GET /api/public/verify
 * @desc    Verify a blood request by ID (public trust check)
 * @access  Public
 */
router.get('/verify', async (req, res) => {
  try {
    const { requestId } = req.query;
    if (!requestId) {
      return res.status(400).json({ success: false, message: 'requestId query required' });
    }

    const request = await BloodRequest.findById(requestId)
      .select('bloodGroup urgency status createdAt hospitalName city state isFake mlScore');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    res.json({
      success: true,
      data: {
        id: request._id,
        bloodGroup: request.bloodGroup,
        urgency: request.urgency,
        status: request.status,
        hospital: request.hospitalName,
        location: `${request.city}, ${request.state}`,
        createdAt: request.createdAt,
        aiRiskFlag: request.isFake || false,
        aiScore: request.mlScore ?? null
      }
    });
  } catch (error) {
    console.error('Public verify error:', error);
    res.status(500).json({ success: false, message: 'Error verifying request' });
  }
});

/**
 * @route   GET /api/public/ai-metrics
 * @desc    Public AI transparency metrics
 * @access  Public
 */
router.get('/ai-metrics', async (req, res) => {
  try {
    const FakeRequestAnalysis = require('../models/FakeRequestAnalysis');

    const total = await FakeRequestAnalysis.countDocuments();
    const fakeCount = await FakeRequestAnalysis.countDocuments({ prediction: 'fake' });
    const genuineCount = total - fakeCount;

    // Average confidence
    const confidenceAgg = await FakeRequestAnalysis.aggregate([
      { $group: { _id: null, avgConfidence: { $avg: '$confidence' } } }
    ]);

    res.json({
      success: true,
      data: {
        totalAnalyzed: total,
        flaggedFake: fakeCount,
        genuine: genuineCount,
        avgConfidence: confidenceAgg[0]?.avgConfidence?.toFixed(2) ?? null,
        modelVersion: '1.0',
        features: ['request_frequency', 'hour_of_day', 'location_variance', 'urgency_pattern', 'units_requested', 'description_length', 'historical_completion_rate', 'account_age_days']
      }
    });
  } catch (error) {
    console.error('AI metrics error:', error);
    res.status(500).json({ success: false, message: 'Error fetching AI metrics' });
  }
});

module.exports = router;

const BloodRequest = require('../models/BloodRequest');
const FakeRequestAnalysis = require('../models/FakeRequestAnalysis');
const DonationHistory = require('../models/DonationHistory');
const Donor = require('../models/Donor');
const mlService = require('../services/ml.service');
const geoService = require('../services/geo.service');
const AgentController = require('../services/agent/agent.controller');

/**
 * @desc    Create new blood request
 * @route   POST /api/receiver/request
 * @access  Private (Receiver only)
 */
exports.createRequest = async (req, res) => {
  try {
    const {
      bloodGroup, urgency, hospitalName, longitude, latitude,
      address, city, state, pincode, contactNumber, unitsRequired,
      patientName, description
    } = req.body;

    // Create the blood request
    const request = await BloodRequest.create({
      receiverId: req.user.id,
      bloodGroup,
      urgency,
      hospitalName,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      address,
      city,
      state,
      pincode,
      contactNumber,
      unitsRequired,
      patientName,
      description,
      status: 'pending'
    });

    // Run ML analysis asynchronously (don't wait for it)
    analyzeFakeRequest(request._id, req.user.id, { longitude, latitude })
      .catch(err => console.error('ML Analysis error:', err));

    // 🤖 AGENTIC AI: Process request through intelligent matching system
    // This runs in the background and doesn't block the response
    processWithAgentSystem(request, req.app.get('io'))
      .catch(err => console.error('Agent system error:', err));

    res.status(201).json({
      success: true,
      message: 'Blood request created successfully. Our AI is finding the best donors for you.',
      data: request,
      aiProcessing: true
    });
  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating blood request'
    });
  }
};

/**
 * ML Analysis helper function
 */
async function analyzeFakeRequest(requestId, userId, location) {
  try {
    // Extract features
    const features = await mlService.extractFeatures(userId, location);

    // Call ML API
    const mlResult = await mlService.analyzeFakeRequest(features);

    // Save analysis
    await FakeRequestAnalysis.create({
      requestId,
      userId,
      features,
      mlScore: mlResult.score,
      prediction: mlResult.prediction === 'fake' ? 'fake' : 'genuine',
      confidence: mlResult.confidence
    });

    // Update request if fake
    if (mlResult.prediction === 'fake') {
      await BloodRequest.findByIdAndUpdate(requestId, {
        isFake: true,
        mlScore: mlResult.score,
        mlAnalysisDate: new Date()
      });
    }
  } catch (error) {
    console.error('Async ML analysis error:', error);
  }
}

/**
 * @desc    Get all requests by receiver
 * @route   GET /api/receiver/my-requests
 * @access  Private (Receiver only)
 */
exports.getMyRequests = async (req, res) => {
  try {
    const requests = await BloodRequest.find({ receiverId: req.user.id })
      .populate({
        path: 'interestedDonors.donorId',
        populate: {
          path: 'userId',
          select: 'name phone email'
        }
      })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching requests'
    });
  }
};

/**
 * @desc    Get single request details
 * @route   GET /api/receiver/request/:id
 * @access  Private (Receiver only)
 */
exports.getRequest = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id)
      .populate('receiverId', 'name phone email')
      .populate({
        path: 'interestedDonors.donorId',
        populate: {
          path: 'userId',
          select: 'name phone email'
        }
      });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Blood request not found'
      });
    }

    // Check if user is the owner
    if (request.receiverId._id.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this request'
      });
    }

    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error('Get request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching request'
    });
  }
};

/**
 * @desc    Get interested donors for a request
 * @route   GET /api/receiver/request/:id/donors
 * @access  Private (Receiver only)
 */
exports.getInterestedDonors = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id)
      .populate({
        path: 'interestedDonors.donorId',
        populate: {
          path: 'userId',
          select: 'name phone email'
        }
      });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Blood request not found'
      });
    }

    if (request.receiverId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    res.json({
      success: true,
      count: request.interestedDonors.length,
      data: request.interestedDonors
    });
  } catch (error) {
    console.error('Get interested donors error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching interested donors'
    });
  }
};

/**
 * @desc    Accept a donor for blood request
 * @route   PUT /api/receiver/request/:id/accept-donor/:donorId
 * @access  Private (Receiver only)
 */
exports.acceptDonor = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Blood request not found'
      });
    }

    if (request.receiverId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Update request status
    request.status = 'approved';
    request.acceptedDonorId = req.params.donorId;
    await request.save();

    res.json({
      success: true,
      message: 'Donor accepted successfully',
      data: request
    });
  } catch (error) {
    console.error('Accept donor error:', error);
    res.status(500).json({
      success: false,
      message: 'Error accepting donor'
    });
  }
};

/**
 * @desc    Mark request as completed
 * @route   PUT /api/receiver/request/:id/complete
 * @access  Private (Receiver only)
 */
exports.completeRequest = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Blood request not found'
      });
    }

    if (request.receiverId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (!request.acceptedDonorId) {
      return res.status(400).json({
        success: false,
        message: 'No donor has been accepted yet'
      });
    }

    // Mark request as completed
    request.status = 'completed';
    request.completedAt = new Date();
    await request.save();

    // Create donation history record
    await DonationHistory.create({
      donorId: request.acceptedDonorId,
      requestId: request._id,
      receiverId: req.user.id,
      bloodGroup: request.bloodGroup,
      hospitalName: request.hospitalName,
      location: request.location,
      unitsGiven: request.unitsRequired,
      status: 'completed'
    });

    // Update donor's last donation date and count
    const donor = await Donor.findById(request.acceptedDonorId);
    if (donor) {
      donor.lastDonationDate = new Date();
      donor.totalDonations += 1;
      await donor.save();
    }

    res.json({
      success: true,
      message: 'Request marked as completed',
      data: request
    });
  } catch (error) {
    console.error('Complete request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing request'
    });
  }
};

/**
 * @desc    Cancel blood request
 * @route   PUT /api/receiver/request/:id/cancel
 * @access  Private (Receiver only)
 */
exports.cancelRequest = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Blood request not found'
      });
    }

    if (request.receiverId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    request.status = 'cancelled';
    await request.save();

    res.json({
      success: true,
      message: 'Request cancelled successfully',
      data: request
    });
  } catch (error) {
    console.error('Cancel request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling request'
    });
  }
};

/**
 * @desc    Get receiver statistics
 * @route   GET /api/receiver/stats
 * @access  Private (Receiver only)
 */
exports.getStats = async (req, res) => {
  try {
    const totalRequests = await BloodRequest.countDocuments({ receiverId: req.user.id });
    const pendingRequests = await BloodRequest.countDocuments({ 
      receiverId: req.user.id, 
      status: 'pending' 
    });
    const completedRequests = await BloodRequest.countDocuments({ 
      receiverId: req.user.id, 
      status: 'completed' 
    });

    const stats = {
      totalRequests,
      pendingRequests,
      completedRequests,
      successRate: totalRequests > 0 ? ((completedRequests / totalRequests) * 100).toFixed(2) : 0
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get receiver stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stats'
    });
  }
};

/**
 * 🤖 AGENTIC AI: Process blood request through intelligent system
 * This function runs the complete Observe-Decide-Plan-Act-Learn loop
 */
async function processWithAgentSystem(requestData, io) {
  try {
    // Wait a moment to ensure request is fully saved
    await new Promise(resolve => setTimeout(resolve, 1000));

    const agentController = new AgentController(io);
    const result = await agentController.processBloodRequest(requestData);

    console.log('✅ Agent system processing result:', result);

    // Notify receiver that AI processing is complete
    if (io && result.success) {
      io.to(requestData.receiverId.toString()).emit('ai_processing_complete', {
        requestId: requestData._id,
        donorsContacted: result.donorsContacted,
        strategy: result.strategy,
        processingTime: result.processingTimeMs
      });
    }

  } catch (error) {
    console.error('Agent system processing error:', error);
    // Don't throw - let the system continue with manual matching
  }
}

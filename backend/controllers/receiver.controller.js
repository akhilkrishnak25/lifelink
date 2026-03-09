const BloodRequest = require('../models/BloodRequest');
const FakeRequestAnalysis = require('../models/FakeRequestAnalysis');
const DonationHistory = require('../models/DonationHistory');
const Donor = require('../models/Donor');
const mlService = require('../services/ml.service');
const geoService = require('../services/geo.service');
const AgentController = require('../services/agent/agent.controller');
const locationTrackingService = require('../services/locationTracking.service');
const emailService = require('../services/email.service');
const User = require('../models/User');
const certificateService = require('../services/certificate.service');
const gamificationService = require('../services/gamification.service');
const BlockchainService = require('../services/blockchain/blockchain.service');
const blockchainService = new BlockchainService();

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

    // 🌍 STEP 1: Track location and analyze pattern
    console.log('🌍 Tracking user location and analyzing patterns...');
    const { tracking, analysis } = await locationTrackingService.trackRequest(
      req.user.id,
      null, // requestId will be set after creation
      req
    );

    let suspicionReasons = [];
    let isSuspicious = false;
    let suspicionSeverity = 0;

    // Check location-based suspicion
    if (analysis.isSuspicious) {
      console.log(`⚠️  Location analysis flagged suspicious activity:`, analysis.flags);
      isSuspicious = true;
      suspicionSeverity = analysis.severity;
      
      suspicionReasons.push(...analysis.flags.map(flag => {
        switch(flag) {
          case 'impossible_travel': return `Impossible travel detected (${analysis.details.distanceFromLastLocation}km in ${analysis.details.timeSinceLastRequest} minutes)`;
          case 'location_jump': return `Multiple locations in short time (${analysis.details.uniqueLocations} locations)`;
          case 'rapid_requests': return `Too many requests (${analysis.details.recentRequestCount} in 30 minutes)`;
          case 'different_ip': return `Different IP address in short time`;
          default: return flag;
        }
      }));
    }

    // Determine initial status based on location analysis
    let initialStatus = 'pending';
    let needsReview = false;

    // 🔧 TESTING: Temporarily set higher threshold to allow AI processing
    if (suspicionSeverity >= 95) {  // Changed from 70 to 95 for testing
      // High severity - flag for manual review
      initialStatus = 'pending';
      needsReview = true;
      console.log(`🚩 High severity (${suspicionSeverity}%) - flagging for admin review`);
      
      // 📧 Send email alert to admins asynchronously
      sendAdminAlert(request, analysis).catch(err => 
        console.error('Error sending admin alert email:', err)
      );
    }

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
      status: initialStatus
    });

    // Update tracking with request ID
    tracking.requestId = request._id;
    await tracking.save();

    // 🤖 STEP 2: Run ML analysis asynchronously (don't wait for it)
    analyzeFakeRequest(request._id, req.user.id, { longitude, latitude }, analysis)
      .catch(err => console.error('ML Analysis error:', err));

    // 🤖 STEP 3: AGENTIC AI - Process request through intelligent matching system
    // Only if not flagged as high severity
    if (!needsReview) {
      console.log(`🤖 Triggering Agentic AI for request ${request._id}, urgency: ${request.urgency}`);
      processWithAgentSystem(request, req.app.get('io'))
        .catch(err => {
          console.error('❌ Agent system error:', err);
          console.error('Error stack:', err.stack);
        });
    } else {
      console.log(`⚠️  Request ${request._id} flagged for review, skipping AI processing`);
    }

    // Prepare response based on suspicion level
    if (suspicionSeverity >= 70) {
      return res.status(200).json({
        success: true,
        message: 'Request submitted but flagged for manual review due to unusual activity patterns.',
        data: request,
        warning: 'Your request will be reviewed by our admin team before processing.',
        reasons: suspicionReasons,
        severity: suspicionSeverity,
        needsReview: true
      });
    }

    if (suspicionSeverity >= 30) {
      return res.status(200).json({
        success: true,
        message: 'Blood request created successfully. Our AI is finding the best donors for you.',
        data: request,
        aiProcessing: true,
        warning: 'We detected some unusual patterns. Your request may undergo additional verification.',
        reasons: suspicionReasons,
        severity: suspicionSeverity
      });
    }

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

    // Get donor details for certificate
    const donor = await Donor.findById(request.acceptedDonorId).populate('userId', 'name email');
    
    if (!donor || !donor.userId) {
      return res.status(404).json({
        success: false,
        message: 'Donor information not found'
      });
    }

    // Generate certificate number
    const certificateNumber = certificateService.generateCertificateNumber(
      donor._id,
      new Date()
    );

    // Create donation history record
    const donationHistory = await DonationHistory.create({
      donorId: request.acceptedDonorId,
      requestId: request._id,
      receiverId: req.user.id,
      bloodGroup: request.bloodGroup,
      hospitalName: request.hospitalName,
      location: request.location,
      unitsGiven: request.unitsRequired,
      status: 'completed',
      certificateNumber
    });

    // Generate certificate asynchronously
    try {
      console.log('🎓 Generating donation certificate...');
      
      const certificatePath = await certificateService.generateCertificate({
        donorName: donor.userId.name,
        donorId: donor._id,
        bloodGroup: request.bloodGroup,
        unitsGiven: request.unitsRequired,
        hospitalName: request.hospitalName,
        donationDate: new Date(),
        certificateNumber,
        city: request.city || 'N/A'
      });

      // Update donation history with certificate path
      donationHistory.certificatePath = certificatePath;
      donationHistory.certificateGeneratedAt = new Date();
      await donationHistory.save();

      console.log('✅ Certificate generated successfully');

      // Send email with certificate (asynchronously, non-blocking)
      emailService.sendDonationCertificate(donor.userId.email, donor.userId.name, certificatePath)
        .catch(err => console.error('Error sending certificate email:', err));

    } catch (certError) {
      console.error('Certificate generation error:', certError);
      // Don't block the completion, just log the error
    }

    // Update donor's last donation date and count
    if (donor) {
      donor.lastDonationDate = new Date();
      donor.totalDonations += 1;
      await donor.save();
    }

    // 🎮 Update gamification: award points, update stats, unlock achievements
    try {
      console.log('🎮 Updating gamification for donation...');
      await gamificationService.handleDonationComplete(donor.userId._id, {
        donationDate: donationHistory.donationDate || new Date(),
        bloodGroup: donationHistory.bloodGroup,
        unitsGiven: donationHistory.unitsGiven
      });
      console.log('✅ Gamification updated: +100 points awarded');
    } catch (gamError) {
      // Don't block the donation completion if gamification fails
      console.error('⚠️ Gamification update error:', gamError.message);
    }

    // 🔗 Record donation on blockchain for tamper-proof verification
    let blockchainRecord = null;
    try {
      console.log('🔗 Recording donation on blockchain...');
      
      blockchainRecord = await blockchainService.createDonationRecord({
        userId: donor.userId._id,
        donationId: donationHistory._id,
        payload: {
          donorId: donor._id.toString(),
          donorName: donor.userId.name,
          bloodGroup: request.bloodGroup,
          unitsGiven: request.unitsRequired,
          hospitalName: request.hospitalName,
          location: request.location,
          certificateNumber,
          donationDate: new Date().toISOString(),
          requestId: request._id.toString()
        }
      });
      
      console.log(`✅ Blockchain record created: ${blockchainRecord.transactionHash}`);
      console.log(`   Chain: ${blockchainRecord.chain}`);
      console.log(`   Status: ${blockchainRecord.status}`);
      
    } catch (blockchainError) {
      // Don't block the donation completion if blockchain recording fails
      console.error('⚠️ Blockchain recording error:', blockchainError.message);
    }

    res.json({
      success: true,
      message: 'Request marked as completed. Certificate generated successfully!',
      blockchain: blockchainRecord ? {
        transactionHash: blockchainRecord.transactionHash,
        chain: blockchainRecord.chain,
        status: blockchainRecord.status
      } : null,
      data: request,
      certificate: {
        number: certificateNumber,
        downloadUrl: `/api/donor/certificate/${donationHistory._id}`
      }
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
 * @desc    Get location analytics for receiver's requests
 * @route   GET /api/receiver/location-analytics
 * @access  Private (Receiver only)
 */
exports.getLocationAnalytics = async (req, res) => {
  try {
    const RequestTracking = require('../models/RequestTracking');
    
    // Get location history for this user
    const locationHistory = await locationTrackingService.getUserLocationHistory(req.user.id);
    
    // Get suspicious requests
    const suspiciousRequests = await BloodRequest.find({
      receiverId: req.user.id,
      locationSuspicious: true
    }).select('bloodGroup urgency createdAt locationSeverity locationFlags locationDetails status');

    // Calculate stats
    const totalTracked = locationHistory.length;
    const suspiciousCount = locationHistory.filter(t => t.suspicionFlags && t.suspicionFlags.length > 0).length;
    const uniqueCities = [...new Set(locationHistory.map(t => t.location.city).filter(Boolean))];
    const uniqueIPs = [...new Set(locationHistory.map(t => t.ipAddress).filter(Boolean))];

    res.json({
      success: true,
      data: {
        totalRequests: totalTracked,
        suspiciousRequests: suspiciousCount,
        uniqueCities: uniqueCities.length,
        uniqueIPs: uniqueIPs.length,
        cities: uniqueCities,
        recentLocations: locationHistory.slice(0, 10),
        flaggedRequests: suspiciousRequests
      }
    });
  } catch (error) {
    console.error('Get location analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching location analytics'
    });
  }
};

/**
 * 🤖 AGENTIC AI: Process blood request through intelligent system
 * This function runs the complete Observe-Decide-Plan-Act-Learn loop
 */
async function processWithAgentSystem(requestData, io) {
  try {
    console.log(`\n🚀 ===== STARTING AGENTIC AI PROCESSING =====`);
    console.log(`Request ID: ${requestData._id}`);
    console.log(`Blood Type: ${requestData.bloodGroup}, Urgency: ${requestData.urgency}`);
    console.log(`Location: ${requestData.city || 'N/A'}`);
    
    // Wait a moment to ensure request is fully saved
    await new Promise(resolve => setTimeout(resolve, 1000));

    const agentController = new AgentController(io);
    const result = await agentController.processBloodRequest(requestData);

    console.log('✅ Agent system processing result:', result);
    console.log(`===== AGENTIC AI PROCESSING COMPLETE =====\n`);

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
    console.error('\n❌ ===== AGENT SYSTEM PROCESSING ERROR =====');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Request ID:', requestData._id);
    console.error('===== ERROR END =====\n');
    // Don't throw - let the system continue with manual matching
  }
}

/**
 * 📧 Send admin alert for high-severity requests
 */
async function sendAdminAlert(requestData, locationAnalysis) {
  try {
    // Get all admin emails
    const admins = await User.find({ 
      role: { $in: ['admin', 'super_admin'] },
      isActive: true 
    }).select('email');
    
    const adminEmails = admins.map(admin => admin.email).filter(Boolean);
    
    if (adminEmails.length === 0) {
      console.log('⚠️  No admin emails found for alert notification');
      return;
    }
    
    await emailService.sendHighSeverityAlert(requestData, locationAnalysis, adminEmails);
    console.log(`📧 Alert email sent to ${adminEmails.length} admin(s)`);
  } catch (error) {
    console.error('Error sending admin alert:', error);
    // Don't throw - email failure shouldn't block request
  }
}

const Donor = require('../models/Donor');
const BloodRequest = require('../models/BloodRequest');
const DonationHistory = require('../models/DonationHistory');
const Notification = require('../models/Notification');
const geoService = require('../services/geo.service');
const AgentController = require('../services/agent/agent.controller');
const AgentState = require('../models/AgentState');
const certificateService = require('../services/certificate.service');
const path = require('path');
const fs = require('fs');

async function ensureCertificateFile({ donation, donor, donorName, forceRegenerate = false }) {
  const needsGeneration = forceRegenerate || !donation.certificatePath || !fs.existsSync(donation.certificatePath);

  if (!needsGeneration) {
    return donation.certificatePath;
  }

  const certNumber = donation.certificateNumber || certificateService.generateCertificateNumber(donor._id, donation.donationDate || new Date());

  const generatedPath = await certificateService.generateCertificate({
    donorName,
    donorId: donor._id,
    bloodGroup: donation.bloodGroup,
    unitsGiven: donation.unitsGiven,
    hospitalName: donation.hospitalName,
    donationDate: donation.donationDate || new Date(),
    certificateNumber: certNumber,
    city: 'N/A'
  });

  donation.certificateNumber = certNumber;
  donation.certificatePath = generatedPath;
  donation.certificateGeneratedAt = new Date();
  await donation.save();

  return generatedPath;
}

/**
 * @desc    Get or create donor profile
 * @route   GET /api/donor/profile
 * @access  Private (Donor only)
 */
exports.getProfile = async (req, res) => {
  try {
    const donor = await Donor.findOne({ userId: req.user.id })
      .populate('userId', 'name email phone');

    if (!donor) {
      return res.status(404).json({
        success: false,
        message: 'Donor profile not found'
      });
    }

    res.json({
      success: true,
      data: donor
    });
  } catch (error) {
    console.error('Get donor profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching donor profile'
    });
  }
};

/**
 * @desc    Create or update donor profile
 * @route   POST /api/donor/profile
 * @access  Private (Donor only)
 */
exports.createOrUpdateProfile = async (req, res) => {
  try {
    const { bloodGroup, longitude, latitude, address, city, state, pincode, ageGroup } = req.body;

    let donor = await Donor.findOne({ userId: req.user.id });

    const donorData = {
      userId: req.user.id,
      bloodGroup,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      address,
      city,
      state,
      pincode,
      ageGroup
    };

    if (donor) {
      // Update existing profile
      donor = await Donor.findOneAndUpdate(
        { userId: req.user.id },
        donorData,
        { new: true, runValidators: true }
      );
    } else {
      // Create new profile
      donor = await Donor.create(donorData);
    }

    res.status(201).json({
      success: true,
      message: 'Donor profile saved successfully',
      data: donor
    });
  } catch (error) {
    console.error('Create/Update donor profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error saving donor profile'
    });
  }
};

/**
 * @desc    Toggle donor availability
 * @route   PUT /api/donor/availability
 * @access  Private (Donor only)
 */
exports.toggleAvailability = async (req, res) => {
  try {
    const donor = await Donor.findOne({ userId: req.user.id });

    if (!donor) {
      return res.status(404).json({
        success: false,
        message: 'Donor profile not found'
      });
    }

    donor.isAvailable = !donor.isAvailable;
    await donor.save();

    res.json({
      success: true,
      message: `Availability ${donor.isAvailable ? 'enabled' : 'disabled'}`,
      data: { isAvailable: donor.isAvailable }
    });
  } catch (error) {
    console.error('Toggle availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating availability'
    });
  }
};

/**
 * @desc    Get nearby blood requests
 * @route   GET /api/donor/nearby-requests
 * @access  Private (Donor only)
 */
exports.getNearbyRequests = async (req, res) => {
  try {
    const donor = await Donor.findOne({ userId: req.user.id });

    if (!donor) {
      return res.status(404).json({
        success: false,
        message: 'Donor profile not found. Please complete your profile first.'
      });
    }

    const maxDistance = parseInt(req.query.distance) || 50; // Default 50km

    const requests = await geoService.findNearbyRequests(
      donor.location.coordinates[1], // latitude
      donor.location.coordinates[0], // longitude
      donor.bloodGroup,
      maxDistance,
      req.user.id
    );

    // Add donor's response status and ensure self-created requests are hidden.
    const requestsWithStatus = requests
      .filter(request => {
        const receiverId = request?.receiverId?._id?.toString?.() || request?.receiverId?.toString?.();
        return receiverId !== req.user.id.toString();
      })
      .map(request => {
      const donorResponse = request.interestedDonors?.find(
        d => d.donorId.toString() === donor._id.toString()
      );
      
      return {
        ...request,
        donorStatus: donorResponse ? donorResponse.status : null
      };
      });

    res.json({
      success: true,
      count: requestsWithStatus.length,
      data: requestsWithStatus
    });
  } catch (error) {
    console.error('Get nearby requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching nearby requests'
    });
  }
};

/**
 * @desc    Accept a blood request
 * @route   POST /api/donor/accept-request/:id
 * @access  Private (Donor only)
 */
exports.acceptRequest = async (req, res) => {
  try {
    const donor = await Donor.findOne({ userId: req.user.id });

    if (!donor) {
      return res.status(404).json({
        success: false,
        message: 'Donor profile not found'
      });
    }

    const request = await BloodRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Blood request not found'
      });
    }

    if (!request.isActive()) {
      return res.status(400).json({
        success: false,
        message: 'This request is no longer active'
      });
    }

    if (request.receiverId?.toString() === req.user.id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot accept your own blood request'
      });
    }

    // Check if donor already responded
    const alreadyResponded = request.interestedDonors.some(
      d => d.donorId.toString() === donor._id.toString()
    );

    if (alreadyResponded) {
      return res.status(400).json({
        success: false,
        message: 'You have already responded to this request'
      });
    }

    // Add donor to interested donors list
    request.interestedDonors.push({
      donorId: donor._id,
      status: 'interested'
    });

    await request.save();

    // 🤖 AGENTIC AI: Check if agent state exists, if not trigger AI processing
    try {
      const io = req.app.get('io');
      const agentController = new AgentController(io);
      
      // Check if this request has been analyzed by AI
      const agentState = await AgentState.findOne({ requestId: request._id });
      
      if (!agentState) {
        // No AI analysis exists - trigger full agentic AI processing
        console.log(`🤖 No AI analysis found for request ${request._id}, triggering now...`);
        
        // Populate request data for AI processing
        const populatedRequest = await BloodRequest.findById(request._id);
        
        // Process through agentic AI system asynchronously
        agentController.processBloodRequest(populatedRequest)
          .then(result => {
            console.log(`✅ Agentic AI processing completed for request ${request._id}`);
            
            // Now record the donor response
            return agentController.handleDonorResponse(request._id, donor._id, true);
          })
          .catch(err => console.error('Agentic AI processing error:', err));
      } else {
        // Agent state exists - just record the donor response
        await agentController.handleDonorResponse(request._id, donor._id, true);
      }
    } catch (agentError) {
      console.error('Agent system error:', agentError);
      // Don't block the response
    }

    res.json({
      success: true,
      message: 'Request accepted. The receiver will be notified.',
      data: request
    });
  } catch (error) {
    console.error('Accept request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error accepting request'
    });
  }
};

/**
 * @desc    Get donation history
 * @route   GET /api/donor/history
 * @access  Private (Donor only)
 */
exports.getDonationHistory = async (req, res) => {
  try {
    const donor = await Donor.findOne({ userId: req.user.id });

    if (!donor) {
      return res.status(404).json({
        success: false,
        message: 'Donor profile not found'
      });
    }

    const history = await DonationHistory.find({ donorId: donor._id })
      .populate('receiverId', 'name phone')
      .populate('requestId', 'hospitalName urgency')
      .sort({ donationDate: -1 })
      .limit(50);

    res.json({
      success: true,
      count: history.length,
      totalDonations: donor.totalDonations,
      data: history
    });
  } catch (error) {
    console.error('Get donation history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching donation history'
    });
  }
};

/**
 * @desc    Get AI-matched blood requests for donor
 * @route   GET /api/donor/matched-requests
 * @access  Private (Donor only)
 */
exports.getMatchedRequests = async (req, res) => {
  try {
    const donor = await Donor.findOne({ userId: req.user.id });

    if (!donor) {
      return res.status(404).json({
        success: false,
        message: 'Donor profile not found'
      });
    }

    // Find notifications sent to this donor  by the Agentic AI
    console.log(`[getMatchedRequests] Querying notifications with:`);
    console.log(`   userId: ${req.user.id}`);
    console.log(`   type: 'match'`);
    console.log(`   data.requestId: { $exists: true }`);
    
    const notifications = await Notification.find({
      userId: req.user.id,
      type: 'match',
      'data.requestId': { $exists: true }
    })
    .sort({ createdAt: -1 })
    .limit(20);

    console.log(`[getMatchedRequests] Found ${notifications.length} notifications for user ${req.user.id}`);
    if (notifications.length > 0) {
      console.log(`[getMatchedRequests] First notification:`, {
        id: notifications[0]._id,
        userId: notifications[0].userId,
        requestId: notifications[0].data?.requestId
      });
    }

    // Extract request IDs
    const requestIds = notifications.map(n => n.data.requestId).filter(Boolean);

    console.log(`[getMatchedRequests] Extracted ${requestIds.length} request IDs:`, requestIds);

    if (requestIds.length === 0) {
      return res.json({
        success: true,
        count: 0,
        data: []
      });
    }

    // Fetch the actual blood requests
    const requests = await BloodRequest.find({
      _id: { $in: requestIds },
      receiverId: { $ne: req.user.id },
      status: { $in: ['pending', 'approved'] } //Only active requests
    }).populate('receiverId', 'name phone email');
    
    console.log(`[getMatchedRequests] Found ${requests.length} blood requests matching IDs`);

    // Enrich requests with AI data from notifications
    const enrichedRequests = requests
      .filter(request => {
        const receiverId = request?.receiverId?._id?.toString?.() || request?.receiverId?.toString?.();
        return receiverId !== req.user.id.toString();
      })
      .map(request => {
      const notification = notifications.find(
        n => n.data.requestId.toString() === request._id.toString()
      );

      const requestObj = request.toObject();
      
      return {
        ...requestObj,
        aiMatch: {
          score: notification?.data?.aiScore || null,
          reason: notification?.data?.selectedReason || 'AI matched',
          distance: notification?.data?.distance || 'nearby',
          matchedAt: notification?.createdAt,
          notificationRead: notification?.read || false
        }
      };
      });

    // Sort by AI score (highest first), then by creation date
    enrichedRequests.sort((a, b) => {
      const scoreA = a.aiMatch?.score || 0;
      const scoreB = b.aiMatch?.score || 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json({
      success: true,
      count: enrichedRequests.length,
      data: enrichedRequests
    });
  } catch (error) {
    console.error('Get matched requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching matched requests'
    });
  }
};

/**
 * @desc    Get donor statistics
 * @route   GET /api/donor/stats
 * @access  Private (Donor only)
 */
exports.getStats = async (req, res) => {
  try {
    const donor = await Donor.findOne({ userId: req.user.id });

    if (!donor) {
      return res.status(404).json({
        success: false,
        message: 'Donor profile not found'
      });
    }

    const totalDonations = await DonationHistory.countDocuments({ 
      donorId: donor._id,
      status: 'completed'
    });

    const lastDonation = await DonationHistory.findOne({ donorId: donor._id })
      .sort({ donationDate: -1 });

    const stats = {
      totalDonations,
      lastDonationDate: lastDonation?.donationDate || null,
      daysSinceLastDonation: donor.daysSinceLastDonation,
      canDonate: donor.canDonate(),
      isAvailable: donor.isAvailable,
      bloodGroup: donor.bloodGroup
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get donor stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics'
    });
  }
};

/**
 * @desc    Download donation certificate
 * @route   GET /api/donor/certificate/:donationId
 * @access  Private (Donor only)
 */
exports.downloadCertificate = async (req, res) => {
  try {
    const donor = await Donor.findOne({ userId: req.user.id });

    if (!donor) {
      return res.status(404).json({
        success: false,
        message: 'Donor profile not found'
      });
    }

    // Find the donation history record
    const donation = await DonationHistory.findOne({
      _id: req.params.donationId,
      donorId: donor._id
    });

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation record not found'
      });
    }

    try {
      await ensureCertificateFile({
        donation,
        donor,
        donorName: req.user?.name || 'Donor',
        forceRegenerate: true
      });
    } catch (generationError) {
        console.error('Certificate regeneration error:', generationError);
        return res.status(500).json({
          success: false,
          message: 'Certificate file is unavailable and regeneration failed'
        });
    }

    // Send file for download
    const fileName = `LifeLink_Certificate_${donation.certificateNumber}.pdf`;
    
    res.download(donation.certificatePath, fileName, (err) => {
      if (err) {
        console.error('Certificate download error:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Error downloading certificate'
          });
        }
      }
    });

  } catch (error) {
    console.error('Download certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading certificate'
    });
  }
};

/**
 * @desc    Regenerate certificate file for a donation
 * @route   POST /api/donor/certificate/:donationId/regenerate
 * @access  Private (Donor only)
 */
exports.regenerateCertificate = async (req, res) => {
  try {
    const donor = await Donor.findOne({ userId: req.user.id });

    if (!donor) {
      return res.status(404).json({
        success: false,
        message: 'Donor profile not found'
      });
    }

    const donation = await DonationHistory.findOne({
      _id: req.params.donationId,
      donorId: donor._id
    });

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation record not found'
      });
    }

    await ensureCertificateFile({
      donation,
      donor,
      donorName: req.user?.name || 'Donor',
      forceRegenerate: true
    });

    res.json({
      success: true,
      message: 'Certificate regenerated successfully',
      data: {
        donationId: donation._id,
        certificateNumber: donation.certificateNumber,
        downloadUrl: `/api/donor/certificate/${donation._id}`
      }
    });
  } catch (error) {
    console.error('Regenerate certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Error regenerating certificate'
    });
  }
};

/**
 * @desc    Get all certificates for a donor
 * @route   GET /api/donor/certificates
 * @access  Private (Donor only)
 */
exports.getCertificates = async (req, res) => {
  try {
    const donor = await Donor.findOne({ userId: req.user.id });

    if (!donor) {
      return res.status(404).json({
        success: false,
        message: 'Donor profile not found'
      });
    }

    // Find all donations with certificates
    const donations = await DonationHistory.find({
      donorId: donor._id,
      status: 'completed',
      certificateNumber: { $exists: true, $ne: null }
    })
    .select('certificateNumber certificatePath certificateGeneratedAt bloodGroup unitsGiven hospitalName donationDate')
    .sort({ donationDate: -1 });

    res.json({
      success: true,
      count: donations.length,
      data: donations.map(d => ({
        id: d._id,
        certificateNumber: d.certificateNumber,
        bloodGroup: d.bloodGroup,
        unitsGiven: d.unitsGiven,
        hospitalName: d.hospitalName,
        donationDate: d.donationDate,
        generatedAt: d.certificateGeneratedAt,
        downloadable: Boolean(d.certificatePath),
        downloadUrl: `/api/donor/certificate/${d._id}`
      }))
    });

  } catch (error) {
    console.error('Get certificates error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching certificates'
    });
  }
};

const Donor = require('../models/Donor');
const BloodRequest = require('../models/BloodRequest');
const DonationHistory = require('../models/DonationHistory');
const geoService = require('../services/geo.service');
const AgentController = require('../services/agent/agent.controller');
const AgentState = require('../models/AgentState');
const path = require('path');
const fs = require('fs');

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

    // Add donor's response status to each request
    const requestsWithStatus = requests.map(request => {
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

    if (!donation.certificatePath) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not yet generated for this donation'
      });
    }

    // Check if certificate file exists
    if (!fs.existsSync(donation.certificatePath)) {
      return res.status(404).json({
        success: false,
        message: 'Certificate file not found'
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
      certificateNumber: { $exists: true, $ne: null }
    })
    .select('certificateNumber certificateGeneratedAt bloodGroup unitsGiven hospitalName donationDate')
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

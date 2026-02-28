const BloodRequest = require('../models/BloodRequest');
const FakeRequestAnalysis = require('../models/FakeRequestAnalysis');
const User = require('../models/User');
const Donor = require('../models/Donor');
const DonationHistory = require('../models/DonationHistory');
const emailService = require('../services/email.service');

/**
 * @desc    Get all flagged/fake requests for admin review
 * @route   GET /api/admin/flagged-requests
 * @access  Private (Admin only)
 */
exports.getFlaggedRequests = async (req, res) => {
  try {
    const flaggedAnalysis = await FakeRequestAnalysis.find({
      prediction: 'fake',
      adminReviewed: false
    })
      .populate({
        path: 'requestId',
        populate: {
          path: 'receiverId',
          select: 'name email phone'
        }
      })
      .populate('userId', 'name email phone')
      .sort({ analyzedAt: -1 })
      .limit(100);

    res.json({
      success: true,
      count: flaggedAnalysis.length,
      data: flaggedAnalysis
    });
  } catch (error) {
    console.error('Get flagged requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching flagged requests'
    });
  }
};

/**
 * @desc    Approve a flagged request (mark as genuine)
 * @route   PUT /api/admin/approve-request/:id
 * @access  Private (Admin only)
 */
exports.approveRequest = async (req, res) => {
  try {
    const { adminNotes } = req.body;

    const request = await BloodRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Blood request not found'
      });
    }

    // Update request
    request.status = 'approved';
    request.isFake = false;
    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();
    request.adminNotes = adminNotes;
    await request.save();

    // Update ML analysis
    await FakeRequestAnalysis.findOneAndUpdate(
      { requestId: request._id },
      {
        adminReviewed: true,
        adminDecision: 'approved',
        reviewedBy: req.user.id,
        reviewNotes: adminNotes
      }
    );

    res.json({
      success: true,
      message: 'Request approved successfully',
      data: request
    });
  } catch (error) {
    console.error('Approve request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving request'
    });
  }
};

/**
 * @desc    Reject a request (confirm as fake)
 * @route   PUT /api/admin/reject-request/:id
 * @access  Private (Admin only)
 */
exports.rejectRequest = async (req, res) => {
  try {
    const { adminNotes } = req.body;

    const request = await BloodRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Blood request not found'
      });
    }

    // Update request
    request.status = 'rejected';
    request.isFake = true;
    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();
    request.adminNotes = adminNotes;
    await request.save();

    // Update ML analysis
    await FakeRequestAnalysis.findOneAndUpdate(
      { requestId: request._id },
      {
        adminReviewed: true,
        adminDecision: 'rejected',
        reviewedBy: req.user.id,
        reviewNotes: adminNotes
      }
    );

    res.json({
      success: true,
      message: 'Request rejected successfully',
      data: request
    });
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting request'
    });
  }
};

/**
 * @desc    Get all blood requests (admin view)
 * @route   GET /api/admin/requests
 * @access  Private (Admin only)
 */
exports.getAllRequests = async (req, res) => {
  try {
    const { status, isFake, page = 1, limit = 50 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (isFake !== undefined) query.isFake = isFake === 'true';

    const requests = await BloodRequest.find(query)
      .populate('receiverId', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await BloodRequest.countDocuments(query);

    res.json({
      success: true,
      count: requests.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: requests
    });
  } catch (error) {
    console.error('Get all requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching requests'
    });
  }
};

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/admin/stats
 * @access  Private (Admin only)
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalDonors = await Donor.countDocuments();
    const totalReceivers = await User.countDocuments({ role: 'receiver' });
    
    const totalRequests = await BloodRequest.countDocuments();
    const pendingRequests = await BloodRequest.countDocuments({ status: 'pending' });
    const completedRequests = await BloodRequest.countDocuments({ status: 'completed' });
    const fakeRequests = await BloodRequest.countDocuments({ isFake: true });
    
    const availableDonors = await Donor.countDocuments({ isAvailable: true });
    const totalDonations = await DonationHistory.countDocuments({ status: 'completed' });

    // Requests by blood group
    const requestsByBloodGroup = await BloodRequest.aggregate([
      { $group: { _id: '$bloodGroup', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Donors by blood group
    const donorsByBloodGroup = await Donor.aggregate([
      { $group: { _id: '$bloodGroup', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Recent activity
    const recentRequests = await BloodRequest.find()
      .populate('receiverId', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    const stats = {
      users: {
        total: totalUsers,
        donors: totalDonors,
        receivers: totalReceivers,
        availableDonors
      },
      requests: {
        total: totalRequests,
        pending: pendingRequests,
        completed: completedRequests,
        fake: fakeRequests,
        successRate: totalRequests > 0 ? ((completedRequests / totalRequests) * 100).toFixed(2) : 0
      },
      donations: {
        total: totalDonations
      },
      distribution: {
        requestsByBloodGroup,
        donorsByBloodGroup
      },
      recentActivity: recentRequests
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics'
    });
  }
};

/**
 * @desc    Get all users
 * @route   GET /api/admin/users
 * @access  Private (Admin only)
 */
exports.getAllUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 50 } = req.query;

    const query = {};
    if (role) query.role = role;

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      count: users.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: users
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
};

/**
 * @desc    Deactivate user account
 * @route   PUT /api/admin/users/:id/deactivate
 * @access  Private (Admin only)
 */
exports.deactivateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deactivating user'
    });
  }
};

/**
 * @desc    Activate user account
 * @route   PUT /api/admin/users/:id/activate
 * @access  Private (Admin only)
 */
exports.activateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isActive = true;
    await user.save();

    res.json({
      success: true,
      message: 'User activated successfully'
    });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error activating user'
    });
  }
};

/**
 * ==========================================
 * SUPER ADMIN ENDPOINTS - Admin Approval
 * ==========================================
 */

/**
 * @desc    Get all pending admin registrations
 * @route   GET /api/admin/pending-admins
 * @access  Private (Super Admin only)
 */
exports.getPendingAdmins = async (req, res) => {
  try {
    const pendingAdmins = await User.find({
      role: 'admin',
      accountStatus: 'pending',
      isEmailVerified: true // Only show admins who have verified their email
    })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: pendingAdmins.length,
      data: pendingAdmins
    });
  } catch (error) {
    console.error('Get pending admins error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending admins'
    });
  }
};

/**
 * @desc    Approve admin registration
 * @route   PUT /api/admin/approve-admin/:id
 * @access  Private (Super Admin only)
 */
exports.approveAdmin = async (req, res) => {
  try {
    const adminId = req.params.id;

    const admin = await User.findById(adminId);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    if (admin.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'User is not an admin'
      });
    }

    if (admin.accountStatus === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Admin is already approved'
      });
    }

    if (admin.accountStatus === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Cannot approve a rejected admin. Please contact support.'
      });
    }

    // Approve admin
    admin.accountStatus = 'approved';
    admin.approvedBy = req.user.id;
    admin.approvedAt = new Date();
    admin.rejectionReason = undefined;
    await admin.save();

    // Send approval email
    try {
      await emailService.sendAdminApprovalNotification(
        admin.email,
        admin.name,
        'approved'
      );
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError);
      // Don't fail the approval if email fails
    }

    res.json({
      success: true,
      message: 'Admin approved successfully',
      data: admin.getPublicProfile()
    });
  } catch (error) {
    console.error('Approve admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving admin'
    });
  }
};

/**
 * @desc    Reject admin registration
 * @route   PUT /api/admin/reject-admin/:id
 * @access  Private (Super Admin only)
 */
exports.rejectAdmin = async (req, res) => {
  try {
    const adminId = req.params.id;
    const { reason } = req.body;

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a rejection reason (minimum 10 characters)'
      });
    }

    const admin = await User.findById(adminId);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    if (admin.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'User is not an admin'
      });
    }

    if (admin.accountStatus === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Cannot reject an approved admin. Please deactivate instead.'
      });
    }

    // Reject admin
    admin.accountStatus = 'rejected';
    admin.rejectionReason = reason;
    admin.isActive = false; // Deactivate account
    await admin.save();

    // Send rejection email
    try {
      await emailService.sendAdminApprovalNotification(
        admin.email,
        admin.name,
        'rejected',
        reason
      );
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);
      // Don't fail the rejection if email fails
    }

    res.json({
      success: true,
      message: 'Admin registration rejected',
      data: {
        adminId: admin._id,
        status: admin.accountStatus,
        reason: admin.rejectionReason
      }
    });
  } catch (error) {
    console.error('Reject admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting admin'
    });
  }
};

/**
 * @desc    Get all admins (approved, pending, rejected)
 * @route   GET /api/admin/all-admins
 * @access  Private (Super Admin only)
 */
exports.getAllAdmins = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = { role: 'admin' };
    if (status) {
      filter.accountStatus = status;
    }

    const admins = await User.find(filter)
      .select('-password')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: admins.length,
      data: admins
    });
  } catch (error) {
    console.error('Get all admins error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching admins'
    });
  }
};

/**
 * @desc    Get all donors with details
 * @route   GET /api/admin/donors
 * @access  Private (Admin only)
 */
exports.getAllDonors = async (req, res) => {
  try {
    const donors = await Donor.find()
      .populate('userId', 'name email phone isActive')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: donors.length,
      data: donors
    });
  } catch (error) {
    console.error('Get all donors error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching donors'
    });
  }
};

/**
 * @desc    Toggle user active status
 * @route   PUT /api/admin/users/:id/status
 * @access  Private (Admin only)
 */
exports.toggleUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admins from deactivating themselves or other admins
    if (user.role === 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify admin users'
      });
    }

    user.isActive = isActive;
    await user.save();

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: user
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user status'
    });
  }
};

/**
 * @desc    Delete a user
 * @route   DELETE /api/admin/users/:id
 * @access  Private (Admin only)
 */
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admins from deleting themselves or other admins
    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete admin users. Use super admin controls instead.'
      });
    }

    // Also delete associated donor profile if exists
    if (user.role === 'donor') {
      await Donor.findOneAndDelete({ userId: user._id });
    }

    await user.deleteOne();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user'
    });
  }
};

/**
 * @desc    Get advanced analytics data
 * @route   GET /api/admin/analytics
 * @access  Private (Admin only)
 */
exports.getAdvancedAnalytics = async (req, res) => {
  try {
    const [
      totalUsers,
      activeDonors,
      completedDonations,
      pendingRequests,
      citiesServed,
      fakeDetections
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Donor.countDocuments({ isAvailable: true }),
      DonationHistory.countDocuments({ status: 'completed' }),
      BloodRequest.countDocuments({ status: 'pending' }),
      Donor.distinct('city').then(cities => cities.length),
      FakeRequestAnalysis.countDocuments({
        prediction: 'fake',
        analyzedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        activeDonors,
        completedDonations,
        pendingRequests,
        citiesServed: citiesServed || 1,
        fakeDetections
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics'
    });
  }
};

/**
 * @desc    Export data as CSV
 * @route   GET /api/admin/export/:type
 * @access  Private (Admin only)
 */
exports.exportData = async (req, res) => {
  try {
    const { type } = req.params;
    
    let data;
    let headers;
    
    switch (type) {
      case 'users':
        data = await User.find().select('-password').lean();
        headers = ['Name', 'Email', 'Role', 'Phone', 'Active', 'Created At'];
        break;
        
      case 'donors':
        data = await Donor.find().populate('userId', 'name email').lean();
        headers = ['Name', 'Email', 'Blood Group', 'City', 'State', 'Available', 'Last Donation'];
        break;
        
      case 'requests':
        data = await BloodRequest.find().populate('receiverId', 'name email').lean();
        headers = ['Patient Name', 'Blood Group', 'Hospital', 'City', 'Units', 'Urgency', 'Status', 'Created At'];
        break;
        
      case 'donations':
        data = await DonationHistory.find().populate('donorId receiverId').lean();
        headers = ['Donor', 'Receiver', 'Blood Group', 'Units', 'Status', 'Donation Date'];
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid export type'
        });
    }

    // Convert to CSV (simplified - use a CSV library in production)
    let csv = headers.join(',') + '\n';
    csv += data.map(row => {
      // Format row based on type - this is simplified
      return Object.values(row).map(val => 
        typeof val === 'object' ? JSON.stringify(val) : val
      ).join(',');
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}_export_${Date.now()}.csv`);
    res.send(csv);

  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting data'
    });
  }
};

/**
 * @desc    Get all location-based suspicious requests
 * @route   GET /api/admin/location-detections
 * @access  Private (Admin only)
 */
exports.getLocationDetections = async (req, res) => {
  try {
    const RequestTracking = require('../models/RequestTracking');
    
    // Get suspicious location patterns
    const suspiciousTracking = await RequestTracking.find({
      suspicionFlags: { $exists: true, $ne: [] }
    })
      .populate('userId', 'name email phone role')
      .populate('requestId', 'bloodGroup urgency status createdAt locationSeverity')
      .sort({ timestamp: -1 })
      .limit(100);

    // Get requests flagged for review or flagged
    const flaggedRequests = await BloodRequest.find({
      $or: [
        { status: 'review' },
        { status: 'flagged' },
        { locationSuspicious: true }
      ]
    })
      .populate('receiverId', 'name email phone')
      .select('bloodGroup urgency hospitalName location createdAt locationSeverity locationFlags locationDetails mlScore status')
      .sort({ createdAt: -1 })
      .limit(50);

    // Calculate statistics
    const stats = {
      totalSuspicious: suspiciousTracking.length,
      flagsByType: {},
      severityDistribution: {
        high: 0,   // >= 70
        medium: 0, // >= 30
        low: 0     // < 30
      }
    };

    // Count flags by type
    suspiciousTracking.forEach(track => {
      track.suspicionFlags.forEach(flag => {
        stats.flagsByType[flag] = (stats.flagsByType[flag] || 0) + 1;
      });

      // Severity distribution
      const severity = track.requestId?.locationSeverity || 0;
      if (severity >= 70) stats.severityDistribution.high++;
      else if (severity >= 30) stats.severityDistribution.medium++;
      else stats.severityDistribution.low++;
    });

    res.json({
      success: true,
      data: {
        suspiciousPatterns: suspiciousTracking,
        flaggedRequests,
        stats
      }
    });
  } catch (error) {
    console.error('Get location detections error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching location detections'
    });
  }
};

/**
 * @desc    Get location history for a specific user
 * @route   GET /api/admin/user/:userId/location-history
 * @access  Private (Admin only)
 */
exports.getUserLocationHistory = async (req, res) => {
  try {
    const RequestTracking = require('../models/RequestTracking');
    const locationTrackingService = require('../services/locationTracking.service');
    
    const { userId } = req.params;

    // Get user details
    const user = await User.findById(userId).select('name email phone role');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get location history
    const history = await locationTrackingService.getUserLocationHistory(userId);

    // Get all requests by this user
    const requests = await BloodRequest.find({ receiverId: userId })
      .select('bloodGroup urgency createdAt status locationSuspicious locationSeverity locationFlags')
      .sort({ createdAt: -1 });

    // Calculate user risk profile
    const suspiciousCount = history.filter(h => h.suspicionFlags && h.suspicionFlags.length > 0).length;
    const uniqueCities = [...new Set(history.map(h => h.location.city).filter(Boolean))];
    const uniqueIPs = [...new Set(history.map(h => h.ipAddress).filter(Boolean))];
    
    const riskProfile = {
      totalRequests: history.length,
      suspiciousRequests: suspiciousCount,
      riskScore: history.length > 0 ? (suspiciousCount / history.length * 100).toFixed(1) : 0,
      uniqueCities: uniqueCities.length,
      uniqueIPs: uniqueIPs.length,
      cities: uniqueCities,
      mostRecentLocation: history.length > 0 ? history[0].location : null,
      mostRecentIP: history.length > 0 ? history[0].ipAddress : null
    };

    res.json({
      success: true,
      data: {
        user,
        riskProfile,
        locationHistory: history,
        requests
      }
    });
  } catch (error) {
    console.error('Get user location history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user location history'
    });
  }
};

/**
 * @desc    Get suspicious requests from ip-api.com
 * @route   GET /api/admin/suspicious-locations
 * @access  Private (Admin only)
 */
exports.getSuspiciousLocations = async (req, res) => {
  try {
    const RequestTracking = require('../models/RequestTracking');
    const locationTrackingService = require('../services/locationTracking.service');

    // Get suspicious tracking records
    const suspicious = await locationTrackingService.getSuspiciousRequests(100);

    // Group by user
    const byUser = {};
    suspicious.forEach(track => {
      const userId = track.userId.toString();
      if (!byUser[userId]) {
        byUser[userId] = {
          userId,
          user: null,
          count: 0,
          totalSeverity: 0,
          flags: [],
          patterns: []
        };
      }
      byUser[userId].count++;
      byUser[userId].totalSeverity += (track.requestId?.locationSeverity || 0);
      byUser[userId].patterns.push(track);
      track.suspicionFlags.forEach(flag => {
        if (!byUser[userId].flags.includes(flag)) {
          byUser[userId].flags.push(flag);
        }
      });
    });

    // Fetch user details for top suspicious users
    const topUsers = Object.values(byUser)
      .sort((a, b) => b.totalSeverity - a.totalSeverity)
      .slice(0, 20);

    for (let userEntry of topUsers) {
      const user = await User.findById(userEntry.userId).select('name email phone role');
      userEntry.user = user;
      userEntry.avgSeverity = (userEntry.totalSeverity / userEntry.count).toFixed(1);
    }

    res.json({
      success: true,
      data: {
        totalSuspicious: suspicious.length,
        topSuspiciousUsers: topUsers,
        recentPatterns: suspicious.slice(0, 30)
      }
    });
  } catch (error) {
    console.error('Get suspicious locations error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching suspicious locations'
    });
  }
};

/**
 * @desc    Process unanalyzed blood requests with Agentic AI
 * @route   POST /api/admin/process-unanalyzed-requests
 * @access  Private (Admin only)
 */
exports.processUnanalyzedRequests = async (req, res) => {
  try {
    const AgentController = require('../services/agent/agent.controller');
    const agentController = new AgentController(req.app.get('io'));
    
    console.log('🤖 Admin triggered retroactive AI processing...');
    const result = await agentController.processUnanalyzedRequests();
    
    res.json({
      success: true,
      message: result.message,
      data: {
        processed: result.processed,
        failed: result.failed || 0,
        details: result.details
      }
    });
  } catch (error) {
    console.error('Process unanalyzed requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing unanalyzed requests'
    });
  }
};


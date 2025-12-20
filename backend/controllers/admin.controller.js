const BloodRequest = require('../models/BloodRequest');
const FakeRequestAnalysis = require('../models/FakeRequestAnalysis');
const User = require('../models/User');
const Donor = require('../models/Donor');
const DonationHistory = require('../models/DonationHistory');

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

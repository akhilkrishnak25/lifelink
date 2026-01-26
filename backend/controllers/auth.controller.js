const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Donor = require('../models/Donor');
const BloodRequest = require('../models/BloodRequest');
const DonationHistory = require('../models/DonationHistory');

/**
 * Generate JWT token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, role, donorData } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      phone,
      role
    });

    // If donor profile data was provided, create donor profile (for user accounts)
    if (role === 'user' && donorData) {
      await Donor.create({
        userId: user._id,
        bloodGroup: donorData.bloodGroup,
        location: {
          type: 'Point',
          coordinates: [donorData.longitude, donorData.latitude]
        },
        address: donorData.address,
        city: donorData.city,
        state: donorData.state,
        pincode: donorData.pincode,
        ageGroup: donorData.ageGroup,
        isAvailable: true
      });
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: user.getPublicProfile(),
        token
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error registering user'
    });
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user and include password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.getPublicProfile(),
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in'
    });
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    let profile = user.getPublicProfile();

    // If a donor profile exists, include donor details
    if (user.role === 'user') {
      const donor = await Donor.findOne({ userId: user._id });
      profile.donorProfile = donor;
    }

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;

    const user = await User.findById(req.user.id);

    if (name) user.name = name;
    if (phone) user.phone = phone;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile'
    });
  }
};

/**
 * @desc    Logout user (client-side token removal)
 * @route   POST /api/auth/logout
 * @access  Private
 */
exports.logout = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Logout successful. Please remove token from client.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error logging out'
    });
  }
};

/**
 * @desc    Get user dashboard stats
 * @route   GET /api/auth/dashboard
 * @access  Private
 */
exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    const donor = await Donor.findOne({ userId });
    const donorId = donor?._id;

    const [myRequests, myDonations] = await Promise.all([
      BloodRequest.countDocuments({ receiverId: userId }),
      donorId ? DonationHistory.countDocuments({ donorId }) : 0
    ]);

    const profileComplete = !!(
      req.user.name &&
      req.user.email &&
      req.user.phone &&
      donor?.bloodGroup &&
      donor?.city
    );

    res.json({
      success: true,
      data: {
        myRequests,
        myDonations,
        profileComplete,
        donorProfileExists: !!donor
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: 'Error fetching dashboard' });
  }
};

/**
 * @desc    Get weekly activity data for charts
 * @route   GET /api/auth/weekly
 * @access  Private
 */
exports.getWeekly = async (req, res) => {
  try {
    const userId = req.user.id;
    const donor = await Donor.findOne({ userId });
    const donorId = donor?._id;

    // Last 7 days labels
    const labels = [];
    const donationCounts = [];
    const requestCounts = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      const dayStart = new Date(day.setHours(0, 0, 0, 0));
      const dayEnd = new Date(day.setHours(23, 59, 59, 999));

      labels.push(dayStart.toLocaleDateString('en-US', { weekday: 'short' }));

      const [donations, requests] = await Promise.all([
        donorId
          ? DonationHistory.countDocuments({ donorId, donationDate: { $gte: dayStart, $lte: dayEnd } })
          : 0,
        BloodRequest.countDocuments({ receiverId: userId, createdAt: { $gte: dayStart, $lte: dayEnd } })
      ]);

      donationCounts.push(donations);
      requestCounts.push(requests);
    }

    res.json({
      success: true,
      data: { labels, donations: donationCounts, requests: requestCounts }
    });
  } catch (error) {
    console.error('Weekly error:', error);
    res.status(500).json({ success: false, message: 'Error fetching weekly data' });
  }
};

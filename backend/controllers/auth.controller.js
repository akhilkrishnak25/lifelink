const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Donor = require('../models/Donor');
const BloodRequest = require('../models/BloodRequest');
const DonationHistory = require('../models/DonationHistory');
const emailService = require('../services/email.service');

// Feature activation date - users created before this are auto-verified
const EMAIL_OTP_FEATURE_DATE = new Date('2026-02-01T00:00:00.000Z');

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

    // Validate password length
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // For new registrations: set email as unverified and account as pending (for admins)
    const isNewUser = true; // All registrations are new
    const userRole = role || 'user';
    
    // Create user with security fields
    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: userRole,
      isEmailVerified: false, // New users must verify email
      accountStatus: userRole === 'admin' ? 'pending' : 'active' // Admins need approval
    });

    // Generate and send OTP
    const otp = user.generateEmailOtp();
    await user.save();

    try {
      await emailService.sendEmailOtp(email, name, otp);
    } catch (emailError) {
      // If email fails, delete the user and return error
      await User.findByIdAndDelete(user._id);
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again with a valid email address.'
      });
    }

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

    res.status(201).json({
      success: true,
      message: userRole === 'admin' 
        ? 'Registration successful! Please verify your email. Admin approval required before login.'
        : 'Registration successful! Please check your email for verification code.',
      data: {
        userId: user._id,
        email: user.email,
        requiresEmailVerification: true,
        requiresAdminApproval: userRole === 'admin'
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

    // BACKWARD COMPATIBILITY: Check if user was created before email OTP feature
    const isLegacyUser = user.createdAt < EMAIL_OTP_FEATURE_DATE;

    if (!isLegacyUser) {
      // New users must have verified email
      if (!user.isEmailVerified) {
        return res.status(403).json({
          success: false,
          message: 'Email not verified. Please verify your email before logging in.',
          code: 'EMAIL_NOT_VERIFIED',
          userId: user._id
        });
      }

      // Admins must be approved
      if (user.role === 'admin' && user.accountStatus !== 'approved') {
        if (user.accountStatus === 'pending') {
          return res.status(403).json({
            success: false,
            message: 'Your admin account is pending approval. Please wait for Super Admin approval.',
            code: 'ADMIN_APPROVAL_PENDING'
          });
        } else if (user.accountStatus === 'rejected') {
          return res.status(403).json({
            success: false,
            message: 'Your admin registration was rejected. Please contact support.',
            code: 'ADMIN_REJECTED',
            reason: user.rejectionReason
          });
        }
      }
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

/**
 * @desc    Verify email OTP
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
exports.verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    // Find user with OTP fields
    const user = await User.findOne({ email }).select('+emailOtp +emailOtpExpiry');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already verified
    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified. You can login now.'
      });
    }

    // Verify OTP
    const verification = user.verifyEmailOtp(otp);

    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        message: verification.message
      });
    }

    // Mark email as verified and clear OTP
    user.isEmailVerified = true;
    user.clearEmailOtp();
    await user.save();

    // Send welcome email (don't wait for it)
    emailService.sendWelcomeEmail(user.email, user.name, user.role).catch(err => {
      console.error('Failed to send welcome email:', err);
    });

    // Generate token for immediate login (only if not admin or admin is approved)
    let token = null;
    let canLogin = true;

    if (user.role === 'admin' && user.accountStatus !== 'approved') {
      canLogin = false;
    } else {
      token = generateToken(user._id);
    }

    res.json({
      success: true,
      message: user.role === 'admin' 
        ? 'Email verified successfully! Your account is pending Super Admin approval.'
        : 'Email verified successfully! You can now login.',
      data: {
        emailVerified: true,
        canLogin,
        requiresAdminApproval: user.role === 'admin' && user.accountStatus !== 'approved',
        ...(token && { token, user: user.getPublicProfile() })
      }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying OTP'
    });
  }
};

/**
 * @desc    Resend email OTP
 * @route   POST /api/auth/resend-otp
 * @access  Public
 */
exports.resendEmailOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already verified
    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      });
    }

    // Rate limiting - max 3 attempts
    if (user.emailOtpAttempts >= 3) {
      return res.status(429).json({
        success: false,
        message: 'Maximum OTP resend attempts reached. Please try again after 30 minutes or contact support.'
      });
    }

    // Generate new OTP
    const otp = user.generateEmailOtp();
    user.emailOtpAttempts += 1;
    await user.save();

    // Send OTP
    await emailService.sendEmailOtp(email, user.name, otp);

    res.json({
      success: true,
      message: 'OTP resent successfully. Please check your email.',
      data: {
        attemptsRemaining: 3 - user.emailOtpAttempts
      }
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error resending OTP'
    });
  }
};

/**
 * @desc    Request password reset (send OTP)
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset OTP has been sent.'
      });
    }

    // Generate OTP for password reset
    const otp = user.generateEmailOtp();
    await user.save();

    // Send password reset OTP
    await emailService.sendPasswordResetOtp(email, user.name, otp);

    res.json({
      success: true,
      message: 'Password reset OTP has been sent to your email.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing password reset request'
    });
  }
};

/**
 * @desc    Verify password reset OTP
 * @route   POST /api/auth/verify-reset-otp
 * @access  Public
 */
exports.verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    const user = await User.findOne({ email }).select('+emailOtp +emailOtpExpiry');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify OTP
    const verification = user.verifyEmailOtp(otp);

    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        message: verification.message
      });
    }

    // Generate temporary token for password reset (valid for 10 minutes)
    const resetToken = jwt.sign(
      { id: user._id, purpose: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    // Don't clear OTP yet - will clear after password is actually reset

    res.json({
      success: true,
      message: 'OTP verified. You can now reset your password.',
      data: {
        resetToken
      }
    });
  } catch (error) {
    console.error('Verify reset OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying OTP'
    });
  }
};

/**
 * @desc    Reset password with verified OTP
 * @route   POST /api/auth/reset-password
 * @access  Public (requires reset token)
 */
exports.resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Reset token and new password are required'
      });
    }

    // Validate password length
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
      });
    }

    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
      if (decoded.purpose !== 'password_reset') {
        throw new Error('Invalid token purpose');
      }
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update password and clear OTP
    user.password = newPassword;
    user.clearEmailOtp();
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password'
    });
  }
};

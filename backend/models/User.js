const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't return password by default
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
  },
  role: {
    type: String,
    // App v2 uses a unified "user" role for normal accounts.
    // Keep legacy roles for backward compatibility with older pages.
    enum: ['user', 'donor', 'receiver', 'admin', 'super_admin'],
    required: [true, 'Role is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Email verification fields
  isEmailVerified: {
    type: Boolean,
    default: true // Default true for backward compatibility - existing users are auto-verified
  },
  emailOtp: {
    type: String,
    select: false // Don't return OTP by default
  },
  emailOtpExpiry: {
    type: Date,
    select: false
  },
  emailOtpAttempts: {
    type: Number,
    default: 0
  },
  // Admin approval fields
  accountStatus: {
    type: String,
    enum: ['active', 'pending', 'approved', 'rejected'],
    default: 'approved' // Default approved for backward compatibility - existing users/admins are auto-approved
  },
  rejectionReason: {
    type: String
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for faster email lookups
userSchema.index({ email: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash password if it has been modified
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password for login
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get public profile (without sensitive data)
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.emailOtp;
  delete userObject.emailOtpExpiry;
  return userObject;
};

// Generate 6-digit email OTP
userSchema.methods.generateEmailOtp = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.emailOtp = otp;
  this.emailOtpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  return otp;
};

// Verify email OTP
userSchema.methods.verifyEmailOtp = function(otp) {
  if (!this.emailOtp || !this.emailOtpExpiry) {
    return { valid: false, message: 'No OTP found. Please request a new one.' };
  }
  
  if (new Date() > this.emailOtpExpiry) {
    return { valid: false, message: 'OTP has expired. Please request a new one.' };
  }
  
  if (this.emailOtp !== otp) {
    return { valid: false, message: 'Invalid OTP. Please try again.' };
  }
  
  return { valid: true, message: 'OTP verified successfully.' };
};

// Clear OTP after verification or expiry
userSchema.methods.clearEmailOtp = function() {
  this.emailOtp = undefined;
  this.emailOtpExpiry = undefined;
  this.emailOtpAttempts = 0;
};

const User = mongoose.model('User', userSchema);

module.exports = User;

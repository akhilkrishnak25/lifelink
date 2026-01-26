const validator = require('validator');

// Validate registration input
exports.validateRegister = (req, res, next) => {
  const { name, email, password, phone, role } = req.body;
  const errors = [];

  // Name validation
  if (!name || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }

  // Email validation
  if (!email || !validator.isEmail(email)) {
    errors.push('Please provide a valid email address');
  }

  // Password validation
  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }

  // Phone validation
  if (!phone || !/^[0-9]{10}$/.test(phone)) {
    errors.push('Please provide a valid 10-digit phone number');
  }

  // Role validation
  if (!role || !['user', 'admin'].includes(role)) {
    errors.push('Invalid role. Must be user or admin');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

// Validate login input
exports.validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email || !validator.isEmail(email)) {
    errors.push('Please provide a valid email address');
  }

  if (!password) {
    errors.push('Password is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

// Validate donor profile
exports.validateDonorProfile = (req, res, next) => {
  const { bloodGroup, longitude, latitude, address, city, state, pincode, ageGroup } = req.body;
  const errors = [];

  // Blood group validation
  const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  if (!bloodGroup || !validBloodGroups.includes(bloodGroup)) {
    errors.push('Invalid blood group');
  }

  // Location validation
  if (longitude === undefined || latitude === undefined) {
    errors.push('Location coordinates are required');
  } else {
    if (longitude < -180 || longitude > 180) {
      errors.push('Invalid longitude value');
    }
    if (latitude < -90 || latitude > 90) {
      errors.push('Invalid latitude value');
    }
  }

  // Address validation
  if (!address || address.trim().length < 5) {
    errors.push('Address must be at least 5 characters long');
  }

  // City validation
  if (!city || city.trim().length < 2) {
    errors.push('City is required');
  }

  // State validation
  if (!state || state.trim().length < 2) {
    errors.push('State is required');
  }

  // Pincode validation
  if (!pincode || !/^[0-9]{6}$/.test(pincode)) {
    errors.push('Please provide a valid 6-digit pincode');
  }

  // Age group validation
  const validAgeGroups = ['18-25', '26-35', '36-45', '46-60'];
  if (!ageGroup || !validAgeGroups.includes(ageGroup)) {
    errors.push('Invalid age group');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

// Validate blood request
exports.validateBloodRequest = (req, res, next) => {
  const { 
    bloodGroup, urgency, hospitalName, longitude, latitude, 
    address, city, state, pincode, contactNumber, unitsRequired, patientName 
  } = req.body;
  const errors = [];

  // Blood group validation
  const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  if (!bloodGroup || !validBloodGroups.includes(bloodGroup)) {
    errors.push('Invalid blood group');
  }

  // Urgency validation
  const validUrgency = ['critical', 'urgent', 'normal'];
  if (!urgency || !validUrgency.includes(urgency)) {
    errors.push('Invalid urgency level. Must be critical, urgent, or normal');
  }

  // Hospital name validation
  if (!hospitalName || hospitalName.trim().length < 3) {
    errors.push('Hospital name must be at least 3 characters long');
  }

  // Location validation
  if (longitude === undefined || latitude === undefined) {
    errors.push('Location coordinates are required');
  } else {
    if (longitude < -180 || longitude > 180) {
      errors.push('Invalid longitude value');
    }
    if (latitude < -90 || latitude > 90) {
      errors.push('Invalid latitude value');
    }
  }

  // Address validation
  if (!address || address.trim().length < 5) {
    errors.push('Address must be at least 5 characters long');
  }

  // City validation
  if (!city || city.trim().length < 2) {
    errors.push('City is required');
  }

  // State validation
  if (!state || state.trim().length < 2) {
    errors.push('State is required');
  }

  // Pincode validation
  if (!pincode || !/^[0-9]{6}$/.test(pincode)) {
    errors.push('Please provide a valid 6-digit pincode');
  }

  // Contact number validation
  if (!contactNumber || !/^[0-9]{10}$/.test(contactNumber)) {
    errors.push('Please provide a valid 10-digit contact number');
  }

  // Units required validation
  if (!unitsRequired || unitsRequired < 1 || unitsRequired > 10) {
    errors.push('Units required must be between 1 and 10');
  }

  // Patient name validation
  if (!patientName || patientName.trim().length < 2) {
    errors.push('Patient name must be at least 2 characters long');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

// Sanitize string inputs
exports.sanitizeInput = (req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = validator.escape(req.body[key].trim());
      }
    });
  }
  next();
};

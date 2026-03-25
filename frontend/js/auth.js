// Authentication JavaScript functions

/**
 * Handle user login
 */
async function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  // Validation
  if (!isValidEmail(email)) {
    showAlert('Please enter a valid email address', 'danger');
    return;
  }

  if (!password || password.length < 6) {
    showAlert('Password must be at least 6 characters', 'danger');
    return;
  }

  try {
    // Disable submit button
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    const response = await apiRequest('/api/auth/login', 'POST', {
      email,
      password
    });

    if (response.success) {
      // Store token and user data
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      showAlert('Login successful! Redirecting...', 'success');

      // Redirect based on role
      setTimeout(() => {
        const role = response.data.user.role;
        if (role === 'donor') {
          window.location.href = 'donor-dashboard.html';
        } else if (role === 'receiver') {
          window.location.href = 'receiver-dashboard.html';
        } else if (role === 'admin') {
          window.location.href = 'admin-dashboard.html';
        } else {
          window.location.href = 'index.html';
        }
      }, 1000);
    }
  } catch (error) {
    showAlert(error.message || 'Login failed. Please try again.', 'danger');
    
    // Re-enable submit button
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Login';
  }
}

/**
 * Handle user registration
 */
async function handleRegister(event) {
  event.preventDefault();

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const password = document.getElementById('password').value;
  const role = document.getElementById('role').value;

  // Validation
  if (name.length < 2) {
    showAlert('Name must be at least 2 characters', 'danger');
    return;
  }

  if (!isValidEmail(email)) {
    showAlert('Please enter a valid email address', 'danger');
    return;
  }

  if (!isValidPhone(phone)) {
    showAlert('Please enter a valid 10-digit phone number', 'danger');
    return;
  }

  if (password.length < 6) {
    showAlert('Password must be at least 6 characters', 'danger');
    return;
  }

  if (!role) {
    showAlert('Please select your role', 'danger');
    return;
  }

  const requestData = {
    name,
    email,
    phone,
    password,
    role
  };

  // If role is donor, include donor data
  if (role === 'donor') {
    const bloodGroup = document.getElementById('bloodGroup').value;
    const ageGroup = document.getElementById('ageGroup').value;
    const address = document.getElementById('address').value.trim();
    const city = document.getElementById('city').value.trim();
    const state = document.getElementById('state').value.trim();
    const pincode = document.getElementById('pincode').value.trim();
    const latitude = parseFloat(document.getElementById('latitude').value);
    const longitude = parseFloat(document.getElementById('longitude').value);

    // Validate donor fields
    if (!bloodGroup) {
      showAlert('Please select blood group', 'danger');
      return;
    }

    if (!ageGroup) {
      showAlert('Please select age group', 'danger');
      return;
    }

    if (!address || address.length < 5) {
      showAlert('Please enter a valid address', 'danger');
      return;
    }

    if (!city || city.length < 2) {
      showAlert('Please enter city', 'danger');
      return;
    }

    if (!state || state.length < 2) {
      showAlert('Please enter state', 'danger');
      return;
    }

    if (!isValidPincode(pincode)) {
      showAlert('Please enter a valid 6-digit pincode', 'danger');
      return;
    }

    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
      showAlert('Please enter a valid latitude', 'danger');
      return;
    }

    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
      showAlert('Please enter a valid longitude', 'danger');
      return;
    }

    requestData.donorData = {
      bloodGroup,
      ageGroup,
      address,
      city,
      state,
      pincode,
      latitude,
      longitude
    };
  }

  try {
    // Disable submit button
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Registering...';

    const response = await apiRequest('/api/auth/register', 'POST', requestData);

    if (response.success) {
      // Store token and user data
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      showAlert('Registration successful! Redirecting...', 'success');

      // Redirect based on role
      setTimeout(() => {
        if (role === 'donor') {
          window.location.href = 'donor-dashboard.html';
        } else if (role === 'receiver') {
          window.location.href = 'receiver-dashboard.html';
        } else {
          window.location.href = 'index.html';
        }
      }, 1000);
    }
  } catch (error) {
    showAlert(error.message || 'Registration failed. Please try again.', 'danger');
    
    // Re-enable submit button
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Register';
  }
}

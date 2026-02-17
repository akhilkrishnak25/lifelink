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
      if (window.Session && typeof Session.setSession === 'function') {
        Session.setSession(response.data.token, response.data.user);
      } else {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }

      showAlert('Login successful! Redirecting...', 'success');

      // Redirect based on role
      setTimeout(() => {
        const role = response.data.user.role;
        if (role === 'admin' || role === 'super_admin') {
          window.location.replace('admin-dashboard.html');
          return;
        }

        // For normal users: go to the Home hub with sidebar
        window.location.replace('home.html');
      }, 1000);
    }
  } catch (error) {
    // Handle specific error codes
    if (error.code === 'EMAIL_NOT_VERIFIED') {
      showAlert(error.message, 'warning');
      // Redirect to email verification page
      setTimeout(() => {
        window.location.href = `verify-email.html?email=${encodeURIComponent(email)}`;
      }, 2000);
      return;
    } else if (error.code === 'ADMIN_APPROVAL_PENDING') {
      showAlert(error.message, 'info');
    } else if (error.code === 'ADMIN_REJECTED') {
      showAlert(error.message + (error.reason ? ` Reason: ${error.reason}` : ''), 'danger');
    } else {
      showAlert(error.message || 'Login failed. Please try again.', 'danger');
    }
    
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

  if (password.length < 8) {
    showAlert('Password must be at least 8 characters', 'danger');
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

  // Optional donor profile data (for user accounts)
  if (role === 'user') {
    const bloodGroup = (document.getElementById('bloodGroup')?.value || '').trim();
    const ageGroup = (document.getElementById('ageGroup')?.value || '').trim();
    const address = (document.getElementById('address')?.value || '').trim();
    const city = (document.getElementById('city')?.value || '').trim();
    const state = (document.getElementById('state')?.value || '').trim();
    const pincode = (document.getElementById('pincode')?.value || '').trim();
    const latRaw = (document.getElementById('latitude')?.value || '').trim();
    const lonRaw = (document.getElementById('longitude')?.value || '').trim();
    const latitude = latRaw ? parseFloat(latRaw) : null;
    const longitude = lonRaw ? parseFloat(lonRaw) : null;

    const anyDonorFieldFilled =
      !!bloodGroup || !!ageGroup || !!address || !!city || !!state || !!pincode || latRaw.length > 0 || lonRaw.length > 0;

    if (anyDonorFieldFilled) {
      // Light validation only if user started filling donor profile
      if (!bloodGroup) {
        showAlert('Please select blood group (or clear donor fields).', 'danger');
        return;
      }
      if (!ageGroup) {
        showAlert('Please select age group (or clear donor fields).', 'danger');
        return;
      }
      if (!address || address.length < 5) {
        showAlert('Please enter a valid address (or clear donor fields).', 'danger');
        return;
      }
      if (!city || city.length < 2) {
        showAlert('Please enter city (or clear donor fields).', 'danger');
        return;
      }
      if (!state || state.length < 2) {
        showAlert('Please enter state (or clear donor fields).', 'danger');
        return;
      }
      if (!isValidPincode(pincode)) {
        showAlert('Please enter a valid 6-digit pincode (or clear donor fields).', 'danger');
        return;
      }
      if (latitude === null || isNaN(latitude) || latitude < -90 || latitude > 90) {
        showAlert('Please enter a valid latitude (or clear donor fields).', 'danger');
        return;
      }
      if (longitude === null || isNaN(longitude) || longitude < -180 || longitude > 180) {
        showAlert('Please enter a valid longitude (or clear donor fields).', 'danger');
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
  }

  try {
    // Disable submit button
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Registering...';

    const response = await apiRequest('/api/auth/register', 'POST', requestData);

    if (response.success) {
      // NEW: Check if email verification is required
      if (response.data.requiresEmailVerification) {
        showAlert(response.message, 'success');
        
        // Redirect to email verification page
        setTimeout(() => {
          window.location.href = `verify-email.html?email=${encodeURIComponent(email)}`;
        }, 1500);
        return;
      }

      // OLD FLOW: For backward compatibility (existing users)
      // Store token and user data
      if (window.Session && typeof Session.setSession === 'function') {
        Session.setSession(response.data.token, response.data.user);
      } else {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }

      showAlert('Registration successful! Redirecting...', 'success');

      // Redirect based on role
      setTimeout(() => {
        if (role === 'admin' || role === 'super_admin') {
          window.location.replace('admin-dashboard.html');
          return;
        }

        // For normal users: go to the Home hub with sidebar
        window.location.replace('home.html');
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

// Common JavaScript utilities and API functions

const API_BASE_URL = 'https://lifelink-dmvb.onrender.com';

/**
 * Make API request with authentication
 */
async function apiRequest(endpoint, method = 'GET', data = null) {
  const token = localStorage.getItem('token');
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    }
  };

  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  try {
    console.log(`[API] ${method} ${endpoint}`, data ? data : '');
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const result = await response.json();
    console.log(`[API] Response:`, result);

    if (!response.ok) {
      // Handle specific error codes
      if (response.status === 500) {
        throw new Error('Server error. The database may be temporarily unavailable. Please try again later.');
      } else if (response.status === 401) {
        throw new Error(result.message || 'Invalid credentials. Please check your email and password.');
      } else if (response.status === 400) {
        throw new Error(result.message || 'Invalid request. Please check your input.');
      }
      throw new Error(result.message || 'Request failed');
    }

    return result;
  } catch (error) {
    console.error('[API] Error:', error);
    // Check for network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Unable to connect to server. Please check your internet connection.');
    }
    throw error;
  }
}

/**
 * Show alert message
 */
function showAlert(message, type = 'info') {
  console.log(`[Alert] ${type}: ${message}`);
  const alertContainer = document.getElementById('alertContainer');
  if (!alertContainer) {
    console.warn('[Alert] alertContainer element not found, using browser alert');
    alert(message);
    return;
  }

  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type}`;
  alertDiv.textContent = message;

  alertContainer.innerHTML = '';
  alertContainer.appendChild(alertDiv);

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    alertDiv.remove();
  }, 5000);
}

/**
 * Check if user is authenticated
 */
function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    // Use replace so Back button doesn't return to protected pages
    window.location.replace('login.html');
    return false;
  }
  return true;
}

/**
 * Get user data from localStorage
 */
function getUserData() {
  const userData = localStorage.getItem('user');
  return userData ? JSON.parse(userData) : null;
}

/**
 * Logout function
 */
async function logout() {
  if (confirm('Are you sure you want to logout?')) {
    try {
      // Call logout API (optional - may fail if backend is down)
      await apiRequest('/api/auth/logout', 'POST');
    } catch (error) {
      console.error('Logout API error (continuing with local logout):', error);
    } finally {
      // Clear session using Session manager if available, otherwise clear localStorage directly
      if (window.Session && typeof Session.clearSession === 'function') {
        Session.clearSession();
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      
      // Redirect to login
      window.location.replace('login.html');
    }
  }
}

/**
 * Format date to readable string
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Calculate distance between two points (Haversine formula)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1);
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (10 digits)
 */
function isValidPhone(phone) {
  const phoneRegex = /^[0-9]{10}$/;
  return phoneRegex.test(phone);
}

/**
 * Validate pincode (6 digits)
 */
function isValidPincode(pincode) {
  const pincodeRegex = /^[0-9]{6}$/;
  return pincodeRegex.test(pincode);
}

/**
 * Show loading spinner
 */
function showLoading(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = '<div class="spinner"></div>';
  }
}

/**
 * Hide loading spinner
 */
function hideLoading(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    const spinner = element.querySelector('.spinner');
    if (spinner) {
      spinner.remove();
    }
  }
}

/**
 * Show empty state
 */
function showEmptyState(elementId, message = 'No data available') {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <p>${message}</p>
      </div>
    `;
  }
}

// Donor Dashboard JavaScript

let donorData = null;

// Check authentication on page load
if (!checkAuth()) {
  window.location.href = 'login.html';
}

// Verify donor role
const userData = getUserData();
if (userData.role !== 'donor') {
  alert('Access denied. This page is for donors only.');
  window.location.href = 'login.html';
}

// Load donor data on page load
window.addEventListener('DOMContentLoaded', async () => {
  await loadDonorProfile();
  await loadDonorStats();
  await loadNearbyRequests();
  await loadDonationHistory();
  
  // Set up availability toggle
  setupAvailabilityToggle();
});

/**
 * Load donor profile
 */
async function loadDonorProfile() {
  try {
    const response = await apiRequest('/api/donor/profile', 'GET');
    
    if (response.success) {
      donorData = response.data;
      
      // Update UI
      document.getElementById('userName').textContent = donorData.userId.name;
      document.getElementById('bloodGroup').textContent = donorData.bloodGroup;
      
      // Set availability toggle
      const toggle = document.getElementById('availabilityToggle');
      toggle.checked = donorData.isAvailable;
      updateAvailabilityText(donorData.isAvailable);
    }
  } catch (error) {
    showAlert('Error loading profile: ' + error.message, 'danger');
  }
}

/**
 * Load donor statistics
 */
async function loadDonorStats() {
  try {
    const response = await apiRequest('/api/donor/stats', 'GET');
    
    if (response.success) {
      const stats = response.data;
      
      document.getElementById('totalDonations').textContent = stats.totalDonations;
      document.getElementById('daysSinceLast').textContent = stats.daysSinceLastDonation || 'Never';
      document.getElementById('canDonate').textContent = stats.canDonate ? 'Yes ✓' : 'No (Wait)';
    }
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

/**
 * Load nearby blood requests
 */
async function loadNearbyRequests() {
  const container = document.getElementById('nearbyRequests');
  container.innerHTML = '<div class="spinner"></div>';

  try {
    const response = await apiRequest('/api/donor/nearby-requests', 'GET');
    
    if (response.success && response.data.length > 0) {
      container.innerHTML = response.data.map(request => `
        <div class="request-card ${request.urgency}">
          <div class="request-header">
            <div>
              <span class="blood-group">${request.bloodGroup}</span>
              <span class="badge badge-${request.urgency}">${request.urgency.toUpperCase()}</span>
              <span style="margin-left: 0.5rem; font-size: 0.875rem;">📍 ${request.distance} km away</span>
            </div>
          </div>
          <div class="request-info">
            <div class="info-item">
              <span class="info-label">Hospital</span>
              <span class="info-value">${request.hospitalName}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Patient</span>
              <span class="info-value">${request.patientName}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Units Needed</span>
              <span class="info-value">${request.unitsRequired}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Contact</span>
              <span class="info-value">${request.contactNumber}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Location</span>
              <span class="info-value">${request.city}, ${request.state}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Created</span>
              <span class="info-value">${formatDate(request.createdAt)}</span>
            </div>
          </div>
          ${request.description ? `<p style="margin-top: 0.75rem; font-size: 0.875rem; color: #666;">${request.description}</p>` : ''}
          <button class="btn btn-primary btn-block" style="margin-top: 1rem;" onclick="acceptRequest('${request._id}')">
            Accept Request
          </button>
        </div>
      `).join('');
    } else {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <p>No nearby blood requests at the moment</p>
          <p style="font-size: 0.875rem; color: #666;">Check back later or increase your search radius</p>
        </div>
      `;
    }
  } catch (error) {
    container.innerHTML = '<div class="alert alert-danger">Error loading nearby requests</div>';
  }
}

/**
 * Accept a blood request
 */
async function acceptRequest(requestId) {
  if (!confirm('Are you sure you want to accept this blood request? The receiver will be able to contact you.')) {
    return;
  }

  try {
    const response = await apiRequest(`/api/donor/accept-request/${requestId}`, 'POST');
    
    if (response.success) {
      showAlert('Request accepted successfully! The receiver will contact you soon.', 'success');
      await loadNearbyRequests();
    }
  } catch (error) {
    showAlert(error.message || 'Error accepting request', 'danger');
  }
}

/**
 * Load donation history
 */
async function loadDonationHistory() {
  const container = document.getElementById('donationHistory');
  container.innerHTML = '<div class="spinner"></div>';

  try {
    const response = await apiRequest('/api/donor/history', 'GET');
    
    if (response.success && response.data.length > 0) {
      container.innerHTML = response.data.map(donation => `
        <div class="request-card" style="border-left-color: #28a745;">
          <div class="request-header">
            <div>
              <span class="blood-group">${donation.bloodGroup}</span>
              <span class="badge badge-completed">${donation.status.toUpperCase()}</span>
            </div>
          </div>
          <div class="request-info">
            <div class="info-item">
              <span class="info-label">Hospital</span>
              <span class="info-value">${donation.hospitalName}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Units Donated</span>
              <span class="info-value">${donation.unitsGiven}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Date</span>
              <span class="info-value">${formatDate(donation.donationDate)}</span>
            </div>
          </div>
        </div>
      `).join('');
    } else {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📜</div>
          <p>No donation history yet</p>
          <p style="font-size: 0.875rem; color: #666;">Start accepting blood requests to build your donation history</p>
        </div>
      `;
    }
  } catch (error) {
    container.innerHTML = '<div class="alert alert-danger">Error loading donation history</div>';
  }
}

/**
 * Set up availability toggle
 */
function setupAvailabilityToggle() {
  const toggle = document.getElementById('availabilityToggle');
  
  toggle.addEventListener('change', async function() {
    try {
      const response = await apiRequest('/api/donor/availability', 'PUT');
      
      if (response.success) {
        updateAvailabilityText(response.data.isAvailable);
        showAlert(
          response.data.isAvailable 
            ? 'You are now available for donations' 
            : 'You are now unavailable for donations',
          'success'
        );
      }
    } catch (error) {
      // Revert toggle on error
      toggle.checked = !toggle.checked;
      showAlert('Error updating availability: ' + error.message, 'danger');
    }
  });
}

/**
 * Update availability text
 */
function updateAvailabilityText(isAvailable) {
  const text = document.getElementById('availabilityText');
  text.textContent = isAvailable ? 'Available ✓' : 'Unavailable';
  text.style.color = isAvailable ? '#28a745' : '#dc3545';
  text.style.fontWeight = 'bold';
}

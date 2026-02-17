// Donor Dashboard JavaScript

let donorData = null;

// Check authentication on page load
if (!checkAuth()) {
  window.location.href = 'login.html';
}

// Verify donor role (allow admin/super_admin access for monitoring)
const userData = getUserData();
if (userData.role !== 'donor' && userData.role !== 'admin' && userData.role !== 'super_admin') {
  alert('Access denied. This page is for donors only.');
  window.location.replace('login.html');
}

// Load donor data on page load
window.addEventListener('DOMContentLoaded', async () => {
  const profileLoaded = await loadDonorProfile();
  if (!profileLoaded) {
    // Show create profile prompt instead of rest
    showNoDonorProfilePrompt();
    return;
  }
  await loadDonorStats();
  await loadNearbyRequests();
  await loadDonationHistory();
  
  // Set up availability toggle
  setupAvailabilityToggle();
});

function showNoDonorProfilePrompt() {
  const container = document.querySelector('.container');
  container.innerHTML = `
    <div class="card" style="margin-top:2rem;">
      <div class="card-header">Set Up Donor Profile</div>
      <p>You haven't created a donor profile yet. Fill in the form below to start donating.</p>
      <form id="donorProfileForm" style="margin-top:1rem;">
        <div class="form-group">
          <label class="form-label">Blood Group</label>
          <select id="bloodGroup" class="form-select" required>
            <option value="">Select blood group</option>
            <option value="A+">A+</option><option value="A-">A-</option>
            <option value="B+">B+</option><option value="B-">B-</option>
            <option value="AB+">AB+</option><option value="AB-">AB-</option>
            <option value="O+">O+</option><option value="O-">O-</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Age Group</label>
          <select id="ageGroup" class="form-select" required>
            <option value="">Select age group</option>
            <option value="18-25">18-25</option>
            <option value="26-35">26-35</option>
            <option value="36-45">36-45</option>
            <option value="46-60">46-60</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Address</label><input type="text" id="address" class="form-control" required></div>
        <div class="form-group"><label class="form-label">City</label><input type="text" id="city" class="form-control" required></div>
        <div class="form-group"><label class="form-label">State</label><input type="text" id="state" class="form-control" required></div>
        <div class="form-group"><label class="form-label">Pincode</label><input type="text" id="pincode" class="form-control" required pattern="[0-9]{6}"></div>
        <div class="form-group">
          <label class="form-label">Location</label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
            <input type="number" id="latitude" class="form-control" placeholder="Latitude" step="any" required>
            <input type="number" id="longitude" class="form-control" placeholder="Longitude" step="any" required>
          </div>
          <button type="button" class="btn btn-secondary" style="margin-top:.5rem;" onclick="getGeoLocation()">📍 Get Location</button>
        </div>
        <button type="submit" class="btn btn-primary btn-block">Create Profile</button>
      </form>
    </div>
  `;

  document.getElementById('donorProfileForm').addEventListener('submit', handleCreateDonorProfile);
}

function getGeoLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      document.getElementById('latitude').value = pos.coords.latitude.toFixed(6);
      document.getElementById('longitude').value = pos.coords.longitude.toFixed(6);
    }, () => alert('Unable to get location'));
  }
}

async function handleCreateDonorProfile(e) {
  e.preventDefault();
  const data = {
    bloodGroup: document.getElementById('bloodGroup').value,
    ageGroup: document.getElementById('ageGroup').value,
    address: document.getElementById('address').value,
    city: document.getElementById('city').value,
    state: document.getElementById('state').value,
    pincode: document.getElementById('pincode').value,
    latitude: parseFloat(document.getElementById('latitude').value),
    longitude: parseFloat(document.getElementById('longitude').value)
  };
  try {
    const res = await apiRequest('/api/donor/profile', 'POST', data);
    if (res.success) {
      alert('Donor profile created!');
      location.reload();
    }
  } catch (err) {
    alert('Error creating profile: ' + err.message);
  }
}

/**
 * Load donor profile
 * Returns true if profile exists, false otherwise
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
      return true;
    }
    return false;
  } catch (error) {
    // Profile not found – show prompt
    return false;
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

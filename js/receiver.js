// Receiver Dashboard JavaScript

// Check authentication on page load
if (!checkAuth()) {
  window.location.href = 'login.html';
}

// Verify receiver role
const userData = getUserData();
if (userData.role === 'admin') {
  alert('Access denied. This page is for users only.');
  window.location.replace('login.html');
}

// Load data on page load
window.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('userName').textContent = userData.name;
  await loadReceiverStats();
  await loadMyRequests();
  
  // Set up location button
  setupLocationButton();
  
  // Set up form submission
  document.getElementById('bloodRequestForm').addEventListener('submit', handleCreateRequest);
});

/**
 * Load receiver statistics
 */
async function loadReceiverStats() {
  try {
    const response = await apiRequest('/api/receiver/stats', 'GET');
    
    if (response.success) {
      const stats = response.data;
      document.getElementById('totalRequests').textContent = stats.totalRequests;
      document.getElementById('pendingRequests').textContent = stats.pendingRequests;
      document.getElementById('completedRequests').textContent = stats.completedRequests;
    }
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

/**
 * Load my blood requests
 */
async function loadMyRequests() {
  const container = document.getElementById('myRequests');
  container.innerHTML = '<div class="spinner"></div>';

  try {
    const response = await apiRequest('/api/receiver/my-requests', 'GET');
    
    if (response.success && response.data.length > 0) {
      container.innerHTML = response.data.map(request => {
        const interestedDonorsCount = request.interestedDonors.length;
        
        return `
          <div class="request-card ${request.urgency}">
            <div class="request-header">
              <div>
                <span class="blood-group">${request.bloodGroup}</span>
                <span class="badge badge-${request.urgency}">${request.urgency.toUpperCase()}</span>
                <span class="badge badge-${request.status}">${request.status.toUpperCase()}</span>
                ${request.isFake ? '<span class="badge" style="background-color: #dc3545; color: white;">FLAGGED</span>' : ''}
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
                <span class="info-label">Units</span>
                <span class="info-value">${request.unitsRequired}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Interested Donors</span>
                <span class="info-value">${interestedDonorsCount}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Created</span>
                <span class="info-value">${formatDate(request.createdAt)}</span>
              </div>
            </div>
            
            ${interestedDonorsCount > 0 ? `
              <div style="margin-top: 1rem;">
                <strong>Interested Donors:</strong>
                <div style="margin-top: 0.5rem;">
                  ${request.interestedDonors.map(donor => `
                    <div style="background-color: #f8f9fa; padding: 0.75rem; margin-bottom: 0.5rem; border-radius: 8px;">
                      <strong>${donor.donorId.userId.name}</strong><br>
                      Phone: ${donor.donorId.userId.phone}<br>
                      Blood Group: ${donor.donorId.bloodGroup}<br>
                      ${request.status === 'pending' ? `
                        <button class="btn btn-success" style="margin-top: 0.5rem;" onclick="acceptDonor('${request._id}', '${donor.donorId._id}')">
                          Accept This Donor
                        </button>
                      ` : ''}
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 1rem;">
              ${request.status === 'approved' ? `
                <button class="btn btn-success" onclick="completeRequest('${request._id}')">Mark as Completed</button>
              ` : ''}
              ${request.status === 'pending' || request.status === 'approved' ? `
                <button class="btn btn-danger" onclick="cancelRequest('${request._id}')">Cancel Request</button>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
    } else {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <p>No blood requests yet</p>
          <p style="font-size: 0.875rem; color: #666;">Create a new request to find nearby donors</p>
        </div>
      `;
    }
  } catch (error) {
    container.innerHTML = '<div class="alert alert-danger">Error loading requests</div>';
  }
}

/**
 * Show create request form
 */
function showCreateRequestForm() {
  document.getElementById('createRequestForm').classList.remove('hidden');
  window.scrollTo({ top: document.getElementById('createRequestForm').offsetTop - 20, behavior: 'smooth' });
}

/**
 * Hide create request form
 */
function hideCreateRequestForm() {
  document.getElementById('createRequestForm').classList.add('hidden');
  document.getElementById('bloodRequestForm').reset();
}

/**
 * Set up location button
 */
function setupLocationButton() {
  document.getElementById('getLocationBtn').addEventListener('click', function() {
    if (navigator.geolocation) {
      this.textContent = '📍 Getting location...';
      this.disabled = true;
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          document.getElementById('latitude').value = position.coords.latitude.toFixed(6);
          document.getElementById('longitude').value = position.coords.longitude.toFixed(6);
          this.textContent = '✓ Location obtained';
          setTimeout(() => {
            this.textContent = '📍 Get My Location';
            this.disabled = false;
          }, 2000);
        },
        (error) => {
          showAlert('Unable to get location. Please enter manually.', 'danger');
          this.textContent = '📍 Get My Location';
          this.disabled = false;
        }
      );
    } else {
      showAlert('Geolocation is not supported by your browser', 'danger');
    }
  });
}

/**
 * Handle create blood request
 */
async function handleCreateRequest(event) {
  event.preventDefault();

  const requestData = {
    bloodGroup: document.getElementById('bloodGroup').value,
    urgency: document.getElementById('urgency').value,
    unitsRequired: parseInt(document.getElementById('unitsRequired').value),
    patientName: document.getElementById('patientName').value.trim(),
    hospitalName: document.getElementById('hospitalName').value.trim(),
    contactNumber: document.getElementById('contactNumber').value.trim(),
    address: document.getElementById('address').value.trim(),
    city: document.getElementById('city').value.trim(),
    state: document.getElementById('state').value.trim(),
    pincode: document.getElementById('pincode').value.trim(),
    latitude: parseFloat(document.getElementById('latitude').value),
    longitude: parseFloat(document.getElementById('longitude').value),
    description: document.getElementById('description').value.trim()
  };

  try {
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating Request...';

    const response = await apiRequest('/api/receiver/request', 'POST', requestData);

    if (response.success) {
      showAlert('Blood request created successfully!', 'success');
      hideCreateRequestForm();
      await loadMyRequests();
      await loadReceiverStats();
    }
  } catch (error) {
    showAlert(error.message || 'Error creating request', 'danger');
  } finally {
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Request';
  }
}

/**
 * Accept a donor
 */
async function acceptDonor(requestId, donorId) {
  if (!confirm('Are you sure you want to accept this donor? This will mark the request as approved.')) {
    return;
  }

  try {
    const response = await apiRequest(`/api/receiver/request/${requestId}/accept-donor/${donorId}`, 'PUT');

    if (response.success) {
      showAlert('Donor accepted successfully!', 'success');
      await loadMyRequests();
      await loadReceiverStats();
    }
  } catch (error) {
    showAlert(error.message || 'Error accepting donor', 'danger');
  }
}

/**
 * Complete a request
 */
async function completeRequest(requestId) {
  if (!confirm('Are you sure you want to mark this request as completed?')) {
    return;
  }

  try {
    const response = await apiRequest(`/api/receiver/request/${requestId}/complete`, 'PUT');

    if (response.success) {
      showAlert('Request marked as completed!', 'success');
      await loadMyRequests();
      await loadReceiverStats();
    }
  } catch (error) {
    showAlert(error.message || 'Error completing request', 'danger');
  }
}

/**
 * Cancel a request
 */
async function cancelRequest(requestId) {
  if (!confirm('Are you sure you want to cancel this request?')) {
    return;
  }

  try {
    const response = await apiRequest(`/api/receiver/request/${requestId}/cancel`, 'PUT');

    if (response.success) {
      showAlert('Request cancelled successfully', 'success');
      await loadMyRequests();
      await loadReceiverStats();
    }
  } catch (error) {
    showAlert(error.message || 'Error cancelling request', 'danger');
  }
}

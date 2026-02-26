// Receiver Dashboard JavaScript

// Check authentication on page load
if (!checkAuth()) {
  window.location.href = 'login.html';
}

// Verify receiver role (allow user, receiver, admin, and super_admin access)
const userData = getUserData();
if (!userData || !userData.role) {
  console.error('[Receiver] No user data or role found');
  alert('Session error. Please login again.');
  localStorage.clear();
  window.location.replace('login.html');
}

// Normalize role (trim and lowercase for comparison)
const userRole = (userData.role || '').trim().toLowerCase();
const allowedRoles = ['user', 'receiver', 'admin', 'super_admin'];

console.log(`[Receiver] User role: "${userData.role}" (normalized: "${userRole}")`);

if (!allowedRoles.includes(userRole)) {
  console.error(`[Receiver] Access denied - role "${userData.role}" not in allowed roles:`, allowedRoles);
  alert(`Access denied. Your account role is "${userData.role}". This page requires: receiver, user, admin, or super_admin. Please contact support if this is incorrect.`);
  window.location.replace('home.html');
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
        const locationFlags = request.locationFlags || [];
        const locationSeverity = request.locationSeverity || 0;
        
        // Location flag badges
        const flagBadges = locationFlags.map(flag => {
          const flagIcons = {
            location_jump: '📍',
            impossible_travel: '✈️',
            rapid_requests: '⚡',
            different_ip: '🌐',
            vpn_detected: '🔒'
          };
          const flagLabels = {
            location_jump: 'Location Jump',
            impossible_travel: 'Impossible Travel',
            rapid_requests: 'Rapid Requests',
            different_ip: 'Different IP',
            vpn_detected: 'VPN'
          };
          return `<span class="badge" style="background-color: #f59e0b; color: white; font-size: 10px; margin: 2px;">${flagIcons[flag] || '🚩'} ${flagLabels[flag] || flag}</span>`;
        }).join('');
        
        // Severity badge
        const severityColor = locationSeverity >= 70 ? '#dc2626' : (locationSeverity >= 30 ? '#f59e0b' : '');
        const showSeverity = locationSeverity >= 30;
        
        return `
          <div class="request-card ${request.urgency}">
            <div class="request-header">
              <div>
                <span class="blood-group">${request.bloodGroup}</span>
                <span class="badge badge-${request.urgency}">${request.urgency.toUpperCase()}</span>
                <span class="badge badge-${request.status}">${request.status.toUpperCase()}</span>
                ${request.isFake || request.status === 'flagged' ? '<span class="badge" style="background-color: #dc3545; color: white;">FLAGGED</span>' : ''}
                ${request.status === 'review' ? '<span class="badge" style="background-color: #f59e0b; color: white;">UNDER REVIEW</span>' : ''}
                ${showSeverity ? `<span class="badge" style="background-color: ${severityColor}; color: white;">⚠️ ${locationSeverity}%</span>` : ''}
              </div>
            </div>
            ${flagBadges ? `<div style="margin: 8px 0;">${flagBadges}</div>` : ''}
            ${request.status === 'review' || request.status === 'flagged' ? `
              <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin-bottom: 12px; border-radius: 4px;">
                <strong>⏳ Manual Review Required:</strong> This request is under admin review due to unusual patterns detected by our fraud prevention system. This helps maintain platform integrity. You'll be notified once reviewed.
              </div>
            ` : ''}
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
 * Set up location button with improved error handling
 */
function setupLocationButton() {
  const btn = document.getElementById('getLocationBtn');
  if (!btn) return;
  
  btn.addEventListener('click', function() {
    // Check if running on HTTPS (required for geolocation)
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      showAlert('Geolocation requires HTTPS. Please enter location manually or use a secure connection.', 'warning');
      return;
    }
    
    if (navigator.geolocation) {
      this.textContent = '📍 Getting location...';
      this.disabled = true;
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          document.getElementById('latitude').value = position.coords.latitude.toFixed(6);
          document.getElementById('longitude').value = position.coords.longitude.toFixed(6);
          this.textContent = '✓ Location obtained';
          showAlert('Location captured successfully!', 'success');
          setTimeout(() => {
            this.textContent = '📍 Get My Location';
            this.disabled = false;
          }, 2000);
        },
        (error) => {
          let errorMsg = 'Unable to get location. ';
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMsg += 'Please allow location access in your browser settings.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMsg += 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              errorMsg += 'Location request timed out.';
              break;
            default:
              errorMsg += 'Please enter manually.';
          }
          showAlert(errorMsg, 'danger');
          this.textContent = '📍 Get My Location';
          this.disabled = false;
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    } else {
      showAlert('Geolocation is not supported by your browser. Please enter coordinates manually.', 'danger');
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
      // Check for warnings/flagged status
      if (response.needsReview || response.severity >= 70) {
        // High severity - show detailed warning modal
        showLocationWarningModal(response);
      } else if (response.warning || response.severity >= 30) {
        // Medium severity - show warning alert
        showAlert(`⚠️ ${response.message}`, 'warning');
        if (response.reasons && response.reasons.length > 0) {
          const reasonsHtml = `
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin-top: 10px; border-radius: 4px;">
              <strong>⚠️ Unusual Patterns Detected:</strong>
              <ul style="margin: 8px 0; padding-left: 20px; font-size: 14px;">
                ${response.reasons.map(reason => `<li>${reason}</li>`).join('')}
              </ul>
              <p style="margin: 8px 0; font-size: 13px; color: #856404;">
                Your request will undergo additional verification. This helps us maintain the integrity of our platform.
              </p>
            </div>
          `;
          document.getElementById('alertContainer').innerHTML += reasonsHtml;
        }
      } else {
        // Normal - show success
        showAlert('Blood request created successfully! Our AI is finding the best donors for you. 🤖', 'success');
      }
      
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
 * Show location warning modal for high-severity requests
 */
function showLocationWarningModal(response) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 20px;
  `;
  
  const severityColor = response.severity >= 80 ? '#dc2626' : '#f59e0b';
  const severityLabel = response.severity >= 80 ? 'HIGH RISK' : 'MEDIUM RISK';
  
  modal.innerHTML = `
    <div style="background: white; border-radius: 12px; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);">
      <div style="background: linear-gradient(135deg, ${severityColor} 0%, #991b1b 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <div>
            <h2 style="margin: 0; font-size: 24px; color: white;">🚨 Manual Review Required</h2>
            <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">Your request has been flagged for verification</p>
          </div>
          <button onclick="this.closest('div[style*=fixed]').remove()" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 24px; cursor: pointer; padding: 4px 12px; border-radius: 4px;">×</button>
        </div>
        <div style="margin-top: 12px; background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px; display: inline-block;">
          <strong>Severity: ${response.severity}% - ${severityLabel}</strong>
        </div>
      </div>
      
      <div style="padding: 24px;">
        <div style="background: #fee2e2; border-left: 4px solid ${severityColor}; padding: 16px; border-radius: 4px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 15px; line-height: 1.6;"><strong>${response.message}</strong></p>
        </div>
        
        ${response.reasons && response.reasons.length > 0 ? `
          <div style="margin-bottom: 20px;">
            <h3 style="font-size: 16px; margin: 0 0 12px 0; color: #333;">📊 Detected Patterns:</h3>
            <ul style="margin: 0; padding-left: 20px; color: #666;">
              ${response.reasons.map(reason => `<li style="margin-bottom: 8px;">${reason}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="font-size: 16px; margin: 0 0 8px 0; color: #333;">⏱️ What Happens Next?</h3>
          <ol style="margin: 0; padding-left: 20px; color: #666; font-size: 14px; line-height: 1.8;">
            <li>Your request has been submitted and saved</li>
            <li>Our admin team will review it within a few hours</li>
            <li>You'll be notified once the review is complete</li>
            <li>If approved, AI matching will begin automatically</li>
          </ol>
        </div>
        
        <div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 16px; border-radius: 4px; margin-bottom: 20px;">
          <h3 style="font-size: 14px; margin: 0 0 8px 0; color: #1976d2;">💡 Why this happens:</h3>
          <p style="margin: 0; font-size: 13px; color: #666; line-height: 1.6;">
            Our location-based fraud detection system helps protect the integrity of blood donation by detecting unusual patterns. 
            This is a precautionary measure and doesn't mean your request is invalid. Genuine requests are quickly approved after a brief review.
          </p>
        </div>
        
        <div style="display: flex; gap: 12px;">
          <button onclick="this.closest('div[style*=fixed]').remove()" style="flex: 1; background: ${severityColor}; color: white; border: none; padding: 12px; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: 500;">
            I Understand
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
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

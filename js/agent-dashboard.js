/**
 * Agentic AI Dashboard
 * Admin interface for viewing and managing AI agent states
 */

const API_URL = 'http://localhost:5000/api';
let currentPage = 1;
let currentRequestId = null;
let performanceChart = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadPerformanceMetrics();
    loadAgentStates();
    setupEventListeners();
});

// Check authentication
function checkAuth() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    // Allow admin and super_admin access
    if (!user.token || (user.role !== 'admin' && user.role !== 'super_admin')) {
        window.location.href = 'login.html';
        return;
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('refreshBtn')?.addEventListener('click', () => {
        loadPerformanceMetrics();
        loadAgentStates();
    });

    document.getElementById('applyFilters')?.addEventListener('click', () => {
        currentPage = 1;
        loadAgentStates();
    });

    document.getElementById('escalateBtn')?.addEventListener('click', () => {
        if (currentRequestId) {
            triggerEscalation(currentRequestId);
        }
    });
}

// Load performance metrics
async function loadPerformanceMetrics() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        const days = document.getElementById('filterDays')?.value || 30;

        const response = await fetch(`${API_URL}/agent/performance?days=${days}`, {
            headers: {
                'Authorization': `Bearer ${user.token}`
            }
        });

        if (!response.ok) {
            console.log('Performance metrics not available');
            return;
        }

        const result = await response.json();
        
        if (result.success && result.data) {
            updateMetricsDisplay(result.data);
        }
    } catch (error) {
        console.error('Error loading metrics:', error);
    }
}

// Update metrics display
function updateMetricsDisplay(data) {
    if (data.dataPoints === 0) {
        document.getElementById('totalRequests').textContent = '0';
        document.getElementById('matchRate').textContent = '0%';
        document.getElementById('avgResponseTime').textContent = '0m';
        document.getElementById('predictionAccuracy').textContent = '0%';
        return;
    }

    document.getElementById('totalRequests').textContent = data.totalRequests || 0;
    document.getElementById('matchRate').textContent = 
        (data.overallMatchRate || 0).toFixed(1) + '%';
    document.getElementById('avgResponseTime').textContent = 
        Math.round(data.avgResponseTime || 0) + 'm';
    document.getElementById('predictionAccuracy').textContent = 
        (data.avgPredictionAccuracy || 0).toFixed(1) + '%';
}

// Load agent states
async function loadAgentStates(page = 1) {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        const strategy = document.getElementById('filterStrategy')?.value || '';
        const urgency = document.getElementById('filterUrgency')?.value || '';
        
        showLoading();

        const response = await fetch(
            `${API_URL}/agent/states?page=${page}&limit=10`, 
            {
                headers: {
                    'Authorization': `Bearer ${user.token}`
                }
            }
        );

        if (!response.ok) {
            throw new Error('Failed to load agent states');
        }

        const result = await response.json();

        if (result.success) {
            let states = result.data || [];
            
            // Apply filters
            if (strategy) {
                states = states.filter(s => s.decision?.strategyType === strategy);
            }
            if (urgency) {
                states = states.filter(s => s.observation?.urgency === urgency);
            }

            displayAgentStates(states);
            displayPagination(result.pagination);
        } else {
            showEmpty();
        }
    } catch (error) {
        console.error('Error loading agent states:', error);
        showEmpty();
    }
}

// Show loading state
function showLoading() {
    document.getElementById('loadingSpinner').style.display = 'block';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('agentStatesList').innerHTML = '';
    document.getElementById('paginationNav').style.display = 'none';
}

// Show empty state
function showEmpty() {
    document.getElementById('loadingSpinner').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('agentStatesList').innerHTML = '';
    document.getElementById('paginationNav').style.display = 'none';
}

// Display agent states
function displayAgentStates(states) {
    const container = document.getElementById('agentStatesList');
    document.getElementById('loadingSpinner').style.display = 'none';

    if (!states || states.length === 0) {
        showEmpty();
        return;
    }

    document.getElementById('emptyState').style.display = 'none';
    
    container.innerHTML = states.map(state => createAgentStateCard(state)).join('');

    // Add click listeners
    states.forEach(state => {
        const card = document.getElementById(`state-${state._id}`);
        if (card) {
            card.addEventListener('click', () => showAgentStateDetails(state._id));
        }
    });
}

// Create agent state card
function createAgentStateCard(state) {
    const request = state.requestId || {};
    const observation = state.observation || {};
    const decision = state.decision || {};
    const execution = state.execution || {};
    const learning = state.learning || {};
    
    const strategyType = decision.strategyType || 'unknown';
    const urgency = observation.urgency || 'normal';
    const matched = learning.finalOutcome?.matched || false;
    const createdAt = new Date(state.createdAt).toLocaleString();

    const topDonors = decision.rankedDonors?.slice(0, 3) || [];
    
    return `
        <div class="agent-state-card" id="state-${state._id}" style="cursor: pointer;">
            <div class="row align-items-center">
                <div class="col-md-8">
                    <div class="d-flex align-items-center mb-2">
                        <h6 class="mb-0 me-3">
                            ${request.hospitalName || 'Unknown Hospital'}
                        </h6>
                        <span class="badge bg-${getUrgencyColor(urgency)} me-2">
                            ${urgency.toUpperCase()}
                        </span>
                        <span class="strategy-badge strategy-${strategyType}">
                            ${strategyType.toUpperCase()}
                        </span>
                        ${matched ? '<span class="badge bg-success ms-2">✓ MATCHED</span>' : 
                                   '<span class="badge bg-secondary ms-2">PENDING</span>'}
                    </div>
                    <div class="text-muted small">
                        <i class="bi bi-droplet-fill"></i> ${request.bloodGroup || 'N/A'} • 
                        <i class="bi bi-geo-alt-fill"></i> ${observation.city || 'N/A'} • 
                        <i class="bi bi-people-fill"></i> ${decision.rankedDonors?.length || 0} donors scored • 
                        <i class="bi bi-clock-fill"></i> ${createdAt}
                    </div>
                    ${topDonors.length > 0 ? `
                    <div class="mt-2">
                        <small class="text-muted">Top Donors: </small>
                        ${topDonors.map((d, i) => `
                            <span class="prediction-badge me-1">
                                #${i + 1}: Score ${d.score?.toFixed(1) || 0}
                            </span>
                        `).join('')}
                    </div>
                    ` : ''}
                </div>
                <div class="col-md-4 text-end">
                    <div class="mb-2">
                        <strong class="text-primary" style="font-size: 1.5rem;">
                            ${execution.notificationsSent || 0}
                        </strong>
                        <div class="small text-muted">Notifications Sent</div>
                    </div>
                    <div class="mb-2">
                        <strong class="text-success">
                            ${learning.donorResponses?.length || 0}
                        </strong>
                        <span class="small text-muted">Responses</span>
                    </div>
                    <button class="btn btn-sm btn-outline-primary mt-2">
                        <i class="bi bi-eye"></i> View Details
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Get urgency color
function getUrgencyColor(urgency) {
    const colors = {
        'critical': 'danger',
        'urgent': 'warning',
        'normal': 'success'
    };
    return colors[urgency] || 'secondary';
}

// Display pagination
function displayPagination(pagination) {
    if (!pagination || pagination.pages <= 1) {
        document.getElementById('paginationNav').style.display = 'none';
        return;
    }

    document.getElementById('paginationNav').style.display = 'block';
    const paginationEl = document.getElementById('pagination');
    const { page, pages } = pagination;

    let html = '';

    // Previous button
    html += `
        <li class="page-item ${page === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="loadAgentStates(${page - 1}); return false;">
                Previous
            </a>
        </li>
    `;

    // Page numbers
    for (let i = 1; i <= pages; i++) {
        if (i === 1 || i === pages || (i >= page - 2 && i <= page + 2)) {
            html += `
                <li class="page-item ${i === page ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="loadAgentStates(${i}); return false;">
                        ${i}
                    </a>
                </li>
            `;
        } else if (i === page - 3 || i === page + 3) {
            html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
    }

    // Next button
    html += `
        <li class="page-item ${page === pages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="loadAgentStates(${page + 1}); return false;">
                Next
            </a>
        </li>
    `;

    paginationEl.innerHTML = html;
}

// Show agent state details in modal
async function showAgentStateDetails(stateId) {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        
        // Find the state from current list or fetch it
        const response = await fetch(`${API_URL}/agent/states`, {
            headers: { 'Authorization': `Bearer ${user.token}` }
        });

        const result = await response.json();
        const state = result.data.find(s => s._id === stateId);

        if (!state) {
            alert('Agent state not found');
            return;
        }

        currentRequestId = state.requestId?._id || null;
        
        const modalContent = createDetailedView(state);
        document.getElementById('modalContent').innerHTML = modalContent;
        
        // Show escalate button if request is not matched
        const escalateBtn = document.getElementById('escalateBtn');
        if (escalateBtn && !state.learning?.finalOutcome?.matched) {
            escalateBtn.style.display = 'inline-block';
        } else if (escalateBtn) {
            escalateBtn.style.display = 'none';
        }

        const modal = new bootstrap.Modal(document.getElementById('agentStateModal'));
        modal.show();
    } catch (error) {
        console.error('Error loading state details:', error);
        alert('Error loading details');
    }
}

// Create detailed view
function createDetailedView(state) {
    const observation = state.observation || {};
    const decision = state.decision || {};
    const plan = state.plan || {};
    const execution = state.execution || {};
    const learning = state.learning || {};
    const request = state.requestId || {};

    let html = `
        <!-- Request Overview -->
        <div class="card mb-3">
            <div class="card-header bg-primary text-white">
                <h6 class="mb-0"><i class="bi bi-info-circle"></i> Request Overview</h6>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>Blood Group:</strong> ${request.bloodGroup || 'N/A'}</p>
                        <p><strong>Hospital:</strong> ${observation.hospitalName || 'N/A'}</p>
                        <p><strong>City:</strong> ${observation.city || 'N/A'}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Urgency:</strong> 
                            <span class="badge bg-${getUrgencyColor(observation.urgency)}">
                                ${(observation.urgency || 'normal').toUpperCase()}
                            </span>
                        </p>
                        <p><strong>Units Required:</strong> ${observation.unitsRequired || 'N/A'}</p>
                        <p><strong>Time:</strong> ${new Date(observation.timeOfRequest).toLocaleString()}</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Observation -->
        <div class="card mb-3">
            <div class="card-header" style="background: #667eea; color: white;">
                <h6 class="mb-0">👁️ OBSERVE - System State</h6>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-4">
                        <p><strong>Available Donors:</strong> ${observation.totalAvailableDonors || 0}</p>
                        <p><strong>Eligible:</strong> ${observation.eligibleDonors || 0}</p>
                    </div>
                    <div class="col-md-4">
                        <p><strong>Time of Day:</strong> ${observation.timeOfDay || 'N/A'}</p>
                        <p><strong>Weekend:</strong> ${observation.isWeekend ? 'Yes' : 'No'}</p>
                    </div>
                    <div class="col-md-4">
                        <p><strong>Active Requests:</strong> ${observation.activeRequestsCount || 0}</p>
                        <p><strong>Recent (24h):</strong> ${observation.recentRequestsLast24h || 0}</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Decision -->
        <div class="card mb-3">
            <div class="card-header" style="background: #764ba2; color: white;">
                <h6 class="mb-0">🧠 DECIDE - AI Scoring & Strategy</h6>
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <strong>Strategy Selected:</strong> 
                    <span class="strategy-badge strategy-${decision.strategyType}">
                        ${(decision.strategyType || 'unknown').toUpperCase()}
                    </span>
                </div>
                <div class="mb-3">
                    <strong>AI Reasoning:</strong>
                    <p class="text-muted">${decision.mlRecommendation?.reasoning || 'N/A'}</p>
                </div>
                <h6 class="mt-4">Top Scored Donors:</h6>
                ${createDonorScores(decision.rankedDonors?.slice(0, 5) || [])}
            </div>
        </div>

        <!-- Plan -->
        <div class="card mb-3">
            <div class="card-header" style="background: #f093fb; color: white;">
                <h6 class="mb-0">📋 PLAN - Execution Strategy</h6>
            </div>
            <div class="card-body">
                <p><strong>Response Window:</strong> ${plan.responseWindow || 0} minutes</p>
                <p><strong>Escalation:</strong> ${plan.escalationPlan?.enabled ? 'Enabled' : 'Disabled'}</p>
                ${createPlanTimeline(plan.steps || [])}
            </div>
        </div>

        <!-- Execution -->
        <div class="card mb-3">
            <div class="card-header" style="background: #4facfe; color: white;">
                <h6 class="mb-0">⚡ ACT - Execution Results</h6>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-4">
                        <h4 class="text-primary">${execution.notificationsSent || 0}</h4>
                        <p class="text-muted">Notifications Sent</p>
                    </div>
                    <div class="col-md-4">
                        <h4 class="text-success">${execution.chatSessionsOpened || 0}</h4>
                        <p class="text-muted">Chats Opened</p>
                    </div>
                    <div class="col-md-4">
                        <h4 class="text-info">${execution.donorsContacted?.length || 0}</h4>
                        <p class="text-muted">Donors Contacted</p>
                    </div>
                </div>
                <p><strong>Status:</strong> ${execution.status || 'N/A'}</p>
            </div>
        </div>

        <!-- Learning -->
        <div class="card mb-3">
            <div class="card-header" style="background: #43e97b; color: white;">
                <h6 class="mb-0">📚 LEARN - Performance & Feedback</h6>
            </div>
            <div class="card-body">
                ${learning.performanceMetrics ? `
                <div class="row mb-3">
                    <div class="col-md-3">
                        <strong>Response Rate:</strong>
                        <h5 class="text-primary">${learning.performanceMetrics.responseRate || 0}%</h5>
                    </div>
                    <div class="col-md-3">
                        <strong>Success Rate:</strong>
                        <h5 class="text-success">${learning.performanceMetrics.successRate || 0}%</h5>
                    </div>
                    <div class="col-md-3">
                        <strong>Avg Response:</strong>
                        <h5 class="text-info">${learning.performanceMetrics.avgResponseTime || 0}m</h5>
                    </div>
                    <div class="col-md-3">
                        <strong>Accuracy:</strong>
                        <h5 class="text-warning">${learning.performanceMetrics.predictionAccuracy || 0}%</h5>
                    </div>
                </div>
                ` : '<p class="text-muted">No performance data yet</p>'}

                ${learning.donorResponses?.length > 0 ? `
                    <h6 class="mt-3">Donor Responses:</h6>
                    ${createResponsesTimeline(learning.donorResponses)}
                ` : ''}

                ${learning.finalOutcome?.matched ? `
                    <div class="alert alert-success mt-3">
                        <strong>✓ Match Successful!</strong><br>
                        Completed in ${learning.finalOutcome.totalTimeMinutes} minutes
                    </div>
                ` : ''}
            </div>
        </div>
    `;

    return html;
}

// Create donor scores display
function createDonorScores(donors) {
    if (!donors || donors.length === 0) {
        return '<p class="text-muted">No donor scores available</p>';
    }

    return donors.map((donor, index) => `
        <div class="donor-score-card">
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <strong>Donor #${index + 1}</strong>
                    <span class="ms-2 text-muted small">${donor.reason || ''}</span>
                </div>
                <span class="badge bg-success" style="font-size: 1rem;">
                    Score: ${(donor.score || 0).toFixed(1)}
                </span>
            </div>
            <div class="score-breakdown mt-2">
                ${donor.scoreBreakdown ? Object.entries(donor.scoreBreakdown)
                    .filter(([key]) => key !== 'total' && key !== 'confidence')
                    .map(([key, value]) => `
                        <div class="score-item">
                            <strong>${value.toFixed(0)}</strong>
                            <div class="text-muted">${key.replace(/_/g, ' ')}</div>
                        </div>
                    `).join('') : ''}
            </div>
            ${donor.responseTimePrediction ? `
                <div class="mt-2">
                    <small class="text-muted">
                        Predicted response: ${donor.responseTimePrediction} min • 
                        Success probability: ${((donor.successProbability || 0) * 100).toFixed(0)}%
                    </small>
                </div>
            ` : ''}
        </div>
    `).join('');
}

// Create plan timeline
function createPlanTimeline(steps) {
    if (!steps || steps.length === 0) {
        return '<p class="text-muted">No plan steps</p>';
    }

    return `
        <div class="timeline mt-3">
            ${steps.map((step, index) => `
                <div class="timeline-item">
                    <strong>Step ${step.stepNumber}: ${step.action}</strong>
                    <div class="text-muted small">
                        Targets: ${step.targetDonors?.length || 0} donors • 
                        Status: ${step.status || 'pending'}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Create responses timeline
function createResponsesTimeline(responses) {
    return `
        <div class="timeline mt-2">
            ${responses.map(r => `
                <div class="timeline-item">
                    <strong>${r.accepted ? '✓ Accepted' : '✗ Rejected'}</strong>
                    <div class="text-muted small">
                        Response time: ${r.responseTimeMinutes.toFixed(1)} min
                        ${r.rejectionReason ? ` • Reason: ${r.rejectionReason}` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Trigger escalation
async function triggerEscalation(requestId) {
    if (!confirm('Are you sure you want to manually trigger escalation for this request?')) {
        return;
    }

    try {
        const user = JSON.parse(localStorage.getItem('user'));
        
        const response = await fetch(`${API_URL}/agent/request/${requestId}/escalate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${user.token}`,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (result.success) {
            alert('Escalation triggered successfully!');
            bootstrap.Modal.getInstance(document.getElementById('agentStateModal')).hide();
            loadAgentStates(currentPage);
        } else {
            alert('Failed to trigger escalation: ' + result.message);
        }
    } catch (error) {
        console.error('Error triggering escalation:', error);
        alert('Error triggering escalation');
    }
}

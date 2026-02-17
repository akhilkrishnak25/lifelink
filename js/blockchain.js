/**
 * Blockchain Records Manager
 * Interface for viewing and managing blockchain security records
 */

const API_URL = 'http://localhost:5000/api';
let currentRecords = [];
let currentTxHash = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadBlockchainRecords();
    loadTrustScore();
    setupEventListeners();
});

// Check authentication
function checkAuth() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.token) {
        window.location.href = 'login.html';
        return;
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('refreshBtn')?.addEventListener('click', () => {
        loadBlockchainRecords();
        loadTrustScore();
    });

    document.getElementById('applyFilters')?.addEventListener('click', () => {
        filterRecords();
    });

    document.getElementById('createRecordBtn')?.addEventListener('click', () => {
        showCreateRecordModal();
    });

    document.getElementById('recordType')?.addEventListener('change', (e) => {
        toggleRecordFields(e.target.value);
    });

    document.getElementById('submitRecord')?.addEventListener('click', () => {
        createBlockchainRecord();
    });

    document.getElementById('verifyTxBtn')?.addEventListener('click', () => {
        if (currentTxHash) {
            verifyTransaction(currentTxHash);
        }
    });
}

// Load blockchain records
async function loadBlockchainRecords() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        
        showLoading();

        const response = await fetch(`${API_URL}/blockchain/records?limit=100`, {
            headers: {
                'Authorization': `Bearer ${user.token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load records');
        }

        const result = await response.json();

        if (result.success) {
            currentRecords = result.data || [];
            updateStatistics(currentRecords);
            displayRecords(currentRecords);
        } else {
            showEmpty();
        }
    } catch (error) {
        console.error('Error loading blockchain records:', error);
        showEmpty();
    }
}

// Update statistics
function updateStatistics(records) {
    const total = records.length;
    const confirmed = records.filter(r => r.status === 'confirmed').length;
    const pending = records.filter(r => r.status === 'pending').length;

    document.getElementById('totalRecords').textContent = total;
    document.getElementById('confirmedRecords').textContent = confirmed;
    document.getElementById('pendingRecords').textContent = pending;
}

// Load trust score
async function loadTrustScore() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        
        const response = await fetch(`${API_URL}/blockchain/trust-score/${user.userId}`, {
            headers: {
                'Authorization': `Bearer ${user.token}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
                document.getElementById('trustScore').textContent = result.data.score || 0;
            }
        }
    } catch (error) {
        console.error('Error loading trust score:', error);
    }
}

// Show loading state
function showLoading() {
    document.getElementById('loadingSpinner').style.display = 'block';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('recordsList').innerHTML = '';
}

// Show empty state
function showEmpty() {
    document.getElementById('loadingSpinner').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('recordsList').innerHTML = '';
}

// Display records
function displayRecords(records) {
    const container = document.getElementById('recordsList');
    document.getElementById('loadingSpinner').style.display = 'none';

    if (!records || records.length === 0) {
        showEmpty();
        return;
    }

    document.getElementById('emptyState').style.display = 'none';

    container.innerHTML = records.map(record => createRecordCard(record)).join('');

    // Add click listeners
    records.forEach(record => {
        const card = document.getElementById(`record-${record._id}`);
        if (card) {
            card.addEventListener('click', () => showRecordDetails(record));
        }

        // Copy buttons
        const copyBtn = card?.querySelector('.copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                copyToClipboard(record.transactionHash);
            });
        }
    });
}

// Create record card
function createRecordCard(record) {
    const date = new Date(record.timestamp || record.createdAt).toLocaleString();
    const statusClass = `status-${record.status}`;
    const actionText = formatAction(record.action);

    return `
        <div class="record-card" id="record-${record._id}" style="cursor: pointer;">
            <div class="row align-items-center">
                <div class="col-md-8">
                    <div class="d-flex align-items-center mb-2">
                        <span class="action-badge me-2">${actionText}</span>
                        <span class="${statusClass}">${record.status.toUpperCase()}</span>
                        <span class="chain-badge ms-2">${record.chain.toUpperCase()}</span>
                    </div>
                    <div class="hash-display mb-2">
                        <strong>TX Hash:</strong> ${truncateHash(record.transactionHash)}
                        <i class="bi bi-clipboard copy-btn ms-2" title="Copy hash"></i>
                    </div>
                    ${record.payloadHash ? `
                        <div class="text-muted small">
                            <strong>Payload Hash:</strong> ${truncateHash(record.payloadHash)}
                        </div>
                    ` : ''}
                    ${record.ipfsHash ? `
                        <div class="text-muted small">
                            <strong>IPFS:</strong> ${truncateHash(record.ipfsHash)}
                        </div>
                    ` : ''}
                </div>
                <div class="col-md-4 text-end">
                    <div class="text-muted small mb-2">
                        <i class="bi bi-clock"></i> ${date}
                    </div>
                    <button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation();">
                        <i class="bi bi-eye"></i> View Details
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Format action type
function formatAction(action) {
    const actions = {
        'donation_record': 'Donation Record',
        'request_verification': 'Request Verification',
        'trust_score_update': 'Trust Score Update'
    };
    return actions[action] || action;
}

// Truncate hash
function truncateHash(hash) {
    if (!hash) return 'N/A';
    if (hash.length <= 20) return hash;
    return `${hash.substring(0, 10)}...${hash.substring(hash.length - 10)}`;
}

// Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Hash copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

// Show toast notification
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'position-fixed top-0 end-0 p-3';
    toast.style.zIndex = '9999';
    toast.innerHTML = `
        <div class="toast show" role="alert">
            <div class="toast-header">
                <strong class="me-auto">Success</strong>
                <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Filter records
function filterRecords() {
    const action = document.getElementById('filterAction')?.value;
    const status = document.getElementById('filterStatus')?.value;
    const chain = document.getElementById('filterChain')?.value;

    let filtered = [...currentRecords];

    if (action) {
        filtered = filtered.filter(r => r.action === action);
    }
    if (status) {
        filtered = filtered.filter(r => r.status === status);
    }
    if (chain) {
        filtered = filtered.filter(r => r.chain === chain);
    }

    updateStatistics(filtered);
    displayRecords(filtered);
}

// Show create record modal
function showCreateRecordModal() {
    document.getElementById('createRecordForm').reset();
    toggleRecordFields('');
    const modal = new bootstrap.Modal(document.getElementById('createRecordModal'));
    modal.show();
}

// Toggle record fields
function toggleRecordFields(type) {
    const donationField = document.getElementById('donationIdField');
    const requestField = document.getElementById('requestIdField');

    if (type === 'donation') {
        donationField.style.display = 'block';
        requestField.style.display = 'none';
    } else if (type === 'request') {
        donationField.style.display = 'none';
        requestField.style.display = 'block';
    } else {
        donationField.style.display = 'none';
        requestField.style.display = 'none';
    }
}

// Create blockchain record
async function createBlockchainRecord() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        const type = document.getElementById('recordType').value;
        const ipfsHash = document.getElementById('ipfsHash').value;
        const payloadData = document.getElementById('payloadData').value;

        if (!type) {
            alert('Please select a record type');
            return;
        }

        let payload = {};
        if (payloadData) {
            try {
                payload = JSON.parse(payloadData);
            } catch (e) {
                alert('Invalid JSON in payload data');
                return;
            }
        }

        let endpoint = '';
        let body = {
            ipfsHash: ipfsHash || undefined,
            payload
        };

        if (type === 'donation') {
            const donationId = document.getElementById('donationId').value;
            if (!donationId) {
                alert('Please enter donation ID');
                return;
            }
            endpoint = '/blockchain/donation';
            body.donationId = donationId;
        } else if (type === 'request') {
            const requestId = document.getElementById('requestId').value;
            if (!requestId) {
                alert('Please enter request ID');
                return;
            }
            endpoint = '/blockchain/verify-request';
            body.requestId = requestId;
        }

        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${user.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const result = await response.json();

        if (result.success) {
            showToast('Blockchain record created successfully!');
            bootstrap.Modal.getInstance(document.getElementById('createRecordModal')).hide();
            loadBlockchainRecords();
            loadTrustScore();
        } else {
            alert('Failed to create record: ' + result.message);
        }
    } catch (error) {
        console.error('Error creating record:', error);
        alert('Error creating blockchain record');
    }
}

// Show record details
function showRecordDetails(record) {
    currentTxHash = record.transactionHash;

    const content = `
        <div class="card mb-3">
            <div class="card-header bg-primary text-white">
                <h6 class="mb-0">Record Information</h6>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>Action:</strong> ${formatAction(record.action)}</p>
                        <p><strong>Status:</strong> 
                            <span class="status-${record.status}">${record.status.toUpperCase()}</span>
                        </p>
                        <p><strong>Chain:</strong> 
                            <span class="chain-badge">${record.chain.toUpperCase()}</span>
                        </p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Timestamp:</strong> ${new Date(record.timestamp || record.createdAt).toLocaleString()}</p>
                        <p><strong>Record ID:</strong> ${record._id}</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="card mb-3">
            <div class="card-header">
                <h6 class="mb-0">Blockchain Data</h6>
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <strong>Transaction Hash:</strong>
                    <div class="hash-display mt-2">
                        ${record.transactionHash}
                        <i class="bi bi-clipboard copy-btn ms-2" onclick="copyToClipboard('${record.transactionHash}')"></i>
                    </div>
                </div>
                
                ${record.payloadHash ? `
                <div class="mb-3">
                    <strong>Payload Hash (SHA-256):</strong>
                    <div class="hash-display mt-2">
                        ${record.payloadHash}
                        <i class="bi bi-clipboard copy-btn ms-2" onclick="copyToClipboard('${record.payloadHash}')"></i>
                    </div>
                </div>
                ` : ''}
                
                ${record.ipfsHash ? `
                <div class="mb-3">
                    <strong>IPFS Hash:</strong>
                    <div class="hash-display mt-2">
                        ${record.ipfsHash}
                        <i class="bi bi-clipboard copy-btn ms-2" onclick="copyToClipboard('${record.ipfsHash}')"></i>
                    </div>
                    <small class="text-muted">
                        <a href="https://ipfs.io/ipfs/${record.ipfsHash}" target="_blank">
                            View on IPFS Gateway
                        </a>
                    </small>
                </div>
                ` : ''}
            </div>
        </div>

        ${record.error ? `
        <div class="alert alert-danger">
            <strong>Error:</strong> ${record.error}
        </div>
        ` : ''}

        <div class="card">
            <div class="card-header">
                <h6 class="mb-0">Security Features</h6>
            </div>
            <div class="card-body">
                <ul class="mb-0">
                    <li><i class="bi bi-check-circle text-success"></i> Cryptographically hashed with SHA-256</li>
                    <li><i class="bi bi-check-circle text-success"></i> Immutable once confirmed</li>
                    <li><i class="bi bi-check-circle text-success"></i> Publicly verifiable on blockchain</li>
                    <li><i class="bi bi-check-circle text-success"></i> Tamper-proof audit trail</li>
                </ul>
            </div>
        </div>
    `;

    document.getElementById('recordDetailContent').innerHTML = content;
    const modal = new bootstrap.Modal(document.getElementById('recordDetailModal'));
    modal.show();
}

// Verify transaction on blockchain
async function verifyTransaction(txHash) {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        
        const response = await fetch(`${API_URL}/blockchain/verify/${txHash}`, {
            headers: {
                'Authorization': `Bearer ${user.token}`
            }
        });

        const result = await response.json();

        if (result.success && result.data) {
            if (result.data.verified) {
                showToast('✓ Transaction verified on blockchain!');
            } else {
                alert('Transaction could not be verified');
            }
        } else {
            alert('Verification failed: ' + result.message);
        }
    } catch (error) {
        console.error('Error verifying transaction:', error);
        alert('Error verifying transaction');
    }
}

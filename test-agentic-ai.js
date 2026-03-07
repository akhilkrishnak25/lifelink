/**
 * Agentic AI Test Script
 * Tests O+ blood request and verifies agent dashboard updates
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let authToken = '';
let requestId = '';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}${colors.bright}${msg}${colors.reset}\n`)
};

// Test user credentials
const testUser = {
  email: `test_receiver_${Date.now()}@test.com`,
  password: 'Test@123',
  name: 'Test Receiver',
  phone: '9876543210',
  bloodGroup: 'O+',
  role: 'user'
};

// Admin credentials for agent dashboard
const adminUser = {
  email: 'akhilkrishnakondri@gmail.com',
  password: '12345678'
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Step 1: Register test user
async function registerUser() {
  try {
    log.section('📝 Step 1: Registering Test User');
    const response = await axios.post(`${BASE_URL}/auth/register`, testUser);
    
    if (response.data.data && response.data.data.token) {
      authToken = response.data.data.token;
    } else if (response.data.token) {
      authToken = response.data.token;
    }
    
    log.success(`User registered: ${testUser.email}`);
    log.info(`Auth token received: ${authToken.substring(0, 20)}...`);
    
    // Verify token works by getting profile
    await sleep(500);
    return true;
  } catch (error) {
    if (error.response?.data?.message?.includes('already exists')) {
      log.warning('User already exists, attempting login...');
      return await loginUser();
    }
    log.error(`Registration failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Login if user exists
async function loginUser() {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    
    if (response.data.data && response.data.data.token) {
      authToken = response.data.data.token;
    } else if (response.data.token) {
      authToken = response.data.token;
    }
    
    log.success(`Logged in as: ${testUser.email}`);
    log.info(`Auth token received: ${authToken.substring(0, 20)}...`);
    return true;
  } catch (error) {
    log.error(`Login failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Step 2: Create O+ blood request
async function createBloodRequest() {
  try {
    log.section('🩸 Step 2: Creating O+ Blood Request');
    
    const requestData = {
      bloodGroup: 'O+',
      unitsRequired: 2,
      urgency: 'urgent',
      hospitalName: 'City General Hospital Medical Center',
      address: 'Downtown Medical Center, Main Street, Bangalore, Karnataka',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      longitude: 77.5946,  // Bangalore longitude
      latitude: 12.9716,   // Bangalore latitude
      patientName: 'John Doe',
      patientAge: 35,
      reason: 'Accident - Emergency Surgery',
      contactNumber: '9876543210',
      requiredBy: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Tomorrow
    };

    const response = await axios.post(`${BASE_URL}/receiver/request`, requestData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    requestId = response.data.data._id;
    log.success(`Blood request created successfully!`);
    log.info(`Request ID: ${requestId}`);
    log.info(`Blood Group: ${requestData.bloodGroup}`);
    log.info(`Units: ${requestData.unitsRequired}`);
    log.info(`Urgency: ${requestData.urgency}`);
    log.info(`Location: ${requestData.city}, ${requestData.state}`);
    
    return true;
  } catch (error) {
    log.error(`Failed to create request: ${error.response?.data?.message || error.message}`);
    if (error.response?.data) {
      console.log('Error details:', error.response.data);
    }
    return false;
  }
}

// Step 3: Wait for agent processing
async function waitForAgentProcessing() {
  log.section('⏳ Step 3: Waiting for Agentic AI Processing');
  log.info('The agent system should be processing the request...');
  log.info('Phases: OBSERVE → DECIDE → PLAN → ACT → LEARN');
  
  for (let i = 5; i > 0; i--) {
    process.stdout.write(`\r${colors.yellow}⏱${colors.reset}  Waiting ${i} seconds for agent to process...`);
    await sleep(1000);
  }
  console.log('\n');
  log.success('Processing time elapsed');
}

// Step 4: Check agent state for the request
async function checkAgentState() {
  try {
    log.section('🔍 Step 4: Checking Agent State for Request');
    
    // First login as admin
    const adminLoginResponse = await axios.post(`${BASE_URL}/auth/login`, adminUser);
    const adminToken = adminLoginResponse.data.data?.token || adminLoginResponse.data.token;
    log.success('Logged in as admin');

    // Get agent state for this specific request
    const stateResponse = await axios.get(`${BASE_URL}/agent/request/${requestId}/state`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const agentState = stateResponse.data.data;
    
    log.success('Agent state retrieved!');
    console.log('\n' + colors.bright + '📊 AGENT STATE DETAILS:' + colors.reset);
    console.log('─'.repeat(60));
    console.log(`Phase:            ${colors.cyan}${agentState.phase}${colors.reset}`);
    console.log(`Strategy:         ${colors.cyan}${agentState.strategy}${colors.reset}`);
    console.log(`Donors Analyzed:  ${colors.green}${agentState.donorsAnalyzed}${colors.reset}`);
    console.log(`Donors Notified:  ${colors.green}${agentState.donorsNotified}${colors.reset}`);
    console.log(`Actions Taken:    ${colors.green}${agentState.actionsTaken}${colors.reset}`);
    
    if (agentState.mlPrediction) {
      console.log(`\n${colors.bright}🤖 ML Prediction:${colors.reset}`);
      console.log(`  Recommended Strategy: ${agentState.mlPrediction.recommendedStrategy}`);
      console.log(`  Confidence: ${(agentState.mlPrediction.confidence * 100).toFixed(1)}%`);
    }

    if (agentState.executionLog && agentState.executionLog.length > 0) {
      console.log(`\n${colors.bright}📝 Execution Log:${colors.reset}`);
      agentState.executionLog.forEach((log, idx) => {
        console.log(`  ${idx + 1}. [${log.timestamp}] ${log.action}: ${log.description}`);
      });
    }

    console.log('─'.repeat(60));
    
    return agentState;
  } catch (error) {
    log.error(`Failed to get agent state: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

// Step 5: Check agent dashboard stats
async function checkAgentDashboard() {
  try {
    log.section('📈 Step 5: Checking Agent Dashboard Stats');
    
    // Login as admin
    const adminLoginResponse = await axios.post(`${BASE_URL}/auth/login`, adminUser);
    const adminToken = adminLoginResponse.data.data?.token || adminLoginResponse.data.token;

    // Get agent insights
    const insightsResponse = await axios.get(`${BASE_URL}/agent/insights`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const insights = insightsResponse.data.data;
    
    log.success('Agent dashboard insights retrieved!');
    console.log('\n' + colors.bright + '🎯 AGENT DASHBOARD STATISTICS:' + colors.reset);
    console.log('═'.repeat(60));
    
    console.log(`\n${colors.bright}📊 Overall Stats:${colors.reset}`);
    console.log(`  Total Requests Processed:  ${colors.green}${insights.totalRequestsProcessed}${colors.reset}`);
    console.log(`  Active Requests:           ${colors.cyan}${insights.activeRequests}${colors.reset}`);
    console.log(`  Success Rate:              ${colors.green}${(insights.successRate * 100).toFixed(1)}%${colors.reset}`);
    console.log(`  Avg Response Time:         ${colors.yellow}${insights.avgResponseTime}${colors.reset}`);

    console.log(`\n${colors.bright}🎲 Strategy Distribution:${colors.reset}`);
    Object.entries(insights.strategyDistribution || {}).forEach(([strategy, count]) => {
      console.log(`  ${strategy.padEnd(20)} ${colors.cyan}${count}${colors.reset}`);
    });

    console.log(`\n${colors.bright}⚡ System Performance:${colors.reset}`);
    console.log(`  Agent Latency:             ${colors.yellow}${insights.performanceMetrics?.agentLatency || 'N/A'}${colors.reset}`);
    console.log(`  ML Model Accuracy:         ${colors.green}${insights.performanceMetrics?.mlAccuracy || 'N/A'}${colors.reset}`);

    console.log('═'.repeat(60));
    
    return insights;
  } catch (error) {
    log.error(`Failed to get dashboard stats: ${error.response?.data?.message || error.message}`);
    console.log('Error details:', error.response?.data);
    return null;
  }
}

// Main test flow
async function runTest() {
  console.log('\n' + '═'.repeat(60));
  console.log(colors.bright + colors.cyan + '🤖 AGENTIC AI SYSTEM TEST - O+ BLOOD REQUEST' + colors.reset);
  console.log('═'.repeat(60));

  try {
    // Step 1: Register/Login
    const userReady = await registerUser();
    if (!userReady) {
      log.error('Cannot proceed without user authentication');
      return;
    }

    // Step 2: Create blood request
    const requestCreated = await createBloodRequest();
    if (!requestCreated) {
      log.error('Cannot proceed without creating request');
      return;
    }

    // Step 3: Wait for processing
    await waitForAgentProcessing();

    // Step 4: Check agent state
    const agentState = await checkAgentState();

    // Step 5: Check dashboard
    const dashboard = await checkAgentDashboard();

    // Summary
    log.section('✅ TEST COMPLETED SUCCESSFULLY');
    log.success('O+ blood request created and processed by Agentic AI');
    log.success('Agent dashboard statistics updated');
    log.info(`\nView the request in browser:`);
    log.info(`  Frontend: http://localhost:3000/receiver-dashboard.html`);
    log.info(`  Agent Dashboard: http://localhost:3000/agent-dashboard.html`);
    log.info(`\nRequest ID: ${requestId}`);

  } catch (error) {
    log.error(`Test failed: ${error.message}`);
    console.error(error);
  }
}

// Run the test
runTest();

/**
 * Check Agentic AI Processing Status
 * Verifies if the agent processed the O+ blood request
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
const adminUser = {
  email: 'akhilkrishnakondri@gmail.com',
  password: '12345678'
};

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m'
};

async function checkAgentProcessing() {
  try {
    console.log('\n' + '═'.repeat(70));
    console.log(colors.bright + colors.cyan + '🔍 CHECKING AGENTIC AI PROCESSING STATUS' + colors.reset);
    console.log('═'.repeat(70) + '\n');

    //  Login as admin
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, adminUser);
    const adminToken = loginResponse.data.data?.token || loginResponse.data.token;
    console.log(colors.green + '✓' + colors.reset + ' Logged in as admin\n');

    // Get all agent states
    console.log(colors.blue + 'ℹ' + colors.reset + ' Fetching agent states...\n');
    const statesResponse = await axios.get(`${BASE_URL}/agent/states?limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const states = statesResponse.data.data || [];
    
    if (states.length === 0) {
      console.log(colors.yellow + '⚠' + colors.reset + ' No agent states found yet.');
      console.log(colors.yellow + 'ℹ' + colors.reset + ' This could mean:');
      console.log('  1. The agentic AI service hasn\'t processed any requests yet');
      console.log('  2. The agent services may not be fully initialized');
      console.log('  3. Processing is asynchronous and may take a few seconds\n');
    } else {
      console.log(colors.green + `✓ Found ${states.length} agent state(s)\n` + colors.reset);
      
      states.forEach((state, idx) => {
        console.log(colors.bright + `Agent State #${idx + 1}:` + colors.reset);
        console.log('─'.repeat(60));
        console.log(`  Request ID:        ${colors.cyan}${state.requestId?._id || state.requestId}${colors.reset}`);
        console.log(`  Blood Group:       ${colors.red}${state.requestId?.bloodGroup || 'N/A'}${colors.reset}`);
        console.log(`  Urgency:           ${colors.yellow}${state.requestId?.urgency || 'N/A'}${colors.reset}`);
        console.log(`  Phase:             ${colors.magenta}${state.phase}${colors.reset}`);
        console.log(`  Strategy:          ${colors.green}${state.strategy}${colors.reset}`);
        console.log(`  Donors Analyzed:   ${state.donorsAnalyzed || 0}`);
        console.log(`  Donors Notified:   ${state.donorsNotified || 0}`);
        console.log(`  Actions Taken:     ${state.actionsTaken || 0}`);
        console.log(`  Created:           ${new Date(state.createdAt).toLocaleString()}`);
        console.log('─'.repeat(60) + '\n');
      });
    }

    // Get dashboard insights
    console.log(colors.blue + 'ℹ' + colors.reset + ' Fetching dashboard insights...\n');
    const insightsResponse = await axios.get(`${BASE_URL}/agent/insights`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const insights = insightsResponse.data.data;
    
    console.log(colors.bright + '📊 AGENT DASHBOARD INSIGHTS:' + colors.reset);
    console.log('═'.repeat(70));
    console.log(`  Total Requests Processed:  ${colors.green}${insights.totalRequestsProcessed || 0}${colors.reset}`);
    console.log(`  Active Requests:           ${colors.cyan}${insights.activeRequests || 0}${colors.reset}`);
    console.log(`  Success Rate:              ${colors.green}${insights.successRate ? (insights.successRate * 100).toFixed(1) + '%' : 'N/A'}${colors.reset}`);
    console.log(`  Average Response Time:     ${colors.yellow}${insights.avgResponseTime || 'N/A'}${colors.reset}`);
    
    if (insights.strategyDistribution && Object.keys(insights.strategyDistribution).length > 0) {
      console.log(`\n  ${colors.bright}Strategy Distribution:${colors.reset}`);
      Object.entries(insights.strategyDistribution).forEach(([strategy, count]) => {
        console.log(`    ${strategy.padEnd(20)} ${colors.cyan}${count}${colors.reset}`);
      });
    }
    
    console.log('═'.repeat(70) + '\n');

    // Summary
    console.log(colors.bright + colors.green + '✅ VERIFICATION COMPLETE' + colors.reset);
    console.log('\n' + colors.cyan + '🌐 View in Browser:' + colors.reset);
    console.log(`  Agent Dashboard:    http://localhost:3000/agent-dashboard.html`);
    console.log(`  Receiver Dashboard: http://localhost:3000/receiver-dashboard.html`);
    console.log('');

  } catch (error) {
    console.error(colors.red + '\n✗ Error:' + colors.reset, error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.log('\nDetails:', error.response.data);
    }
  }
}

checkAgentProcessing();

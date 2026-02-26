/**
 * Check Agent and Blockchain Data Status
 * Quick diagnostic to see what data exists
 * 
 * Usage: node scripts/check-agent-data.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const AgentState = require('../models/AgentState');
const BlockchainRecord = require('../models/BlockchainRecord');
const BloodRequest = require('../models/BloodRequest');

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('='.repeat(60));
    console.log('📊 AGENTIC AI & BLOCKCHAIN DATA STATUS');
    console.log('='.repeat(60));

    // Agent States
    const agentCount = await AgentState.countDocuments();
    const recentAgents = await AgentState.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('requestId', 'bloodGroup urgency status');

    console.log('\n🤖 AGENTIC AI STATS:');
    console.log('-'.repeat(60));
    console.log(`Total Agent States: ${agentCount}`);

    if (agentCount === 0) {
      console.log('⚠️  No agent data found!');
      console.log('   → Create blood requests to trigger AI processing');
      console.log('   → Or run: node scripts/seed-agent-data.js');
    } else {
      console.log('\nRecent Agent Processing:');
      recentAgents.forEach((agent, idx) => {
        console.log(`\n${idx + 1}. Request ID: ${agent.requestId?._id || 'N/A'}`);
        console.log(`   Blood Group: ${agent.observation?.bloodGroup || 'N/A'}`);
        console.log(`   Urgency: ${agent.observation?.urgency || 'N/A'}`);
        console.log(`   Strategy: ${agent.decision?.strategyType || 'N/A'}`);
        console.log(`   Status: ${agent.execution?.status || 'N/A'}`);
        console.log(`   Matched: ${agent.learning?.finalOutcome?.matched ? 'Yes' : 'No'}`);
        console.log(`   Created: ${agent.createdAt}`);
      });

      // Calculate stats
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);

      const recentStates = await AgentState.find({
        createdAt: { $gte: last30Days }
      });

      const matched = recentStates.filter(s => s.learning?.finalOutcome?.matched).length;
      const matchRate = recentStates.length > 0 ? ((matched / recentStates.length) * 100).toFixed(1) : 0;

      console.log('\n📈 Performance (Last 30 Days):');
      console.log(`   Total Processed: ${recentStates.length}`);
      console.log(`   Successful Matches: ${matched}`);
      console.log(`   Match Rate: ${matchRate}%`);
    }

    // Blockchain Records
    const blockchainCount = await BlockchainRecord.countDocuments();
    const recentBlockchain = await BlockchainRecord.find()
      .sort({ createdAt: -1 })
      .limit(5);

    console.log('\n\n🔗 BLOCKCHAIN STATS:');
    console.log('-'.repeat(60));
    console.log(`Total Blockchain Records: ${blockchainCount}`);

    if (blockchainCount === 0) {
      console.log('⚠️  No blockchain data found!');
      console.log('   → Call POST /api/blockchain/donation to create records');
      console.log('   → Or run: node scripts/seed-agent-data.js');
    } else {
      console.log('\nRecent Blockchain Records:');
      recentBlockchain.forEach((record, idx) => {
        console.log(`\n${idx + 1}. Type: ${record.recordType}`);
        console.log(`   Action: ${record.actionType}`);
        console.log(`   Status: ${record.status}`);
        console.log(`   TX Hash: ${record.transactionHash?.substring(0, 20)}...`);
        console.log(`   Created: ${record.createdAt}`);
      });

      const confirmed = await BlockchainRecord.countDocuments({ status: 'confirmed' });
      console.log(`\n✅ Confirmed Records: ${confirmed}`);
    }

    // Blood Requests
    const requestCount = await BloodRequest.countDocuments();
    const pendingRequests = await BloodRequest.countDocuments({ status: 'pending' });
    const completedRequests = await BloodRequest.countDocuments({ status: 'completed' });

    console.log('\n\n🩸 BLOOD REQUESTS:');
    console.log('-'.repeat(60));
    console.log(`Total Requests: ${requestCount}`);
    console.log(`Pending: ${pendingRequests}`);
    console.log(`Completed: ${completedRequests}`);

    console.log('\n' + '='.repeat(60));
    console.log('\n💡 RECOMMENDATIONS:\n');

    if (agentCount === 0) {
      console.log('🔸 To populate Agent stats:');
      console.log('   1. Create blood requests via receiver-dashboard.html');
      console.log('   2. AI will automatically process and create AgentState records');
      console.log('   3. Visit agent-dashboard.html to view stats\n');
    }

    if (blockchainCount === 0) {
      console.log('🔸 To populate Blockchain stats:');
      console.log('   1. Call POST /api/blockchain/donation with donation data');
      console.log('   2. Or run seed script: node scripts/seed-agent-data.js');
      console.log('   3. Visit blockchain-records.html to view records\n');
    }

    if (agentCount > 0 && blockchainCount > 0) {
      console.log('✅ All systems have data! Check the dashboards:');
      console.log('   → agent-dashboard.html');
      console.log('   → blockchain-records.html');
      console.log('   → admin-dashboard.html\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed\n');
  }
}

// Run the script
checkData();

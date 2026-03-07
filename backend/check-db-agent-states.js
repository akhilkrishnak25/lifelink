const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const AgentState = require('./models/AgentState');

async function checkAgentStates() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Connected to MongoDB\n');

    // Get all agent states
    const states = await AgentState.find({}).sort({ createdAt: -1 }).limit(5);

    console.log(`📊 Found ${states.length} agent states\n`);
    console.log('='.repeat(80));

    for (const state of states) {
      console.log('\n🤖 AGENT STATE:');
      console.log(`   ID: ${state._id}`);
      console.log(`   Request ID: ${state.requestId}`);
      console.log(`   Created: ${state.createdAt}`);
      
      console.log('\n   📝 OBSERVATION:');
      console.log(`      Urgency: ${state.observation?.urgency || 'N/A'}`);
      console.log(`      Blood Group: ${state.observation?.bloodGroup || 'N/A'}`);
      console.log(`      Donors Available: ${state.observation?.donorsAvailable || 0}`);
      
      console.log('\n   🧠 DECISION:');
      console.log(`      Strategy Type: ${state.decision?.strategyType || 'N/A'}`);
      console.log(`      Ranked Donors: ${state.decision?.rankedDonors?.length || 0}`);
      console.log(`      ML Confidence: ${state.decision?.mlRecommendation?.confidence || 'N/A'}`);
      console.log(`      ML Reasoning: ${state.decision?.mlRecommendation?.reasoning || 'N/A'}`);
      
      console.log('\n   📋 PLAN:');
      console.log(`      Steps: ${state.plan?.steps?.length || 0}`);
      if (state.plan?.steps?.length > 0) {
        state.plan.steps.forEach((step, i) => {
          console.log(`         ${i+1}. ${step.action} (${step.status})`);
        });
      }
      
      console.log('\n   ⚡ EXECUTION:');
      console.log(`      Status: ${state.execution?.status || 'N/A'}`);
      console.log(`      Notifications Sent: ${state.execution?.notificationsSent || 0}`);
      console.log(`      Donors Contacted: ${state.execution?.donorsContacted?.length || 0}`);
      console.log(`      Actions: ${state.execution?.actions?.length || 0}`);
      if (state.execution?.actions?.length > 0) {
        state.execution.actions.forEach((action, i) => {
          console.log(`         ${i+1}. ${action.type || 'unknown'} - ${action.success ? '✓' : '✗'}`);
        });
      }
      
      console.log('\n   📚 LEARNING:');
      console.log(`      Responses: ${state.learning?.donorResponses?.length || 0}`);
      console.log(`      Final Matched: ${state.learning?.finalOutcome?.matched || false}`);
      
      console.log('\n' + '='.repeat(80));
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAgentStates();

/**
 * Seed Script for Agentic AI and Blockchain Test Data
 * Creates sample data to populate dashboard stats
 * 
 * Usage: node scripts/seed-agent-data.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const AgentState = require('../models/AgentState');
const BlockchainRecord = require('../models/BlockchainRecord');
const BloodRequest = require('../models/BloodRequest');
const User = require('../models/User');
const Donor = require('../models/Donor');

async function seedAgentData() {
  try {
    console.log('🌱 Starting Agent & Blockchain Data Seeding...\n');

    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get some real users and donors for realistic data
    const users = await User.find({ role: { $in: ['user', 'receiver'] } }).limit(5);
    const donors = await Donor.find().limit(10);

    if (users.length === 0) {
      console.log('⚠️  No users found. Please create at least one user first.');
      process.exit(1);
    }

    if (donors.length === 0) {
      console.log('⚠️  No donors found. Please create at least one donor first.');
      process.exit(1);
    }

    console.log(`Found ${users.length} users and ${donors.length} donors\n`);

    // Clear existing test data (optional)
    const clearExisting = process.argv.includes('--clear');
    if (clearExisting) {
      await AgentState.deleteMany({});
      await BlockchainRecord.deleteMany({});
      console.log('🗑️  Cleared existing AgentState and BlockchainRecord data\n');
    }

    // Create 10 sample blood requests with AgentState records
    console.log('📊 Creating sample blood requests with AI processing...\n');

    const bloodGroups = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
    const urgencies = ['critical', 'urgent', 'normal'];
    const strategies = ['targeted', 'broadcast', 'escalation', 'hybrid'];
    const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata'];

    for (let i = 0; i < 10; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      const bloodGroup = bloodGroups[Math.floor(Math.random() * bloodGroups.length)];
      const urgency = urgencies[Math.floor(Math.random() * urgencies.length)];
      const city = cities[Math.floor(Math.random() * cities.length)];
      const strategyType = strategies[Math.floor(Math.random() * strategies.length)];

      // Create blood request
      const request = await BloodRequest.create({
        receiverId: randomUser._id,
        bloodGroup,
        urgency,
        hospitalName: `${city} General Hospital`,
        patientName: `Test Patient ${i + 1}`,
        contactNumber: `98765432${10 + i}`,
        unitsRequired: Math.floor(Math.random() * 3) + 1,
        address: `${i + 1} Hospital Road`,
        city,
        state: 'Test State',
        pincode: `40000${i}`,
        location: {
          type: 'Point',
          coordinates: [77.5946 + (Math.random() - 0.5), 12.9716 + (Math.random() - 0.5)]
        },
        description: `Test emergency request ${i + 1}`,
        status: Math.random() > 0.5 ? 'pending' : 'completed',
        isFake: Math.random() > 0.9, // 10% fake for testing
        mlScore: Math.random() * 100
      });

      // Select random donors for this request
      const selectedDonors = donors
        .slice(0, Math.floor(Math.random() * 5) + 3)
        .map(d => d._id);

      // Create corresponding AgentState
      const matched = request.status === 'completed';
      const processingTime = Math.floor(Math.random() * 5000) + 1000;
      const responseTime = matched ? Math.floor(Math.random() * 30) + 5 : null;

      await AgentState.create({
        requestId: request._id,
        observation: {
          bloodGroup,
          urgency,
          requestTime: request.createdAt,
          location: { city, state: 'Test State' },
          unitsRequired: request.unitsRequired,
          potentialDonorCount: selectedDonors.length,
          timeOfDay: request.createdAt.getHours() < 12 ? 'morning' : 'afternoon',
          isWeekend: [0, 6].includes(request.createdAt.getDay()),
          historicalMatchRate: Math.random() * 100
        },
        decision: {
          strategyType,
          rankedDonors: selectedDonors.map((donorId, idx) => ({
            donorId,
            score: 100 - (idx * 10) - Math.random() * 10,
            distance: Math.random() * 20,
            availability: Math.random() > 0.2 ? 'available' : 'unavailable',
            responseRate: Math.random() * 100,
            rank: idx + 1
          })),
          mlRecommendation: {
            recommendedStrategy: strategyType,
            confidence: 70 + Math.random() * 30,
            reasoning: `AI recommended ${strategyType} strategy based on urgency and donor availability`
          },
          decisionTimestamp: request.createdAt,
          processingTimeMs: processingTime
        },
        plan: {
          strategyType,
          steps: [
            {
              stepNumber: 1,
              action: 'notify_targeted_donors',
              targetDonors: selectedDonors.slice(0, 3),
              timing: 'immediate'
            },
            {
              stepNumber: 2,
              action: 'wait_for_responses',
              timing: 'after_5_minutes'
            }
          ],
          responseWindow: 15 + Math.floor(Math.random() * 30),
          escalationPlan: {
            enabled: urgency === 'critical',
            trigger: 'no_response_in_10_minutes'
          }
        },
        execution: {
          actions: [
            {
              actionType: 'notification_sent',
              targetDonors: selectedDonors,
              timestamp: request.createdAt,
              success: true
            }
          ],
          notificationsSent: selectedDonors.length,
          chatSessionsOpened: Math.floor(Math.random() * 3),
          donorsContacted: selectedDonors,
          currentStep: 2,
          status: matched ? 'completed' : 'active'
        },
        learning: {
          donorResponses: selectedDonors.map(donorId => ({
            donorId,
            responded: Math.random() > 0.4,
            responseTime: Math.floor(Math.random() * 30) + 1,
            accepted: Math.random() > 0.5
          })),
          finalOutcome: {
            matched,
            matchedDonorId: matched ? selectedDonors[0] : null,
            totalResponseTime: responseTime,
            numberOfResponses: Math.floor(Math.random() * selectedDonors.length)
          },
          performanceMetrics: {
            strategyEffectiveness: matched ? 90 + Math.random() * 10 : 40 + Math.random() * 30,
            donorEngagementRate: (Math.random() * 60) + 20,
            timeToMatch: responseTime
          },
          improvements: matched
            ? [`Strategy ${strategyType} worked well for ${urgency} requests`]
            : ['Consider increasing notification radius for better coverage'],
          usedForTraining: Math.random() > 0.5
        },
        safetyChecks: {
          adminOverride: false,
          medicalEligibilityVerified: true,
          cooldownRespected: true,
          duplicateRequestCheck: true
        },
        agentVersion: '1.0.0',
        loopIterations: Math.floor(Math.random() * 3) + 1
      });

      console.log(`   ✓ Created request ${i + 1}: ${bloodGroup} - ${urgency} - ${strategyType} - ${matched ? 'Matched' : 'Pending'}`);
    }

    // Create 5 sample blockchain records
    console.log('\n🔗 Creating sample blockchain records...\n');

    for (let i = 0; i < 5; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      const bloodGroup = bloodGroups[Math.floor(Math.random() * bloodGroups.length)];

      await BlockchainRecord.create({
        userId: randomUser._id,
        recordType: 'donation',
        actionType: 'create_donation',
        dataHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        blockNumber: 1000000 + i,
        chainId: 'ethereum-testnet',
        ipfsHash: `Qm${Math.random().toString(36).substr(2, 44)}`,
        payload: {
          donor: randomUser.name,
          bloodGroup,
          units: Math.floor(Math.random() * 2) + 1,
          hospital: `Test Hospital ${i + 1}`,
          date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        },
        status: 'confirmed',
        gasUsed: Math.floor(Math.random() * 50000) + 21000,
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      });

      console.log(`   ✓ Created blockchain record ${i + 1}: ${bloodGroup} donation`);
    }

    // Display summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SEEDING SUMMARY');
    console.log('='.repeat(60));

    const agentCount = await AgentState.countDocuments();
    const blockchainCount = await BlockchainRecord.countDocuments();
    const requestCount = await BloodRequest.countDocuments();

    console.log(`✅ Agent States: ${agentCount}`);
    console.log(`✅ Blockchain Records: ${blockchainCount}`);
    console.log(`✅ Blood Requests: ${requestCount}`);

    console.log('\n🎉 Seeding complete! You can now:');
    console.log('   1. Visit agent-dashboard.html to see AI stats');
    console.log('   2. Visit blockchain-records.html to see blockchain data');
    console.log('   3. Check admin-dashboard.html for overall statistics');
    console.log('\n💡 Tip: Clear browser cache (Ctrl+Shift+R) to see updated stats\n');

  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
seedAgentData();

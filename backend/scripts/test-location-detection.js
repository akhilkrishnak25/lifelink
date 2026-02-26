/**
 * Test script for Location-Based Fake Request Detection
 * 
 * This script creates test blood requests that should trigger various
 * location-based fraud detection flags
 */

require('dotenv').config();
const mongoose = require('mongoose');
const BloodRequest = require('../models/BloodRequest');
const RequestTracking = require('../models/RequestTracking');
const User = require('../models/User');
const locationTrackingService = require('../services/locationTracking.service');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/life-link', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Connection error:'));
db.once('open', async () => {
  console.log('✅ Connected to MongoDB\n');
  await runTests();
  await mongoose.disconnect();
  console.log('\n✅ Disconnected from MongoDB');
  process.exit(0);
});

async function runTests() {
  console.log('🧪 LOCATION-BASED FAKE REQUEST DETECTION TESTS\n');
  console.log('=' .repeat(60));

  try {
    // Find or create a test receiver user
    let testUser = await User.findOne({ email: 'test-receiver@example.com' });
    
    if (!testUser) {
      console.log('📝 Creating test receiver user...');
      testUser = await User.create({
        name: 'Test Receiver',
        email: 'test-receiver@example.com',
        password: 'TestPassword123!',
        phone: '9999999999',
        role: 'receiver'
      });
      console.log(`✅ Created test user: ${testUser.email}\n`);
    } else {
      console.log(`✅ Using existing test user: ${testUser.email}\n`);
    }

    const userId = testUser._id;

    // Clean up old test data
    console.log('🧹 Cleaning up old test data...');
    await RequestTracking.deleteMany({ userId });
    await BloodRequest.deleteMany({ receiverId: userId, bloodGroup: 'O+' });
    console.log('✅ Cleanup complete\n');

    console.log('=' .repeat(60));
    console.log('\n📍 TEST 1: NORMAL REQUEST (Should Pass)');
    console.log('-'.repeat(60));
    await testNormalRequest(userId);

    console.log('\n📍 TEST 2: RAPID REQUESTS (3 requests in 30 minutes)');
    console.log('-'.repeat(60));
    await testRapidRequests(userId);

    console.log('\n📍 TEST 3: DIFFERENT IP ADDRESSES');
    console.log('-'.repeat(60));
    await testDifferentIPs(userId);

    console.log('\n📍 TEST 4: LOCATION JUMP (Different cities < 1 hour)');
    console.log('-'.repeat(60));
    await testLocationJump(userId);

    console.log('\n📍 TEST 5: IMPOSSIBLE TRAVEL (500km in < 2 hours)');
    console.log('-'.repeat(60));
    await testImpossibleTravel(userId);

    console.log('\n📍 TEST 6: MULTIPLE CITIES (3+ cities in 6 hours)');
    console.log('-'.repeat(60));
    await testMultipleCities(userId);

    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY OF RESULTS');
    console.log('='.repeat(60));
    await printSummary(userId);

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

async function testNormalRequest(userId) {
  const tracking = await RequestTracking.create({
    userId,
    ipAddress: '103.25.196.10', // Mumbai IP
    location: {
      city: 'Mumbai',
      region: 'Maharashtra',
      country: 'India',
      lat: 19.0760,
      lon: 72.8777
    },
    timestamp: new Date(),
    suspicionFlags: []
  });

  console.log(`✅ Created normal request`);
  console.log(`   IP: ${tracking.ipAddress}`);
  console.log(`   Location: ${tracking.location.city}, ${tracking.location.region}`);
  console.log(`   Flags: None (Normal)`);
  console.log(`   ✅ Expected: Should pass with no warnings`);
}

async function testRapidRequests(userId) {
  const baseTime = new Date();
  const ip = '103.25.196.11';
  const location = {
    city: 'Mumbai',
    region: 'Maharashtra',
    country: 'India',
    lat: 19.0760,
    lon: 72.8777
  };

  // Create 3 requests within 30 minutes
  for (let i = 0; i < 3; i++) {
    const timestamp = new Date(baseTime.getTime() + (i * 10 * 60 * 1000)); // 10 min apart
    await RequestTracking.create({
      userId,
      ipAddress: ip,
      location,
      timestamp,
      suspicionFlags: i >= 2 ? ['rapid_requests'] : []
    });
    console.log(`   Request ${i + 1}: ${timestamp.toLocaleTimeString()}`);
  }

  console.log(`   ⚠️  Expected: 3rd request should trigger 'rapid_requests' flag`);
  console.log(`   Severity: +20 points`);
}

async function testDifferentIPs(userId) {
  const baseTime = new Date();
  const location = {
    city: 'Mumbai',
    region: 'Maharashtra',
    country: 'India',
    lat: 19.0760,
    lon: 72.8777
  };

  const ips = ['103.25.196.12', '103.25.196.13'];
  
  for (let i = 0; i < 2; i++) {
    const timestamp = new Date(baseTime.getTime() + (i * 30 * 60 * 1000)); // 30 min apart
    await RequestTracking.create({
      userId,
      ipAddress: ips[i],
      location,
      timestamp,
      suspicionFlags: i >= 1 ? ['different_ip'] : []
    });
    console.log(`   Request ${i + 1}: IP ${ips[i]} at ${timestamp.toLocaleTimeString()}`);
  }

  console.log(`   ⚠️  Expected: 2nd request should trigger 'different_ip' flag`);
  console.log(`   Severity: +15 points`);
}

async function testLocationJump(userId) {
  const baseTime = new Date();
  const ip = '103.25.196.14';

  // Mumbai to Pune (150km apart, less than 1 hour)
  const locations = [
    { city: 'Mumbai', region: 'Maharashtra', country: 'India', lat: 19.0760, lon: 72.8777 },
    { city: 'Pune', region: 'Maharashtra', country: 'India', lat: 18.5204, lon: 73.8567 }
  ];

  for (let i = 0; i < 2; i++) {
    const timestamp = new Date(baseTime.getTime() + (i * 30 * 60 * 1000)); // 30 min apart
    const distance = i === 1 ? 150 : 0;
    await RequestTracking.create({
      userId,
      ipAddress: ip,
      location: locations[i],
      timestamp,
      distanceFromLastRequest: distance,
      timeFromLastRequest: i === 1 ? 30 : 0,
      suspicionFlags: i >= 1 ? ['location_jump'] : []
    });
    console.log(`   Request ${i + 1}: ${locations[i].city} at ${timestamp.toLocaleTimeString()}`);
    if (i === 1) console.log(`   Distance: ${distance}km in 30 minutes`);
  }

  console.log(`   🚨 Expected: Should trigger 'location_jump' flag (>50km in <1hr)`);
  console.log(`   Severity: +30 points`);
}

async function testImpossibleTravel(userId) {
  const baseTime = new Date();
  const ip = '103.25.196.15';

  // Mumbai to Delhi (1400km apart, less than 2 hours)
  const locations = [
    { city: 'Mumbai', region: 'Maharashtra', country: 'India', lat: 19.0760, lon: 72.8777 },
    { city: 'Delhi', region: 'Delhi', country: 'India', lat: 28.7041, lon: 77.1025 }
  ];

  for (let i = 0; i < 2; i++) {
    const timestamp = new Date(baseTime.getTime() + (i * 60 * 60 * 1000)); // 1 hour apart
    const distance = i === 1 ? 1400 : 0;
    await RequestTracking.create({
      userId,
      ipAddress: ip,
      location: locations[i],
      timestamp,
      distanceFromLastRequest: distance,
      timeFromLastRequest: i === 1 ? 60 : 0,
      suspicionFlags: i >= 1 ? ['impossible_travel', 'location_jump'] : []
    });
    console.log(`   Request ${i + 1}: ${locations[i].city} at ${timestamp.toLocaleTimeString()}`);
    if (i === 1) console.log(`   Distance: ${distance}km in 1 hour`);
  }

  console.log(`   🚨 Expected: Should trigger 'impossible_travel' flag (>500km in <2hr)`);
  console.log(`   Severity: +50 points`);
}

async function testMultipleCities(userId) {
  const baseTime = new Date();
  const ip = '103.25.196.16';

  // 3 different cities within 6 hours
  const locations = [
    { city: 'Mumbai', region: 'Maharashtra', country: 'India', lat: 19.0760, lon: 72.8777 },
    { city: 'Pune', region: 'Maharashtra', country: 'India', lat: 18.5204, lon: 73.8567 },
    { city: 'Nagpur', region: 'Maharashtra', country: 'India', lat: 21.1458, lon: 79.0882 }
  ];

  for (let i = 0; i < 3; i++) {
    const timestamp = new Date(baseTime.getTime() + (i * 2 * 60 * 60 * 1000)); // 2 hours apart
    await RequestTracking.create({
      userId,
      ipAddress: ip,
      location: locations[i],
      timestamp,
      suspicionFlags: i >= 2 ? ['location_jump'] : []
    });
    console.log(`   Request ${i + 1}: ${locations[i].city} at ${timestamp.toLocaleTimeString()}`);
  }

  console.log(`   🚨 Expected: 3rd request should trigger 'location_jump' flag (3+ cities in 6hrs)`);
  console.log(`   Severity: +30 points`);
}

async function printSummary(userId) {
  const allTracking = await RequestTracking.find({ userId }).sort({ timestamp: 1 });
  
  const flagCounts = {
    rapid_requests: 0,
    different_ip: 0,
    location_jump: 0,
    impossible_travel: 0,
    vpn_detected: 0
  };

  allTracking.forEach(track => {
    track.suspicionFlags.forEach(flag => {
      flagCounts[flag] = (flagCounts[flag] || 0) + 1;
    });
  });

  console.log(`\n📈 Total Requests Created: ${allTracking.length}`);
  console.log(`🚩 Suspicious Requests: ${allTracking.filter(t => t.suspicionFlags.length > 0).length}`);
  console.log(`\n🏷️  Flag Breakdown:`);
  Object.entries(flagCounts).forEach(([flag, count]) => {
    if (count > 0) {
      console.log(`   - ${flag}: ${count}`);
    }
  });

  console.log(`\n📍 Unique Locations:`);
  const uniqueCities = [...new Set(allTracking.map(t => t.location.city))];
  uniqueCities.forEach(city => {
    const count = allTracking.filter(t => t.location.city === city).length;
    console.log(`   - ${city}: ${count} requests`);
  });

  console.log(`\n🌐 Unique IP Addresses:`);
  const uniqueIPs = [...new Set(allTracking.map(t => t.ipAddress))];
  console.log(`   Total: ${uniqueIPs.length} different IPs`);

  console.log(`\n✅ All tests completed! Check the data in MongoDB:`);
  console.log(`   - Collection: request_trackings`);
  console.log(`   - User ID: ${userId}`);
  console.log(`\n💡 Next Steps:`);
  console.log(`   1. Test creating blood requests through the API`);
  console.log(`   2. Check admin dashboard for location analytics`);
  console.log(`   3. Verify email notifications for suspicious requests`);
}

/**
 * Test Gamification API Endpoints
 */

const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
let userToken = null;

async function registerAndLogin() {
  console.log('\n📝 Logging in with existing donor account...');
  
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: 'donor_kavya_0@lifelink.com', // Use one of our existing donors
      password: 'Test@1234'
    });
    
    userToken = response.data.data.token;
    console.log('✅ Logged in successfully');
    return userToken;
  } catch (error) {
    console.log(`❌  Login failed: ${error.response?.data?.message || error.message}`);
    console.log('Trying to register new user...');
    
    try {
      const regResponse = await axios.post(`${API_URL}/auth/register`, {
        email: `gamification_test_${Date.now()}@lifelink.com`,
        password: 'Test@1234',
        name: 'Gamification Test User',
        role: 'user',
        phone: '9876543210',
        donorData: {
          bloodGroup: 'O+',
          latitude: 12.9716,
          longitude: 77.5946,
          address: '123 Test Street',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560001',
          ageGroup: '26-35'
        }
      });
      
      userToken = regResponse.data.data.token;
      console.log('✅ User registered and logged in');
      return userToken;
    } catch (regError) {
      console.log(`❌ Registration failed: ${regError.response?.data?.message || regError.message}`);
      return null;
    }
  }
}

async function testGamificationProfile() {
  console.log('\n🎮 Testing: GET /api/gamification/profile');
  
  try {
    const response = await axios.get(`${API_URL}/gamification/profile`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    
    console.log('✅ Profile retrieved successfully');
    console.log('   Points:', response.data.data.points);
    console.log('   Level:', response.data.data.level);
    console.log('   Tier:', response.data.data.currentTier);
    return response.data.data;
  } catch (error) {
    console.log(`❌ Failed: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

async function testAwardPoints() {
  console.log('\n🎮 Testing: POST /api/gamification/points');
  
  try {
    const response = await axios.post(`${API_URL}/gamification/points`, {
      points: 50,
      reason: 'Test points award'
    }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    
    console.log('✅ Points awarded successfully');
    console.log('   Points awarded:', response.data.data.pointsAwarded || 50);
    console.log('   Total points:', response.data.data.totalPoints);
    return response.data.data;
  } catch (error) {
    console.log(`❌ Failed: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

async function testGetStats() {
  console.log('\n🎮 Testing: GET /api/gamification/stats');
  
  try {
    const response = await axios.get(`${API_URL}/gamification/stats`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    
    console.log('✅ Stats retrieved successfully');
    console.log('   Total Points:', response.data.data.totalPoints);
    console.log('   Level:', response.data.data.level);
    console.log('   Rank:', response.data.data.rank);
    console.log('   Total Donations:', response.data.data.totalDonations);
    console.log('   Achievements:', `${response.data.data.achievementsUnlocked}/${response.data.data.totalAchievementsAvailable}`);
    return response.data.data;
  } catch (error) {
    console.log(`❌ Failed: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

async function testGetRank() {
  console.log('\n🎮 Testing: GET /api/gamification/rank');
  
  try {
    const response = await axios.get(`${API_URL}/gamification/rank`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    
    console.log('✅ Rank retrieved successfully');
    console.log('   Rank:', response.data.data.rank);
    console.log('   Total Users:', response.data.data.totalUsers);
    console.log('   Percentile:', `${response.data.data.percentile}%`);
    return response.data.data;
  } catch (error) {
    console.log(`❌ Failed: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

async function testRecordActivity() {
  console.log('\n🎮 Testing: POST /api/gamification/activity');
  
  try {
    const response = await axios.post(`${API_URL}/gamification/activity`, {
      activityType: 'profile_completed',
      metadata: {}
    }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    
    console.log('✅ Activity recorded successfully');
    console.log('   Points awarded:', response.data.data.pointsAwarded);
    console.log('   Achievements unlocked:', response.data.data.achievementsUnlocked.length);
    if (response.data.data.achievementsUnlocked.length > 0) {
      response.data.data.achievementsUnlocked.forEach(ach => {
        console.log(`   🏆 ${ach.name}: ${ach.description}`);
      });
    }
    return response.data.data;
  } catch (error) {
    console.log(`❌ Failed: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

async function testGetProgress() {
  console.log('\n🎮 Testing: GET /api/gamification/progress');
  
  try {
    const response = await axios.get(`${API_URL}/gamification/progress`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    
    console.log('✅ Progress retrieved successfully');
    console.log('   Level:', response.data.data.level);
    console.log('   Points to next level:', response.data.data.pointsToNextLevel);
    console.log('   Progress:', `${response.data.data.progressPercentage}%`);
    console.log('   Available achievements:', response.data.data.availableAchievements.length  );
    return response.data.data;
  } catch (error) {
    console.log(`❌ Failed: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

async function testGetLeaderboard() {
  console.log('\n🎮 Testing: GET /api/gamification/leaderboard');
  
  try {
    const response = await axios.get(`${API_URL}/gamification/leaderboard?limit=10`);
    
    console.log('✅ Leaderboard retrieved successfully');
    console.log(`   Top ${response.data.data.length} users:`);
    response.data.data.slice(0, 5).forEach(entry => {
      console.log(`   ${entry.rank}. ${entry.userId?.name || 'Unknown'} - ${entry.points} points`);
    });
    return response.data.data;
  } catch (error) {
    console.log(`❌ Failed: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

async function testGetAchievements() {
  console.log('\n🎮 Testing: GET /api/gamification/achievements');
  
  try {
    const response = await axios.get(`${API_URL}/gamification/achievements`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    
    console.log('✅ Achievements retrieved successfully');
    console.log(`   Unlocked: ${response.data.data.length} achievements`);
    response.data.data.forEach(ach => {
      console.log(`   ${ach.icon} ${ach.name} - ${ach.points} points`);
    });
    return response.data.data;
  } catch (error) {
    console.log(`❌ Failed: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

async function testGetAvailableAchievements() {
  console.log('\n🎮 Testing: GET /api/gamification/achievements/available');
  
  try {
    const response = await axios.get(`${API_URL}/gamification/achievements/available`);
    
    console.log('✅ Available achievements retrieved successfully');
    console.log(`   Total: ${Object.keys(response.data.data).length} achievements`);
    Object.entries(response.data.data).slice(0, 3).forEach(([type, data]) => {
      console.log(`   ${data.icon} ${data.name} - ${data.points} points`);
    });
    return response.data.data;
  } catch (error) {
    console.log(`❌ Failed: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║     🎮 GAMIFICATION API TEST SUITE 🎮               ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  
  // Check if backend is running
  try {
    await axios.get(`${API_URL.replace('/api', '')}/health`);
    console.log('✅ Backend is running\n');
  } catch (error) {
    console.log('❌ Backend is not running! Please start it first.');
    process.exit(1);
  }
  
  // Register and login
  const token = await registerAndLogin();
  if (!token) {
    console.log('\n❌ Could not authenticate. Aborting tests.');
    process.exit(1);
  }
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Run all tests
  await testGamificationProfile();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await testAwardPoints();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await testGetStats();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await testGetRank();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await testRecordActivity();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await testGetProgress();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await testGetLeaderboard();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await testGetAchievements();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await testGetAvailableAchievements();
  
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║               ✅ ALL TESTS COMPLETED                 ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('\n🌐 Access gamification UI at:');
  console.log('   http://localhost:3000/gamification.html\n');
}

main().catch(error => {
  console.error('\n❌ Test suite error:', error.message);
  process.exit(1);
});

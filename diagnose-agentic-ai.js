/**
 * Comprehensive diagnostic to check why Agentic AI isn't working
 */

const axios = require('axios');

const BACKEND_URL = 'http://localhost:5000';
const ML_URL = 'http://localhost:5001';

async function runDiagnostics() {
  console.log('\n🔍 AGENTIC AI DIAGNOSTIC REPORT');
  console.log('='.repeat(80));
  
  const results = {
    backend: false,
    ml: false,
    donors: 0,
    requests: 0,
    agentStates: 0
  };

  // 1. Check backend health
  console.log('\n1️⃣  Checking Backend Server...');
  try {
    const response = await axios.get(`${BACKEND_URL}/health`);
    console.log(`   ✅ Backend is running: ${response.data.message}`);
    results.backend = true;
  } catch (error) {
    console.log(`   ❌ Backend is NOT reachable: ${error.message}`);
    return results;
  }

  // 2. Check ML service
  console.log('\n2️⃣  Checking ML Service...');
  try {
    const response = await axios.get(`${ML_URL}/health`);
    console.log(`   ✅ ML service is running`);
    console.log(`   Model loaded: ${response.data.model_loaded}`);
    results.ml = true;
  } catch (error) {
    console.log(`   ❌ ML service is NOT reachable: ${error.message}`);
    console.log(`   This will cause agent processing to fail!`);
  }

   // 3. Test ML scoring endpoint
  console.log('\n3️⃣  Testing ML Scoring Endpoint...');
  try {
    const testData = {
      donors: [{
        donor_id: 'test123',
        distance: 5.0,
        can_donate: true,
        is_available: true,
        blood_group: 'O+',
        last_donation_days: 120,
        reliability_score: 80
      }],
      request_context: {
        blood_group: 'O+',
        urgency: 'urgent',
        units_required: 2
      }
    };
    
    const response = await axios.post(`${ML_URL}/score-donors`, testData, { timeout: 5000 });
    console.log(`   ✅ ML scoring works! Scored ${response.data.scored_donors.length} donors`);
    if (response.data.scored_donors.length > 0) {
      const donor = response.data.scored_donors[0];
      console.log(`   Sample score: ${donor.total_score}, Confidence: ${donor.confidence}`);
    }
  } catch (error) {
    console.log(`   ❌ ML scoring failed: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}, Error: ${JSON.stringify(error.response.data)}`);
    }
  }

  // 4. Check for registered donors
  console.log('\n4️⃣  Checking Registered Donors...');
  try {
    // Try to register and login to check donors
    const registerRes = await axios.post(`${BACKEND_URL}/api/auth/register`, {
      email: `diagnostic_${Date.now()}@test.com`,
      password: 'Test@1234',
      name: 'Diagnostic User',
      role: 'admin'
    });
    
    const token = registerRes.data.token;
    
    // Check donors (this might need admin auth)
    try {
      const donorsRes = await axios.get(`${BACKEND_URL}/api/admin/donors`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      results.donors = donorsRes.data.donors?.length || 0;
      console.log(`   ✅ Found ${results.donors} donors in database`);
      
      if (results.donors === 0) {
        console.log(`   ⚠️  NO DONORS FOUND! Agent needs donors to process requests.`);
      } else {
        console.log(`   First few donors:`);
        donorsRes.data.donors.slice(0, 3).forEach(donor => {
          console.log(`      - ${donor.name} (${donor.bloodGroup}) in ${donor.city}`);
        });
      }
    } catch (err) {
      console.log(`   ⚠️  Could not fetch donors: ${err.message}`);
    }
  } catch (error) {
    console.log(`   ⚠️  Could not check donors: ${error.message}`);
  }

  // 5. Summary
  console.log('\n📊 DIAGNOSTIC SUMMARY');
  console.log('='.repeat(80));
  console.log(`Backend Running:     ${results.backend ? '✅' : '❌'}`);
  console.log(`ML Service Running:  ${results.ml ? '✅' : '❌'}`);
  console.log(`Donors Available:    ${results.donors > 0 ? `✅ (${results.donors})` : '❌ (0)'}`);
  
  console.log('\n🔧 RECOMMENDATION:');
  if (!results.ml) {
    console.log('   1. Start ML service: cd ml && python app.py');
  }
  if (results.donors === 0) {
    console.log('   2. Register test donors: node create-test-donor.js');
    console.log('      Run this multiple times to create donors in different locations');
  }
  if (results.ml && results.donors > 0) {
    console.log('   ✅ System is ready! Agent processing should work now.');
  }
  
  console.log('\n' + '='.repeat(80));
}

runDiagnostics().catch(console.error);

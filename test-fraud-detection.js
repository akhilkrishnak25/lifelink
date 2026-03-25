#!/usr/bin/env node

/**
 * Location-Based Fraud Detection Test Script
 * Tests if the system properly detects fraud when 2 requests are made
 * from different cities in a short time span
 */

const http = require('http');

const API_BASE_URL = 'http://localhost:5000';

function makeRequest(method, endpoint, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, API_BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(body)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: body
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('\n' + '='.repeat(70));
  console.log(' 📍 LIFELINK LOCATION-BASED FRAUD DETECTION TEST');
  console.log('='.repeat(70) + '\n');

  try {
    // Step 1: Register test receiver
    console.log('[STEP 1] 📝 Creating test receiver account...\n');
    const email = `fraud_test_${Date.now()}@test.com`;
    
    const registerResponse = await makeRequest('POST', '/api/auth/register', {
      email: email,
      password: 'TestPassword123!',
      name: 'Fraud Detection Test',
      phone: '9876543210',
      role: 'user'
    });

    if (!registerResponse.data.success) {
      console.error('❌ Registration failed:', registerResponse.data.message);
      console.error('Errors:', registerResponse.data.errors);
      return;
    }

    const token = registerResponse.data.data.token;
    const userId = registerResponse.data.data.user.id;

    console.log('✅ Test account created successfully!');
    console.log(`   Email: ${email}`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Token: ${token.substring(0, 20)}...\n`);

    // Step 2: Create first blood request from Mumbai
    console.log('[STEP 2] 🩸 Creating FIRST blood request from MUMBAI...\n');
    console.log('   Location: Mumbai (19.0760, 72.8777)');
    console.log('   Blood Group: O+');
    console.log('   Urgency: urgent\n');

    const request1Response = await makeRequest('POST', '/api/receiver/request', {
      bloodGroup: 'O+',
      urgency: 'urgent',
      hospitalName: 'Apollo Mumbai',
      latitude: 19.0760,
      longitude: 72.8777,
      address: 'MG Road, Mumbai',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      contactNumber: '9876543210',
      unitsRequired: 2,
      patientName: 'Test Patient 1',
      description: 'First request from Mumbai'
    }, token);

    if (!request1Response.data.success) {
      console.error('❌ First request failed:', request1Response.data.message);
      return;
    }

    console.log('✅ First request created successfully!');
    console.log(`   Request ID: ${request1Response.data.data._id}`);
    if (request1Response.data.warning) {
      console.log(`   ⚠️  Warning: ${request1Response.data.warning}`);
    }
    console.log();

    // Wait 30 seconds and create second request
    console.log('[STEP 3] ⏱️  Waiting 30 seconds before second request...\n');
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Step 3: Create second blood request from Pune (150km away, <1 hour)
    console.log('[STEP 4] 🩸 Creating SECOND blood request from PUNE...\n');
    console.log('   Location: Pune (18.5204, 73.8567)');
    console.log('   Distance from Mumbai: ~150km');
    console.log('   Time gap: ~30-40 seconds');
    console.log('   Blood Group: A+');
    console.log('   Urgency: critical\n');

    const request2Response = await makeRequest('POST', '/api/receiver/request', {
      bloodGroup: 'A+',
      urgency: 'critical',
      hospitalName: 'Fortis Pune',
      latitude: 18.5204,
      longitude: 73.8567,
      address: 'Hospital Road, Pune',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
      contactNumber: '9876543211',
      unitsRequired: 1,
      patientName: 'Test Patient 2',
      description: 'Second request from Pune'
    }, token);

    console.log('✅ Second request created successfully!');
    console.log(`   Request ID: ${request2Response.data.data._id}`);
    console.log();

    // Step 4: Check for fraud detection flags
    console.log('[STEP 5] 🔍 FRAUD DETECTION RESULTS:\n');

    if (request2Response.data.warning) {
      console.log('⚠️  WARNING TRIGGERED: ' + request2Response.data.warning);
      console.log();
    }

    if (request2Response.data.severity !== undefined) {
      console.log(`📊 Severity Score: ${request2Response.data.severity}/100`);
      console.log();
    }

    if (request2Response.data.reasons && request2Response.data.reasons.length > 0) {
      console.log('🚩 Detected Patterns:');
      request2Response.data.reasons.forEach((reason, idx) => {
        console.log(`   ${idx + 1}. ${reason}`);
      });
      console.log();
    }

    if (request2Response.data.needsReview) {
      console.log('🔴 REQUEST AUTO-FLAGGED FOR ADMIN REVIEW');
      console.log();
    }

    // Summary
    console.log('='.repeat(70));
    console.log(' TEST SUMMARY');
    console.log('='.repeat(70));
    console.log();

    console.log('✅ TEST EXECUTED SUCCESSFULLY\n');
    
    console.log('Expected Detection:');
    console.log('  • Flag Type: location_jump');
    console.log('  • Reason: >50km distance in <1 hour');
    console.log('  • Expected Severity: +30 points');
    console.log();

    console.log('Actual Detection:');
    console.log(`  • Flag Triggered: ${request2Response.data.warning ? '✅ YES' : '❌ NO'}`);
    console.log(`  • Severity: ${request2Response.data.severity || 0} points`);
    console.log(`  • Auto-flagged: ${request2Response.data.needsReview ? '✅ YES' : '❌ NO'}`);
    console.log();

    if (request2Response.data.severity >= 30 && request2Response.data.warning) {
      console.log('🎉 FRAUD DETECTION WORKING CORRECTLY!\n');
    } else {
      console.log('⚠️  FRAUD DETECTION NOT TRIGGERED - Issue detected! \n');
      console.log('Full Response:');
      console.log(JSON.stringify(request2Response.data, null, 2));
    }

    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('❌ Test Error:', error.message);
    console.error();
    if (error.code === 'ECONNREFUSED') {
      console.error('🔴 Cannot connect to backend server on localhost:5000');
      console.error('   Make sure the backend server is running:');
      console.error('   cd backend && node server.js');
    }
  }
}

// Run tests
runTests();

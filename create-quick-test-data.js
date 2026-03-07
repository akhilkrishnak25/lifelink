/**
 * Quick script to create a few receivers and blood requests
 * To avoid rate limiting
 */

const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function createReceiver(name, email) {
  try {
    const response = await axios.post(`${API_URL}/auth/register`, {
      email,
      password: 'Test@1234',
      name,
      role: 'receiver',
      phone: '9876543210'
    });
    console.log(`✅ Created receiver: ${name}`);
    return response.data.data;
  } catch (error) {
    if (error.response?.data?.message?.includes('already exists')) {
      console.log(`⚠️  ${name} already exists, trying to login...`);
      try {
        const loginResponse = await axios.post(`${API_URL}/auth/login`, {
          email,
          password: 'Test@1234'
        });
        return loginResponse.data.data;
      } catch (loginErr) {
        console.log(`❌ Failed to login: ${loginErr.message}`);
        return null;
      }
    }
    console.log(`❌ Failed to create ${name}: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

async function createBloodRequest(receiverToken, bloodGroup, urgency) {
  try {
    const response = await axios.post(`${API_URL}/receiver/request`, {
      bloodGroup,
      urgency,
      hospitalName: 'Apollo Hospital',
      longitude: 77.5946,
      latitude: 12.9716,
      address: '123 Hospital Road',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      contactNumber: '9876543210',
      unitsRequired: 2,
      patientName: 'Test Patient',
      description: `Urgent requirement for ${bloodGroup}`
    }, {
      headers: { Authorization: `Bearer ${receiverToken}` }
    });
    console.log(`✅ Created ${bloodGroup} (${urgency}) request: ${response.data.data._id}`);
    return response.data.data;
  } catch (error) {
    console.log(`❌ Failed to create request: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

async function main() {
  console.log('\n🩸 Creating Test Data for LifeLink\n');
  console.log('='.repeat(50));
  
  // Create 2 receivers
  const receiver1 = await createReceiver('Test Receiver 1', 'receiver1@lifelink.com');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const receiver2 = await createReceiver('Test Receiver 2', 'receiver2@lifelink.com');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  if (receiver1?.token) {
    console.log('\n📋 Creating blood requests...\n');
    await createBloodRequest(receiver1.token, 'O+', 'urgent');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await createBloodRequest(receiver1.token, 'A+', 'normal');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  if (receiver2?.token) {
    await createBloodRequest(receiver2.token, 'B+', 'critical');
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Sample data creation completed!');
  console.log('\n📧 Test Credentials:');
  console.log('   Receiver 1: receiver1@lifelink.com / Test@1234');
  console.log('   Receiver 2: receiver2@lifelink.com / Test@1234');
  console.log('\n🌐 Login at: http://localhost:3000/login');
}

main().catch(console.error);

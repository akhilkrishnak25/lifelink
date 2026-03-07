/**
 * Create comprehensive sample data for LifeLink system testing
 * Creates: Donors, Receivers, Blood Requests, Donations, etc.
 */

const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

// Sample data templates
const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const cities = [
  { name: 'Bangalore', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
  { name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777 },
  { name: 'Delhi', state: 'Delhi', lat: 28.7041, lng: 77.1025 },
  { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707 },
  { name: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867 }
];

const firstNames = ['Rajesh', 'Priya', 'Amit', 'Sneha', 'Vikram', 'Anjali', 'Rohit', 'Kavya', 'Arjun', 'Divya'];
const lastNames = ['Kumar', 'Sharma', 'Patel', 'Reddy', 'Singh', 'Nair', 'Rao', 'Mehta', 'Gupta', 'Desai'];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generatePhone() {
  return `98${Math.floor(10000000 + Math.random() * 90000000)}`;
}

async function createDonors(count = 20) {
  console.log(`\n📝 Creating ${count} sample donors...`);
  const donors = [];
  
  for (let i = 0; i < count; i++) {
    const city = getRandomElement(cities);
    const firstName = getRandomElement(firstNames);
    const lastName = getRandomElement(lastNames);
    const bloodGroup = getRandomElement(bloodGroups);
    const age = 18 + Math.floor(Math.random() * 42); // 18-60
    const ageGroup = age < 26 ? '18-25' : age < 36 ? '26-35' : age < 46 ? '36-45' : '46-60';
    
    // Add slight variation to coordinates (within ~5km)
    const latVariation = (Math.random() - 0.5) * 0.1; // ~5km
    const lngVariation = (Math.random() - 0.5) * 0.1;
    
    const donorData = {
      email: `donor_${firstName.toLowerCase()}_${i}@lifelink.com`,
      password: 'Test@1234',
      name: `${firstName} ${lastName}`,
      role: 'user', // Use 'user' role with donorData
      phone: generatePhone(),
      donorData: {
        bloodGroup: bloodGroup,
        latitude: city.lat + latVariation,
        longitude: city.lng + lngVariation,
        address: `${Math.floor(Math.random() * 500) + 1}, ${getRandomElement(['MG Road', 'Brigade Road', 'Church Street', 'Residency Road'])}`,
        city: city.name,
        state: city.state,
        pincode: `${560000 + Math.floor(Math.random() * 100)}`,
        ageGroup: ageGroup
      }
    };
    
    try {
      const response = await axios.post(`${API_URL}/auth/register`, donorData);
      donors.push({
        id: response.data.data.user.id,
        email: donorData.email,
        name: donorData.name,
        bloodGroup: bloodGroup,
        token: response.data.data.token,
        city: city.name
      });
      console.log(`   ✅ Created donor ${i + 1}/${count}: ${donorData.name} (${bloodGroup}) in ${city.name}`);
    } catch (error) {
      if (error.response?.data?.message?.includes('already exists')) {
        console.log(`   ⚠️  Donor ${i + 1} already exists, skipping...`);
      } else {
        console.log(`   ❌ Failed to create donor ${i + 1}: ${error.response?.data?.message || error.message}`);
      }
    }
    
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return donors;
}

async function createReceivers(count = 10) {
  console.log(`\n📝 Creating ${count} sample receivers...`);
  const receivers = [];
  
  for (let i = 0; i < count; i++) {
    const city = getRandomElement(cities);
    const firstName = getRandomElement(firstNames);
    const lastName = getRandomElement(lastNames);
    
    const latVariation = (Math.random() - 0.5) * 0.1;
    const lngVariation = (Math.random() - 0.5) * 0.1;
    
    const receiverData = {
      email: `receiver_${firstName.toLowerCase()}_${i}@lifelink.com`,
      password: 'Test@1234',
      name: `${firstName} ${lastName}`,
      role: 'receiver',
      phone: generatePhone()
    };
    
    try {
      const response = await axios.post(`${API_URL}/auth/register`, receiverData);
      receivers.push({
        id: response.data.data.user.id,
        email: receiverData.email,
        name: receiverData.name,
        token: response.data.data.token,
        city: city.name,
        latitude: city.lat + latVariation,
        longitude: city.lng + lngVariation
      });
      console.log(`   ✅ Created receiver ${i + 1}/${count}: ${receiverData.name} in ${city.name}`);
    } catch (error) {
      if (error.response?.data?.message?.includes('already exists')) {
        console.log(`   ⚠️  Receiver ${i + 1} already exists, skipping...`);
      } else {
        console.log(`   ❌ Failed to create receiver ${i + 1}: ${error.response?.data?.message || error.message}`);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return receivers;
}

async function createBloodRequests(receivers, count = 5) {
  console.log(`\n📝 Creating ${count} sample blood requests...`);
  const requests = [];
  
  const urgencies = ['normal', 'urgent', 'critical'];
  
  for (let i = 0; i < Math.min(count, receivers.length); i++) {
    const receiver = receivers[i];
    const bloodGroup = getRandomElement(bloodGroups);
    const urgency = getRandomElement(urgencies);
    const city = cities.find(c => c.name === receiver.city) || cities[0];
    
    const requestData = {
      bloodGroup: bloodGroup,
      urgency: urgency,
      hospitalName: `${getRandomElement(['Apollo', 'Fortis', 'Max', 'AIIMS', 'Manipal'])} Hospital`,
      longitude: receiver.longitude || (city.lng + (Math.random() - 0.5) * 0.05),
      latitude: receiver.latitude || (city.lat + (Math.random() - 0.5) * 0.05),
      address: `${Math.floor(Math.random() * 100) + 1}, Hospital Road`,
      city: receiver.city,
      state: city.state,
      pincode: `${560000 + Math.floor(Math.random() * 100)}`,
      contactNumber: generatePhone(),
      unitsRequired: Math.floor(Math.random() * 3) + 1,
      patientName: `Patient ${getRandomElement(firstNames)} ${getRandomElement(lastNames)}`,
      description: `${urgency === 'critical' ? 'URGENT: ' : ''}Required for ${getRandomElement(['surgery', 'accident', 'medical emergency', 'treatment'])}`
    };
    
    try {
      const response = await axios.post(`${API_URL}/receiver/request`, requestData, {
        headers: { Authorization: `Bearer ${receiver.token}` }
      });
      requests.push({
        id: response.data.data._id,
        bloodGroup: bloodGroup,
        urgency: urgency,
        receiverName: receiver.name
      });
      console.log(`   ✅ Created request ${i + 1}/${count}: ${bloodGroup} (${urgency}) for ${receiver.name}`);
    } catch (error) {
      console.log(`   ❌ Failed to create request ${i + 1}: ${error.response?.data?.message || error.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Longer delay for agent processing
  }
  
  return requests;
}

async function createAdmin() {
  console.log('\n📝 Creating admin user...');
  
  const adminData = {
    email: 'admin@lifelink.com',
    password: 'Admin@1234',
    name: 'System Administrator',
    role: 'admin',
    phone: '9876543210'
  };
  
  try {
    const response = await axios.post(`${API_URL}/auth/register`, adminData);
    console.log('   ✅ Admin created successfully');
    return {
      email: adminData.email,
      token: response.data.token
    };
  } catch (error) {
    if (error.response?.data?.message?.includes('already exists')) {
      console.log('   ⚠️  Admin already exists');
      // Try to login
      try {
        const loginResponse = await axios.post(`${API_URL}/auth/login`, {
          email: adminData.email,
          password: adminData.password
        });
        return {
          email: adminData.email,
          token: loginResponse.data.token
        };
      } catch (loginError) {
        console.log('   ❌ Could not login as admin');
        return null;
      }
    } else {
      console.log(`   ❌ Failed to create admin: ${error.response?.data?.message || error.message}`);
      return null;
    }
  }
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║     🩸 LifeLink Sample Data Generator 🩸            ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  
  try {
    // Check if backend is running
    await axios.get(`${API_URL.replace('/api', '')}/health`);
    console.log('✅ Backend is running\n');
  } catch (error) {
    console.log('❌ Backend is not running! Please start it first.');
    console.log('   Run: cd backend && node server.js');
    process.exit(1);
  }
  
  // Create users
  const admin = await createAdmin();
  const donors = await createDonors(15); // Reduced from 20
  const receivers = await createReceivers(5); // Reduced from 10
  const requests = await createBloodRequests(receivers, 3); // Create 3 requests
  
  // Summary
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║                   📊 SUMMARY                         ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`✅ Admin Created:        1`);
  console.log(`✅ Donors Created:       ${donors.length}`);
  console.log(`✅ Receivers Created:    ${receivers.length}`);
  console.log(`✅ Blood Requests:       ${requests.length}`);
  console.log('\n📧 Test Credentials:');
  console.log('   Admin:    admin@lifelink.com / Admin@1234');
  console.log('   Donor:    donor_rajesh_0@lifelink.com / Test@1234');
  console.log('   Receiver: receiver_priya_0@lifelink.com / Test@1234');
  console.log('\n🌐 Access the application:');
  console.log('   Frontend: http://localhost:3000');
  console.log('   Backend:  http://localhost:5000');
  console.log('   ML API:   http://localhost:5001');
  console.log('\n✅ Sample data creation completed!\n');
}

main().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});

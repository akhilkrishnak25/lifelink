/**
 * Create Test Donor for Agentic AI Testing
 * Creates an O+ donor in Bangalore to match with test requests
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m'
};

// Test donor profile
const testDonor = {
  name: 'Raj Kumar',
  email: `test_donor_${Date.now()}@test.com`,
  password: 'Donor@123',
  phone: '9876543211',
  bloodGroup: 'O+',
  role: 'user',
  donorData: {
    bloodGroup: 'O+',
    latitude: 12.9716,  // Bangalore
    longitude: 77.5946,
    address: 'MG Road, Bangalore',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560001',
    ageGroup: '26-35'
  }
};

async function createTestDonor() {
  try {
    console.log(`\n${colors.cyan}🩸 Creating Test Donor for Agentic AI${colors.reset}\n`);

    const response = await axios.post(`${BASE_URL}/auth/register`, testDonor);
   
    console.log(`${colors.green}✓ Donor created successfully!${colors.reset}`);
    console.log(`  Email: ${testDonor.email}`);
    console.log(`  Blood Group: ${testDonor.donorData.bloodGroup}`);
    console.log(`  Location: ${testDonor.donorData.city}, ${testDonor.donorData.state}`);
    console.log(`  Coordinates: ${testDonor.donorData.latitude}, ${testDonor.donorData.longitude}`);
    
    const token = response.data.data?.token || response.data.token;
    
    // Update donor profile to mark as available
    console.log(`\n${colors.yellow}Setting donor as available...${colors.reset}`);
    
    await axios.put(`${BASE_URL}/donor/profile`, 
      { isAvailable: true },
      { headers: { Authorization: `Bearer ${token}` }}
    );
    
    console.log(`${colors.green}✓ Donor is now available for matching!${colors.reset}\n`);
    console.log(`${colors.cyan}Now run: node test-agentic-ai.js${colors.reset}\n`);

  } catch (error) {
    console.error('Error:', error.response?.data?.message || error.message);
  }
}

createTestDonor();

/**
 * Script to check a specific user's role and details
 * Usage: node scripts/check-user-role.js <email>
 * Example: node scripts/check-user-role.js kamaleshkotni@gmail.com
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address');
  console.log('Usage: node scripts/check-user-role.js <email>');
  process.exit(1);
}

async function checkUserRole() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log('='.repeat(60));
    console.log('👤 USER DETAILS');
    console.log('='.repeat(60));
    console.log(`Name:            ${user.name}`);
    console.log(`Email:           ${user.email}`);
    console.log(`Phone:           ${user.phone}`);
    console.log(`Role:            "${user.role}"`);
    console.log(`Role (hex):      ${Buffer.from(user.role).toString('hex')}`);
    console.log(`Role length:     ${user.role.length} characters`);
    console.log(`Is Active:       ${user.isActive}`);
    console.log(`Email Verified:  ${user.isEmailVerified}`);
    console.log(`Account Status:  ${user.accountStatus}`);
    console.log(`Created:         ${user.createdAt}`);
    console.log(`Last Login:      ${user.lastLogin || 'Never'}`);
    console.log('='.repeat(60));

    // Analyze role
    const normalized = user.role.trim().toLowerCase();
    const validRoles = ['user', 'donor', 'receiver', 'admin', 'super_admin'];
    
    console.log('\n📊 ROLE ANALYSIS:');
    console.log('='.repeat(60));
    console.log(`Original:        "${user.role}"`);
    console.log(`Normalized:      "${normalized}"`);
    console.log(`Is Valid:        ${validRoles.includes(normalized) ? '✅ Yes' : '❌ No'}`);
    
    if (user.role !== normalized) {
      console.log(`\n⚠️  WARNING: Role has formatting issues!`);
      console.log(`Recommended fix: Update role to "${normalized}"`);
    }

    if (!validRoles.includes(normalized)) {
      console.log(`\n❌ ERROR: Invalid role!`);
      console.log(`Valid roles: ${validRoles.join(', ')}`);
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
checkUserRole();

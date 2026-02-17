const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Super Admin credentials (hardcoded as per requirements)
const SUPER_ADMIN_EMAIL = 'akhilkrishnakondri@gmail.com';
const SUPER_ADMIN_PASSWORD = '12345678';

async function createSuperAdmin() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lifelink';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Import User model
    const User = require('../models/User');

    // Check if Super Admin already exists
    const existingAdmin = await User.findOne({ email: SUPER_ADMIN_EMAIL });

    if (existingAdmin) {
      // Update existing user to Super Admin
      console.log('User found. Updating to Super Admin...');
      
      // Only update password if needed
      let updateData = {
        role: 'super_admin',
        isActive: true,
        isEmailVerified: true,
        accountStatus: 'approved',
        createdAt: new Date('2026-01-01T00:00:00.000Z') // Before feature date
      };

      // If you want to reset password, uncomment this:
      // const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
      // updateData.password = hashedPassword;

      await User.findByIdAndUpdate(existingAdmin._id, { $set: updateData });

      console.log('✅ Super Admin updated successfully!');
      console.log('-----------------------------------');
      console.log('Email:', SUPER_ADMIN_EMAIL);
      console.log('Password: [unchanged - use your existing password or uncomment reset in script]');
      console.log('Role: super_admin');
      console.log('-----------------------------------');
    } else {
      // Create new Super Admin
      console.log('Creating new Super Admin...');
      
      const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);

      const superAdmin = await User.create({
        name: 'Super Admin',
        email: SUPER_ADMIN_EMAIL,
        password: hashedPassword,
        phone: '1234567890',
        role: 'super_admin',
        isActive: true,
        isEmailVerified: true,
        accountStatus: 'approved',
        emailOtpAttempts: 0,
        createdAt: new Date('2026-01-01T00:00:00.000Z') // Before feature date - auto-verified
      });

      console.log('✅ Super Admin created successfully!');
      console.log('-----------------------------------');
      console.log('Email:', SUPER_ADMIN_EMAIL);
      console.log('Password:', SUPER_ADMIN_PASSWORD);
      console.log('Role: super_admin');
      console.log('-----------------------------------');
      console.log('⚠️  IMPORTANT: Change the password after first login!');
    }

    console.log('\n🎉 Super Admin setup complete!');
    console.log('You can now login at: http://localhost:3000/login.html');
    
  } catch (error) {
    console.error('❌ Error creating Super Admin:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
  }
}

// Run the script
createSuperAdmin();

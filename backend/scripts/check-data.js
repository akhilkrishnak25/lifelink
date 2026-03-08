/**
 * Check Donation History and User data
 */

const mongoose = require('mongoose');
const DonationHistory = require('../models/DonationHistory');
const User = require('../models/User');
const {Gamification} = require('../models/Gamification');

const MONGODB_URI = process.env.MONGODB_URI || 
  'mongodb+srv://akhilkrishnakondri_db_user:Gr3Z0FUZGwX6G2rI@cluster0.7dzw1je.mongodb.net/lifelink?retryWrites=true&w=majority';

async function checkData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Count documents
    const donationCount = await DonationHistory.countDocuments();
    const userCount = await User.countDocuments();
    const gamificationCount = await Gamification.countDocuments();

    console.log('📊 DATABASE COUNTS:');
    console.log(`  Donations: ${donationCount}`);
    console.log(`  Users: ${userCount}`);
    console.log(`  Gamification Profiles: ${gamificationCount}\n`);

    // Get all users
    console.log('👥 USERS:');
    const users = await User.find().select('_id name email role').limit(20);
    users.forEach(u => {
      console.log(`  ${u._id} - ${u.name} (${u.email}) - ${u.role}`);
    });

    console.log('\n🩸 DONATION HISTORY (Sample):');
    const donations = await DonationHistory.find().limit(10);
    donations.forEach(d => {
      console.log(`  Donor ID: ${d.donorId}, Receiver: ${d.receiverId}, Status: ${d.status}, Date: ${d.donatedAt || d.createdAt}`);
    });

    console.log('\n🎮 GAMIFICATION PROFILES:');
    const profiles = await Gamification.find().populate('userId', 'name email');
    profiles.forEach(p => {
      console.log(`  ${p.userId?.name || 'Unknown'} - Points: ${p.points}, Level: ${p.level}, Donations: ${p.totalDonations || 0}`);
    });

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

checkData();

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function checkDonorCoverage() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://akhilkrishnakondri_db_user:Gr3Z0FUZGwX6G2rI@cluster0.7dzw1je.mongodb.net/lifelink?retryWrites=true&w=majority';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');
    
    const User = require('../models/User');
    const Donor = require('../models/Donor');
    const { Gamification } = require('../models/Gamification');
    const DonationHistory = require('../models/DonationHistory');
    
    // Count total donors
    const totalDonors = await Donor.countDocuments();
    const totalUsers = await User.countDocuments({ role: 'donor' });
    const totalGamificationProfiles = await Gamification.countDocuments();
    const totalDonations = await DonationHistory.countDocuments({ status: 'completed' });
    
    console.log('📊 DATABASE OVERVIEW:\n');
    console.log(`   Total Users with role='donor': ${totalUsers}`);
    console.log(`   Total Donor records: ${totalDonors}`);
    console.log(`   Total Gamification profiles: ${totalGamificationProfiles}`);
    console.log(`   Total completed donations: ${totalDonations}`);
    console.log('');
    
    // Find donors WITHOUT gamification profiles
    const allDonors = await Donor.find().populate('userId', 'name email');
    const gamificationUserIds = await Gamification.find().distinct('userId');
    const gamificationUserIdStrings = gamificationUserIds.map(id => id.toString());
    
    const donorsWithoutGamification = [];
    const donorsWithGamification = [];
    
    for (const donor of allDonors) {
      if (!donor.userId) continue;
      
      const userId = donor.userId._id.toString();
      
      if (gamificationUserIdStrings.includes(userId)) {
        donorsWithGamification.push(donor);
      } else {
        donorsWithoutGamification.push(donor);
      }
    }
    
    console.log(`✅ Donors WITH gamification profiles: ${donorsWithGamification.length}`);
    console.log(`❌ Donors WITHOUT gamification profiles: ${donorsWithoutGamification.length}`);
    console.log('');
    
    if (donorsWithoutGamification.length > 0) {
      console.log('❌ MISSING FROM LEADERBOARD:\n');
      donorsWithoutGamification.slice(0, 10).forEach((donor, i) => {
        console.log(`   ${i + 1}. ${donor.userId?.name || 'Unknown'} (${donor.userId?.email || 'N/A'})`);
        console.log(`      Blood Group: ${donor.bloodGroup}, City: ${donor.city}`);
      });
      
      if (donorsWithoutGamification.length > 10) {
        console.log(`   ... and ${donorsWithoutGamification.length - 10} more`);
      }
    }
    
    console.log('\n💡 SOLUTION: Create gamification profiles for all donors to include them in leaderboard');
    
    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkDonorCoverage();

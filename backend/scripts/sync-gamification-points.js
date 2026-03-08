const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function syncGamificationPoints() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://akhilkrishnakondri_db_user:Gr3Z0FUZGwX6G2rI@cluster0.7dzw1je.mongodb.net/lifelink?retryWrites=true&w=majority';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');
    
    const DonationHistory = require('../models/DonationHistory');
    const Donor = require('../models/Donor');
    const { Gamification } = require('../models/Gamification');
    
    console.log('🔄 Syncing gamification points with actual donation counts...\n');
    
    // Get all gamification profiles
    const profiles = await Gamification.find().populate('userId', 'name');
    console.log(`Found ${profiles.length} gamification profiles\n`);
    
    let updated = 0;
    let errors = 0;
    
    for (const profile of profiles) {
      if (!profile.userId) {
        console.log('⚠️  Skipping profile with no userId');
        continue;
      }
      
      const userId = profile.userId._id;
      const userName = profile.userId.name;
      
      // Find the donor record
      const donor = await Donor.findOne({ userId: userId });
      
      let actualDonationCount = 0;
      
      if (donor) {
        // Count actual completed donations
        actualDonationCount = await DonationHistory.countDocuments({
          donorId: donor._id,
          status: 'completed'
        });
      } else {
        console.log(`⚠️  ${userName}: No Donor record found`);
      }
      
      // Calculate correct points (100 per donation)
      const correctPoints = actualDonationCount * 100;
      const correctLevel = Math.floor(correctPoints / 1000) + 1;
      
      const oldPoints = profile.points || 0;
      
      // Update the profile
      profile.points = correctPoints;
      profile.level = correctLevel;
      profile.totalDonations = actualDonationCount;
      
      await profile.save();
      
      if (oldPoints !== correctPoints) {
        console.log(`✅ ${userName}:`);
        console.log(`   Donations: ${actualDonationCount}`);
        console.log(`   Points: ${oldPoints} → ${correctPoints}`);
        console.log(`   Level: ${correctLevel}`);
        updated++;
      } else {
        console.log(`✓ ${userName}: Already correct (${correctPoints} points)`);
      }
    }
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Profiles checked: ${profiles.length}`);
    console.log(`   Profiles updated: ${updated}`);
    console.log(`   Errors: ${errors}`);
    console.log(`\n✅ Gamification points now match actual donation counts!`);
    console.log(`   Points are calculated as: donations × 100`);
    
    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

syncGamificationPoints();

/**
 * Initialize Gamification Profiles for All Existing Donors
 * This script creates gamification profiles for all users who have donation history
 * but don't have a gamification profile yet.
 */

const mongoose = require('mongoose');
const DonationHistory = require('../models/DonationHistory');
const { Gamification } = require('../models/Gamification');
const User = require('../models/User');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 
  'mongodb+srv://akhilkrishnakondri_db_user:Gr3Z0FUZGwX6G2rI@cluster0.7dzw1je.mongodb.net/lifelink?retryWrites=true&w=majority';

async function initializeGamification() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('📊 Analyzing donation history...');
    
    // Get all completed donations grouped by donor
    const donationStats = await DonationHistory.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$donorId',
          totalDonations: { $sum: 1 },
          firstDonation: { $min: '$donatedAt' },
          lastDonation: { $max: '$donatedAt' },
          donations: { $push: '$$ROOT' }
        }
      }
    ]);

    console.log(`📋 Found ${donationStats.length} donors with completed donations\n`);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const stat of donationStats) {
      const donorId = stat._id;
      
      // Check if user exists
      const user = await User.findById(donorId);
      if (!user) {
        console.log(`⚠️  User ${donorId} not found, skipping...`);
        skipped++;
        continue;
      }

      // Check if gamification profile exists
      let profile = await Gamification.findOne({ userId: donorId });

      // Calculate points: 100 points per donation
      const calculatedPoints = stat.totalDonations * 100;
      const calculatedLevel = Math.floor(calculatedPoints / 1000) + 1;

      if (!profile) {
        // Create new profile
        profile = new Gamification({
          userId: donorId,
          points: calculatedPoints,
          level: calculatedLevel,
          badges: [],
          reliabilityScore: 100, // Start with perfect score
          streak: 0,
          totalDonations: stat.totalDonations,
          lastDonation: stat.lastDonation
        });

        await profile.save();
        console.log(`✅ Created profile for ${user.name}: ${calculatedPoints} points (${stat.totalDonations} donations)`);
        created++;
      } else {
        // Update existing profile if points don't match
        if (profile.points < calculatedPoints) {
          profile.points = calculatedPoints;
          profile.level = calculatedLevel;
          profile.totalDonations = stat.totalDonations;
          profile.lastDonation = stat.lastDonation;
          await profile.save();
          console.log(`🔄 Updated profile for ${user.name}: ${calculatedPoints} points (${stat.totalDonations} donations)`);
          updated++;
        } else {
          console.log(`⏭️  Skipped ${user.name}: Already has ${profile.points} points`);
          skipped++;
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Profiles Created:  ${created}`);
    console.log(`🔄 Profiles Updated:  ${updated}`);
    console.log(`⏭️  Profiles Skipped:  ${skipped}`);
    console.log(`📈 Total Processed:   ${donationStats.length}`);
    console.log('='.repeat(60));

    // Show top 10 leaderboard
    console.log('\n🏆 TOP 10 LEADERBOARD:');
    const leaderboard = await Gamification.find()
      .sort({ points: -1 })
      .limit(10)
      .populate('userId', 'name city bloodType');

    leaderboard.forEach((entry, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
      console.log(
        `${medal} ${index + 1}. ${entry.userId?.name || 'Unknown'} - ` +
        `${entry.points} points (${entry.totalDonations || 0} donations) - ` +
        `${entry.userId?.city || 'Unknown'}`
      );
    });

    console.log('\n✅ Gamification initialization complete!\n');
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the script
initializeGamification();

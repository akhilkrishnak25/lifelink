/**
 * Create Sample Gamification Profiles for Testing
 * This creates profiles for existing users to populate the leaderboard
 */

const mongoose = require('mongoose');
const { Gamification } = require('../models/Gamification');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 
  'mongodb+srv://akhilkrishnakondri_db_user:Gr3Z0FUZGwX6G2rI@cluster0.7dzw1je.mongodb.net/lifelink?retryWrites=true&w=majority';

async function createSampleProfiles() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all donor users
    const donors = await User.find({ role: 'donor' });
    console.log(`👥 Found ${donors.length} donors\n`);

    let created = 0;
    let skipped = 0;

    for (const donor of donors) {
      // Check if profile exists
      const existingProfile = await Gamification.findOne({ userId: donor._id });
      
      if (!existingProfile) {
        // Create profile with random points for demonstration
        // In production, this will be calculated from actual donations
        const randomDonations = Math.floor(Math.random() * 10) + 1; // 1-10 donations
        const points = randomDonations * 100; // 100 points per donation
        const level = Math.floor(points / 1000) + 1;

        const profile = new Gamification({
          userId: donor._id,
          points: points,
          level: level,
          badges: [],
          reliabilityScore: 85 + Math.floor(Math.random() * 15), // 85-100
          streak: 0,
          totalDonations: randomDonations,
          lastDonation: new Date()
        });

        await profile.save();
        console.log(`✅ Created profile for ${donor.name}: ${points} points (${randomDonations} donations)`);
        created++;
      } else {
        console.log(`⏭️  Profile exists for ${donor.name}`);
        skipped++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Profiles Created: ${created}`);
    console.log(`⏭️  Profiles Skipped: ${skipped}`);
    console.log('='.repeat(60 ));

    // Show leaderboard
    console.log('\n🏆 LEADERBOARD (Top 20):');
    const leaderboard = await Gamification.find()
      .sort({ points: -1 })
      .limit(20)
      .populate('userId', 'name city bloodType');

    leaderboard.forEach((entry, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
      console.log(
        `${medal} ${index + 1}. ${entry.userId?.name || 'Unknown'} - ` +
        `${entry.points} pts (${entry.totalDonations || 0} donations) - ` +
        `${entry.userId?.city || 'Unknown'} - ${entry.userId?.bloodType || '?'}`
      );
    });

    console.log('\n✅ Sample profiles created!\n');
    console.log('ℹ️  Going forward, profiles will be automatically updated when donations are completed.');
    
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

createSampleProfiles();

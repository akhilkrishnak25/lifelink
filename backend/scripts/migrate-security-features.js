const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Feature activation date - users created before this are auto-verified
const EMAIL_OTP_FEATURE_DATE = new Date('2026-02-01T00:00:00.000Z');

async function migrateExistingUsers() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lifelink';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Import User model
    const User = require('../models/User');

    console.log('\n📊 Analyzing database...');
    
    // Get counts
    const totalUsers = await User.countDocuments({});
    const existingUsers = await User.countDocuments({ 
      createdAt: { $lt: EMAIL_OTP_FEATURE_DATE } 
    });
    const newUsers = await User.countDocuments({ 
      createdAt: { $gte: EMAIL_OTP_FEATURE_DATE } 
    });

    console.log(`Total users: ${totalUsers}`);
    console.log(`Existing users (before ${EMAIL_OTP_FEATURE_DATE.toISOString()}): ${existingUsers}`);
    console.log(`New users (after feature date): ${newUsers}`);

    console.log('\n🔄 Starting migration...');

    // Update all existing users to be auto-verified and approved
    const result = await User.updateMany(
      { 
        createdAt: { $lt: EMAIL_OTP_FEATURE_DATE },
        $or: [
          { isEmailVerified: { $ne: true } },
          { accountStatus: { $ne: 'approved' } }
        ]
      },
      {
        $set: {
          isEmailVerified: true,
          accountStatus: 'approved',
          emailOtpAttempts: 0
        },
        $unset: {
          emailOtp: '',
          emailOtpExpiry: ''
        }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} existing users`);

    // Show breakdown by role
    console.log('\n📈 User Statistics:');
    const roleStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          verified: {
            $sum: { $cond: ['$isEmailVerified', 1, 0] }
          },
          approved: {
            $sum: { $cond: [{ $eq: ['$accountStatus', 'approved'] }, 1, 0] }
          }
        }
      }
    ]);

    roleStats.forEach(stat => {
      console.log(`\n${stat._id.toUpperCase()}:`);
      console.log(`  Total: ${stat.count}`);
      console.log(`  Verified: ${stat.verified}`);
      console.log(`  Approved: ${stat.approved}`);
    });

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📝 Summary:');
    console.log('- All existing users are marked as verified');
    console.log('- All existing users/admins are marked as approved');
    console.log('- New registrations will require email OTP verification');
    console.log('- New admin registrations will require Super Admin approval');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
    process.exit(0);
  }
}

// Run the migration
migrateExistingUsers();

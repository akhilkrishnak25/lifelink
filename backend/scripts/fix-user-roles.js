/**
 * Script to normalize user roles in the database
 * This script will:
 * 1. Find all users with role issues (case, whitespace, etc.)
 * 2. Normalize their roles to lowercase, trimmed values
 * 3. Report any invalid roles that need manual review
 * 
 * Usage: node scripts/fix-user-roles.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const VALID_ROLES = ['user', 'donor', 'receiver', 'admin', 'super_admin'];

async function fixUserRoles() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find all users
    const users = await User.find({});
    console.log(`\n📊 Found ${users.length} users to check\n`);

    let fixed = 0;
    let errors = 0;
    const issues = [];

    for (const user of users) {
      const originalRole = user.role;
      const normalized = (user.role || '').trim().toLowerCase();

      // Check if role needs normalization
      if (originalRole !== normalized) {
        if (VALID_ROLES.includes(normalized)) {
          console.log(`🔧 Fixing: ${user.email}`);
          console.log(`   Old role: "${originalRole}" → New role: "${normalized}"`);
          
          user.role = normalized;
          await user.save();
          fixed++;
        } else {
          console.error(`❌ Invalid role for: ${user.email}`);
          console.error(`   Role: "${originalRole}" (normalized: "${normalized}")`);
          errors++;
          issues.push({
            email: user.email,
            role: originalRole,
            normalized: normalized
          });
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY:');
    console.log('='.repeat(60));
    console.log(`✅ Fixed: ${fixed} users`);
    console.log(`❌ Errors: ${errors} users`);
    console.log(`✓ Already correct: ${users.length - fixed - errors} users`);
    
    if (issues.length > 0) {
      console.log('\n⚠️  USERS WITH INVALID ROLES (require manual fix):');
      console.log('='.repeat(60));
      issues.forEach(issue => {
        console.log(`Email: ${issue.email}`);
        console.log(`  Invalid role: "${issue.role}"`);
        console.log(`  Suggested fix: Change to one of: ${VALID_ROLES.join(', ')}\n`);
      });
    }

    console.log('\n✅ Role normalization complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
fixUserRoles();

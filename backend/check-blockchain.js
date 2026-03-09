/**
 * Check Blockchain Records
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function checkBlockchain() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const BlockchainRecord = require('./models/BlockchainRecord');
    
    const records = await BlockchainRecord.find()
      .sort({ timestamp: -1 })
      .populate('userId', 'name email')
      .populate('donationId', 'bloodGroup unitsGiven certificateNumber hospitalName');
    
    console.log(`📊 Found ${records.length} blockchain records\n`);
    
    if (records.length === 0) {
      console.log('⚠️  No blockchain records found!');
      console.log('💡 The blockchain recording feature was just implemented.');
      console.log('   Complete a new donation to create a blockchain record.\n');
    } else {
      records.forEach((record, idx) => {
        console.log(`\n🔗 BLOCKCHAIN RECORD #${idx + 1}:`);
        console.log(`   Transaction Hash: ${record.transactionHash}`);
        console.log(`   Chain: ${record.chain}`);
        console.log(`   Action: ${record.action}`);
        console.log(`   Status: ${record.status}`);
        console.log(`   Timestamp: ${record.timestamp}`);
        
        if (record.userId) {
          console.log(`   User: ${record.userId.name} (${record.userId.email})`);
        }
        
        if (record.donationId) {
          console.log(`   Blood Group: ${record.donationId.bloodGroup}`);
          console.log(`   Units: ${record.donationId.unitsGiven}`);
          console.log(`   Hospital: ${record.donationId.hospitalName}`);
          console.log(`   Certificate: ${record.donationId.certificateNumber}`);
        }
        
        console.log(`   Payload Hash: ${record.payloadHash}`);
      });
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Disconnected from MongoDB\n');
    
  } catch (error) {
    console.error('  ❌ Error:', error.message);
    process.exit(1);
  }
}

checkBlockchain();

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Create indexes for geospatial queries
    await createIndexes();
    
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    // During tests, exiting the process causes Jest worker crashes and hides root causes.
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
      throw error;
    }
    process.exit(1);
  }
};

const createIndexes = async () => {
  try {
    // These will be created when models are loaded
    console.log('✅ Database indexes will be created automatically');
  } catch (error) {
    console.error('❌ Index creation error:', error.message);
  }
};

module.exports = connectDB;

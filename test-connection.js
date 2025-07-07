import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const testConnection = async () => {
  try {
    console.log('🔄 Testing database connection...');
    
    const options = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
      maxPoolSize: 10,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
    };

    await mongoose.connect(process.env.MONGO_URI, options);
    console.log('✅ Database connection successful!');
    
    // Test a simple query
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📊 Found ${collections.length} collections in database`);
    
    // Test User model
    const User = mongoose.model('User', new mongoose.Schema({
      email: String,
      role: String
    }));
    
    const userCount = await User.countDocuments({});
    console.log(`👥 Total users in database: ${userCount}`);
    
    await mongoose.disconnect();
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    process.exit(1);
  }
};

testConnection();

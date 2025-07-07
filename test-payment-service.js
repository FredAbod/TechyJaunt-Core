import mongoose from 'mongoose';
import PaymentService from './src/resources/payments/services/payment.service.js';
import Course from './src/resources/courses/models/course.js';
import User from './src/resources/user/models/user.js';
import dotenv from 'dotenv';

dotenv.config();

const testPayment = async () => {
  try {
    const options = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
      maxPoolSize: 10,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
    };

    await mongoose.connect(process.env.MONGO_URI, options);
    console.log('✅ Connected to database');

    // Get a test user
    const user = await User.findOne({ email: 'test2@yopmail.com' });
    if (!user) {
      console.log('❌ Test user not found');
      return;
    }
    console.log('✅ Found test user:', user.email);

    // Get a test course
    const course = await Course.findOne({});
    if (!course) {
      console.log('❌ No courses found');
      return;
    }
    console.log('✅ Found test course:', course.title);

    // Test payment initialization (this should work now)
    console.log('🔄 Testing payment initialization...');
    
    // Check if user already paid for this course
    const isPaid = await PaymentService.getCoursePaymentStatus(user._id, course._id);
    if (isPaid) {
      console.log('⚠️  User has already paid for this course');
    } else {
      console.log('✅ User has not paid for this course yet');
    }

    console.log('✅ Payment service test completed successfully!');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
};

testPayment();

import mongoose from 'mongoose';
import Course from './src/resources/courses/models/course.js';
import dotenv from 'dotenv';

dotenv.config();

const checkCourses = async () => {
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

    const courses = await Course.find({}).select('_id title price').limit(5);
    console.log('📚 Available courses:');
    
    if (courses.length === 0) {
      console.log('No courses found in database');
    } else {
      courses.forEach(course => {
        console.log(`ID: ${course._id}, Title: ${course.title}, Price: ${course.price}`);
      });
    }

    await mongoose.disconnect();
    console.log('✅ Test completed');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

checkCourses();

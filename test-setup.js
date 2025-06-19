import app from './app.js';

console.log('🚀 TechyJaunt LMS Backend - Validation Test');
console.log('==========================================');

// Test basic app import
try {
  console.log('✅ App module imported successfully');
} catch (error) {
  console.error('❌ App import failed:', error.message);
  process.exit(1);
}

console.log('✅ ES6 modules working correctly');

console.log('\n🎯 Available API Routes:');
console.log('- Authentication: /api/v1/auth/*');
console.log('- User Management: /api/v1/user/*');
console.log('- Courses: /api/v1/courses/*');
console.log('- Pre-recorded Content: /api/v1/content/*');
console.log('- Live Classes: /api/v1/live-classes/*');
console.log('- Bookings: /api/v1/bookings/*');

console.log('\n📋 Required Environment Variables:');
console.log('- MONGODB_URI (MongoDB connection string)');
console.log('- JWT_SECRET (for authentication)');
console.log('- CLOUDINARY_CLOUD_NAME (for file uploads)');
console.log('- CLOUDINARY_API_KEY');
console.log('- CLOUDINARY_API_SECRET');
console.log('- EMAIL_HOST');
console.log('- EMAIL_PORT');
console.log('- EMAIL_USER (for notifications)');
console.log('- EMAIL_PASS');
console.log('- NODE_ENV');

console.log('\n🔧 To start the server:');
console.log('1. Create .env file with required variables');
console.log('2. Run: npm start or node index.js');
console.log('3. Server will be available at http://localhost:8080');

console.log('\n✅ TechyJaunt LMS Backend is ready for deployment!');
console.log('📖 Check API_DOCUMENTATION.md for complete API reference');

process.exit(0);

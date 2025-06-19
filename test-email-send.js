import dotenv from 'dotenv';
import { sendOtpEmail } from './src/utils/email/email-sender.js';

dotenv.config();

console.log('🧪 Testing OTP Email Function');
console.log('===============================');

// Test the sendOtpEmail function with a dummy OTP
const testOtpEmail = async () => {
  try {
    console.log('📧 Attempting to send test OTP email...');
    
    // Check if email credentials are set
    if (!process.env.EMAIL_NODEMAILER || !process.env.PASSWORD_NODEMAILER) {
      console.log('❌ Email credentials not set in .env file');
      console.log('Please set EMAIL_NODEMAILER and PASSWORD_NODEMAILER');
      return;
    }
    
    console.log(`📍 Using email: ${process.env.EMAIL_NODEMAILER}`);
    console.log(`🏢 Using host: ${process.env.EMAIL_HOST || 'smtp.gmail.com'}`);
    console.log(`🔌 Using port: ${process.env.EMAIL_PORT || 587}`);
    
    // Test email send (to the same email for safety)
    await sendOtpEmail(process.env.EMAIL_NODEMAILER, '123456', 'Test User');
    
    console.log('✅ Test email sent successfully!');
    console.log('Check your inbox for the OTP email.');
    
  } catch (error) {
    console.log('❌ Test email failed:', error.message);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Make sure EMAIL_NODEMAILER and PASSWORD_NODEMAILER are set in .env');
    console.log('2. If using Gmail, use an App Password (not your regular password)');
    console.log('3. Enable 2-factor authentication and generate App Password');
    console.log('4. Check that your email credentials are correct');
  }
};

testOtpEmail().then(() => {
  process.exit(0);
});

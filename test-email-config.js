import dotenv from 'dotenv';
dotenv.config();

console.log('🔧 Email Configuration Test');
console.log('============================');

const requiredEmailVars = [
  'EMAIL_NODEMAILER',
  'PASSWORD_NODEMAILER'
];

const optionalEmailVars = [
  'EMAIL_HOST',
  'EMAIL_PORT'
];

console.log('Required Email Variables:');
requiredEmailVars.forEach(envVar => {
  const value = process.env[envVar];
  console.log(`   ${envVar}: ${value ? '✅ Set' : '❌ Missing'}`);
  if (!value) {
    console.log(`      Please set ${envVar} in your .env file`);
  }
});

console.log('\nOptional Email Variables (with defaults):');
optionalEmailVars.forEach(envVar => {
  const value = process.env[envVar];
  console.log(`   ${envVar}: ${value || 'Using default'} ${value ? '✅' : '⚙️'}`);
});

console.log('\n📋 Email Configuration Guide:');
console.log('1. Create a .env file in the root directory');
console.log('2. For Gmail, use an "App Password" not your regular password');
console.log('3. Enable 2-factor authentication in Gmail');
console.log('4. Generate an App Password: https://myaccount.google.com/apppasswords');
console.log('5. Use that App Password in PASSWORD_NODEMAILER');

console.log('\n📝 Example .env configuration:');
console.log('EMAIL_HOST=smtp.gmail.com');
console.log('EMAIL_PORT=587');
console.log('EMAIL_NODEMAILER=your.email@gmail.com');
console.log('PASSWORD_NODEMAILER=your-16-char-app-password');

// Test if nodemailer import works
try {
  const { default: nodemailer } = await import('./src/utils/email/email-sender.js');
  console.log('\n✅ Email sender module imported successfully');
} catch (error) {
  console.log('\n❌ Email sender import error:', error.message);
}

process.exit(0);

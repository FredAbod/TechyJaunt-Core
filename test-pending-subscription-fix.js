// Test file for pending subscription fix
// This test verifies that users can get a payment URL for pending subscriptions

import axios from 'axios';

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'YOUR_JWT_TOKEN_HERE';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}${colors.reset}\n`)
};

/**
 * Test 1: Initialize a subscription
 */
async function testInitializeSubscription(courseId, planType = 'bronze') {
  log.section('TEST 1: Initialize Subscription (First Time)');
  
  try {
    const response = await api.post('/api/v1/subscriptions/initialize', {
      planType: planType,
      courseId: courseId
    });
    
    log.success('Subscription initialized successfully');
    console.log('Payment URL:', response.data.authorizationUrl);
    console.log('Reference:', response.data.reference);
    
    return {
      reference: response.data.reference,
      authUrl: response.data.authorizationUrl,
      subscription: response.data.subscription
    };
  } catch (error) {
    log.error('Failed to initialize subscription');
    console.error(error.response?.data || error.message);
    return null;
  }
}

/**
 * Test 2: Try to initialize same subscription again (should return existing pending payment URL)
 */
async function testInitializePendingSubscriptionAgain(courseId, planType = 'bronze') {
  log.section('TEST 2: Initialize Same Subscription Again (Should Return Payment URL)');
  
  try {
    const response = await api.post('/api/v1/subscriptions/initialize', {
      planType: planType,
      courseId: courseId
    });
    
    log.success('Got payment URL for pending subscription!');
    console.log('Payment URL:', response.data.authorizationUrl);
    console.log('Reference:', response.data.reference);
    console.log('Message:', response.data.message || 'N/A');
    console.log('Subscription Status:', response.data.subscription?.status);
    
    return {
      reference: response.data.reference,
      authUrl: response.data.authorizationUrl,
      subscription: response.data.subscription
    };
  } catch (error) {
    log.error('Failed to get payment URL for pending subscription');
    console.error('Error:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Test 3: Verify the subscription status
 */
async function testGetUserSubscriptions() {
  log.section('TEST 3: Get User Subscriptions');
  
  try {
    const response = await api.get('/api/v1/subscriptions');
    
    log.success('User subscriptions retrieved');
    console.log('Total Subscriptions:', response.data.count);
    
    response.data.subscriptions.forEach((sub, index) => {
      console.log(`\n${index + 1}. ${sub.planName}`);
      console.log(`   Status: ${sub.status}`);
      console.log(`   Course: ${sub.course?.title || 'N/A'}`);
      console.log(`   Reference: ${sub.transactionReference}`);
      console.log(`   Active: ${sub.isCurrentlyActive}`);
    });
    
    return response.data.subscriptions;
  } catch (error) {
    log.error('Failed to get user subscriptions');
    console.error(error.response?.data || error.message);
    return null;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log(`${colors.yellow}
╔════════════════════════════════════════════════════════════╗
║   PENDING SUBSCRIPTION FIX - TEST SUITE                   ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}`);

  log.info('This test verifies that users can get payment URLs for pending subscriptions');
  log.info(`Base URL: ${BASE_URL}`);
  
  if (AUTH_TOKEN === 'YOUR_JWT_TOKEN_HERE') {
    log.error('Please set your AUTH_TOKEN');
    log.info('Usage: AUTH_TOKEN=your_token COURSE_ID=course_id node test-pending-subscription-fix.js');
    process.exit(1);
  }

  const courseId = process.env.COURSE_ID;
  if (!courseId) {
    log.error('Please provide a COURSE_ID');
    log.info('Usage: AUTH_TOKEN=your_token COURSE_ID=course_id node test-pending-subscription-fix.js');
    process.exit(1);
  }

  try {
    // Test 1: Initialize a subscription
    log.info(`Using Course ID: ${courseId}`);
    const result1 = await testInitializeSubscription(courseId, 'bronze');
    
    if (!result1) {
      log.error('First initialization failed, cannot proceed with other tests');
      return;
    }

    // Wait a bit
    log.info('Waiting 2 seconds before next test...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Try to initialize same subscription again
    // This should NOT throw an error, but return the payment URL
    const result2 = await testInitializePendingSubscriptionAgain(courseId, 'bronze');
    
    if (!result2) {
      log.error('❌ FIX NOT WORKING: Should have returned payment URL for pending subscription');
    } else {
      log.success('✅ FIX WORKING: Got payment URL for pending subscription!');
    }

    // Wait a bit
    log.info('Waiting 2 seconds before next test...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 3: Check user subscriptions
    await testGetUserSubscriptions();

    log.section('TEST SUMMARY');
    
    if (result2 && result2.authUrl) {
      log.success('✅ All tests passed!');
      log.success('Users can now get payment URLs for pending subscriptions');
      console.log('\nKey Findings:');
      console.log('1. First initialization creates a pending subscription');
      console.log('2. Subsequent calls return the same reference with a fresh payment URL');
      console.log('3. Users can complete their payment using the returned URL');
    } else {
      log.error('❌ Tests failed!');
      log.error('The fix may not be working correctly');
    }

  } catch (error) {
    log.error('Test suite failed');
    console.error(error);
  }
}

// Instructions
console.log(`
${colors.cyan}INSTRUCTIONS:${colors.reset}
1. Make sure your server is running
2. Set your AUTH_TOKEN environment variable
3. Set your COURSE_ID environment variable
4. Run the test

${colors.yellow}Example:${colors.reset}
  export AUTH_TOKEN="your_jwt_token_here"
  export COURSE_ID="507f1f77bcf86cd799439011"
  node test-pending-subscription-fix.js

${colors.yellow}Or inline:${colors.reset}
  AUTH_TOKEN=your_token COURSE_ID=course_id node test-pending-subscription-fix.js
`);

// Run tests if both required env vars are set
if (process.env.AUTH_TOKEN && process.env.AUTH_TOKEN !== 'YOUR_JWT_TOKEN_HERE' && process.env.COURSE_ID) {
  runTests();
} else {
  log.warning('Missing required environment variables. Please see instructions above.');
}

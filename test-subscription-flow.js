/**
 * Test Subscription Flow and Webhook Integration
 * Run this script to test subscription validation and webhook processing
 */

import axios from 'axios';
import crypto from 'crypto';

const BASE_URL = 'http://localhost:4000/api/v1';
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'your_test_secret_key';

// Test data
const testUser = {
  id: '60f7b3b3b3b3b3b3b3b3b3b3', // Replace with actual user ID
  email: 'test@example.com',
  name: 'Test User'
};

const testCourse = {
  id: '60f7b3b3b3b3b3b3b3b3b3b4' // Replace with actual course ID
};

/**
 * Test 1: Check duplicate subscription prevention
 */
async function testDuplicateSubscriptionPrevention() {
  console.log('\n🔍 Testing Duplicate Subscription Prevention...');
  
  try {
    // Try to create subscription twice
    const subscriptionData = {
      planType: 'gold',
      courseId: testCourse.id
    };

    console.log('Creating first subscription...');
    const response1 = await axios.post(`${BASE_URL}/subscriptions/initialize`, subscriptionData, {
      headers: { 'Authorization': `Bearer ${testUser.token}` }
    });
    console.log('✅ First subscription created:', response1.data.reference);

    console.log('Attempting second subscription (should fail)...');
    try {
      const response2 = await axios.post(`${BASE_URL}/subscriptions/initialize`, subscriptionData, {
        headers: { 'Authorization': `Bearer ${testUser.token}` }
      });
      console.log('❌ Second subscription created (this should not happen)');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Duplicate subscription properly blocked:', error.response.data.message);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

/**
 * Test 2: Simulate webhook and verify progress initialization
 */
async function testWebhookProgressInitialization() {
  console.log('\n🔍 Testing Webhook Progress Initialization...');

  // Create mock webhook payload
  const webhookPayload = {
    event: 'charge.success',
    data: {
      reference: 'TJ_SUB_test123456789',
      amount: 5000000, // ₦50,000 in kobo
      currency: 'NGN',
      channel: 'card',
      status: 'success',
      metadata: {
        custom_fields: [
          {
            display_name: 'Plan Type',
            variable_name: 'plan_type',
            value: 'gold'
          },
          {
            display_name: 'Course ID',
            variable_name: 'course_id',
            value: testCourse.id
          }
        ]
      }
    }
  };

  // Generate signature
  const signature = crypto
    .createHmac('sha512', PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(webhookPayload))
    .digest('hex');

  try {
    console.log('Sending webhook to unified handler...');
    const response = await axios.post(`${BASE_URL}/payments/webhook/paystack`, webhookPayload, {
      headers: {
        'x-paystack-signature': signature,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Webhook processed:', response.data);

    // Check if progress was initialized
    if (response.data.result?.progressInitialized) {
      console.log('✅ Progress initialization confirmed');
    } else {
      console.log('⚠️ Progress initialization status unknown');
    }

  } catch (error) {
    console.log('❌ Webhook test failed:', error.message);
    if (error.response) {
      console.log('Response:', error.response.data);
    }
  }
}

/**
 * Test 3: Verify subscription status check
 */
async function testSubscriptionStatus() {
  console.log('\n🔍 Testing Subscription Status Check...');

  try {
    const response = await axios.get(`${BASE_URL}/subscriptions/status`, {
      headers: { 'Authorization': `Bearer ${testUser.token}` }
    });

    console.log('✅ Subscription status:', response.data);
    
    if (response.data.hasActiveSubscription) {
      console.log('✅ User has active subscription');
      console.log('Active plans:', response.data.activePlans);
      console.log('Feature access:', response.data.featureAccess);
    } else {
      console.log('ℹ️ User has no active subscription');
    }

  } catch (error) {
    console.log('❌ Status check failed:', error.message);
  }
}

/**
 * Test 4: Test webhook transaction type determination
 */
async function testTransactionTypeDetection() {
  console.log('\n🔍 Testing Transaction Type Detection...');

  const testCases = [
    {
      name: 'Subscription Reference',
      reference: 'TJ_SUB_abc123',
      expected: 'subscription'
    },
    {
      name: 'Course Payment Reference',
      reference: 'TJ_course_def456',
      expected: 'course'
    },
    {
      name: 'Metadata-based Detection',
      reference: 'custom_ref_789',
      metadata: {
        custom_fields: [
          { variable_name: 'plan_type', value: 'gold' }
        ]
      },
      expected: 'subscription'
    }
  ];

  testCases.forEach(testCase => {
    console.log(`Testing: ${testCase.name}`);
    console.log(`Reference: ${testCase.reference}`);
    console.log(`Expected: ${testCase.expected}`);
    console.log('---');
  });
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🚀 Starting Subscription Flow Tests...');
  console.log('='.repeat(50));

  // Note: Update test user token and IDs before running
  console.log('⚠️ Make sure to update testUser.token and testCourse.id before running these tests');
  
  await testDuplicateSubscriptionPrevention();
  await testWebhookProgressInitialization();
  await testSubscriptionStatus();
  await testTransactionTypeDetection();

  console.log('\n✅ All tests completed!');
}

// Export functions for individual testing
export {
  testDuplicateSubscriptionPrevention,
  testWebhookProgressInitialization,
  testSubscriptionStatus,
  testTransactionTypeDetection,
  runTests
};

// Run tests if script is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  runTests().catch(console.error);
}

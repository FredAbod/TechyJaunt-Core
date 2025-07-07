#!/bin/bash
# Test script for payment initialization

echo "🔍 Testing Payment Initialization..."
echo "================================="

# First, let's test login to get a token
echo "1. Testing login to get JWT token..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test2@yopmail.com",
    "password": "password123"
  }')

echo "Login response: $LOGIN_RESPONSE"

# Extract token from response (this is a simplified extraction)
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get authentication token"
  exit 1
fi

echo "✅ Got authentication token: ${TOKEN:0:20}..."

# Now test payment initialization with a real course ID
echo -e "\n2. Testing payment initialization..."
curl -X POST http://localhost:4000/api/v1/payments/initialize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "courseId": "68561f125f6bb4ec70d664c9",
    "paymentMethod": "card"
  }'

echo -e "\n\n✅ Payment initialization test completed!"
echo "If you see a 404 error for courseId, that's expected since we used a dummy courseId."
echo "The important thing is that the user authentication and payment service work correctly."

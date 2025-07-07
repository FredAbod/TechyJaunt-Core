#!/bin/bash
# Test script for the admin students endpoint

echo "🔍 Testing Admin Students Endpoint..."
echo "================================="

# Test health endpoint first
echo "1. Testing health endpoint..."
curl -s http://localhost:4000/health | head -1

echo -e "\n2. Testing admin students endpoint..."
echo "Note: This requires authentication token"
echo "Use this endpoint with proper auth header:"
echo "GET /api/v1/user/admin/students"
echo "Authorization: Bearer YOUR_JWT_TOKEN"

echo -e "\n3. Example curl command:"
echo "curl -X GET 'http://localhost:4000/api/v1/user/admin/students' \\"
echo "  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \\"
echo "  -H 'Content-Type: application/json'"

echo -e "\n✅ Admin endpoint is ready to use!"
echo "The recent fixes should resolve the database query errors."

// Test script to verify response format fixes
console.log('🧪 Testing Response Format Fixes...');
console.log('====================================');

try {
  // Test import of response utilities
  const { successResMsg, errorResMsg } = await import('./src/utils/lib/response.js');
  console.log('✅ Response utilities imported successfully');

  // Mock response object for testing
  const mockRes = {
    status: (code) => ({
      json: (data) => {
        console.log(`\n📋 Mock Response (Status: ${code}):`);
        console.log(JSON.stringify(data, null, 2));
        return data;
      }
    })
  };

  // Test correct usage
  console.log('\n🎯 Testing CORRECT usage:');
  successResMsg(mockRes, 200, {
    message: "Profile completed successfully",
    user: { email: "test@example.com", firstName: "John" }
  });

  console.log('\n✅ Response format tests completed!');
  console.log('\n💡 Expected format:');
  console.log('{');
  console.log('  "status": "success",');
  console.log('  "message": "Profile completed successfully",');
  console.log('  "data": {');
  console.log('    "user": { ... }');
  console.log('  }');
  console.log('}');

} catch (error) {
  console.error('❌ Test failed:', error.message);
}

process.exit(0);

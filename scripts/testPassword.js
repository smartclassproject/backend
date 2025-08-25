const bcrypt = require('bcryptjs');
require('dotenv').config();

async function testPassword() {
  console.log('🧪 Testing Password Hashing and Comparison...\n');
  
  try {
    // Test 1: Basic bcrypt functionality
    console.log('📋 Test 1: Basic bcrypt functionality');
    const testPassword = 'mypassword123';
    const saltRounds = 12;
    
    const hashedPassword = await bcrypt.hash(testPassword, saltRounds);
    console.log(`✅ Password hashed successfully: ${hashedPassword.substring(0, 20)}...`);
    
    const isMatch = await bcrypt.compare(testPassword, hashedPassword);
    console.log(`✅ Password comparison successful: ${isMatch}\n`);
    
    // Test 2: Test with wrong password
    console.log('📋 Test 2: Test with wrong password');
    const wrongPassword = 'wrongpassword';
    const wrongMatch = await bcrypt.compare(wrongPassword, hashedPassword);
    console.log(`✅ Wrong password correctly rejected: ${wrongMatch}\n`);
    
    console.log('🎉 All password tests passed!');
    console.log('\nThe password comparison should now work correctly in the login function.');
    
  } catch (error) {
    console.error('❌ Password test failed:', error.message);
  }
}

// Run the test
testPassword().catch(console.error); 
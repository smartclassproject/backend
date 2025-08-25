require('dotenv').config();
const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';
const SUPER_ADMIN_TOKEN = process.env.SUPER_ADMIN_TOKEN || 'your-super-admin-token-here';

// Test data
const testAdmin = {
  firstName: 'Test',
  lastName: 'Admin',
  email: 'testadmin@example.com',
  role: 'school_admin',
  schoolId: '64f1a2b3c4d5e6f7g8h9i0j2', // Replace with actual school ID
  phone: '+1234567890'
};

async function testAdminFeatures() {
  console.log('🧪 Testing Admin Management Features...\n');

  try {
    // Step 1: Create a new admin user
    console.log('📝 Step 1: Creating new admin user...');
    const createResponse = await axios.post(`${API_BASE_URL}/admins`, testAdmin, {
      headers: {
        'Authorization': `Bearer ${SUPER_ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (createResponse.data.success) {
      console.log('✅ Admin user created successfully');
      console.log('   Email sent to:', testAdmin.email);
      console.log('   Admin ID:', createResponse.data.data._id);
    } else {
      console.log('❌ Failed to create admin:', createResponse.data.message);
      return;
    }

    // Step 2: Test resend password setup email
    console.log('\n📧 Step 2: Testing resend password setup email...');
    try {
      const resendResponse = await axios.post(`${API_BASE_URL}/admins/resend-password-setup`, {
        email: testAdmin.email
      });

      if (resendResponse.data.success) {
        console.log('✅ Password setup email resent successfully');
      } else {
        console.log('❌ Failed to resend email:', resendResponse.data.message);
      }
    } catch (error) {
      console.log('❌ Resend email failed:', error.response?.data?.message || error.message);
    }

    // Step 3: Test manual password creation (super admin only)
    console.log('\n🔐 Step 3: Testing manual password creation...');
    try {
      const manualPasswordResponse = await axios.post(`${API_BASE_URL}/admins/create-password-manually`, {
        adminId: createResponse.data.data._id,
        password: 'manualpassword123'
      }, {
        headers: {
          'Authorization': `Bearer ${SUPER_ADMIN_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (manualPasswordResponse.data.success) {
        console.log('✅ Password created manually successfully');
        console.log('   Admin can now log in with the manual password');
      } else {
        console.log('❌ Manual password creation failed:', manualPasswordResponse.data.message);
      }
    } catch (error) {
      console.log('❌ Manual password creation failed:', error.response?.data?.message || error.message);
    }

    // Step 4: Test login with the manually created password
    console.log('\n🔑 Step 4: Testing login with manual password...');
    try {
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: testAdmin.email,
        password: 'manualpassword123'
      });

      if (loginResponse.data.success) {
        console.log('✅ Login successful with manual password');
        console.log('   JWT Token received');
        console.log('   User role:', loginResponse.data.data.user.role);
      } else {
        console.log('❌ Login failed:', loginResponse.data.message);
      }
    } catch (error) {
      console.log('❌ Login failed:', error.response?.data?.message || error.message);
    }

    // Step 5: List all admins to see password setup status
    console.log('\n📋 Step 5: Listing all admins with password setup status...');
    try {
      const listResponse = await axios.get(`${API_BASE_URL}/admins`, {
        headers: {
          'Authorization': `Bearer ${SUPER_ADMIN_TOKEN}`
        }
      });

      if (listResponse.data.success) {
        console.log('✅ Admin list retrieved successfully');
        const admins = listResponse.data.data;
        
        admins.forEach(admin => {
          const status = admin.needsPasswordSetup ? '❌ Needs Password' : '✅ Password Set';
          console.log(`   ${admin.name} (${admin.email}) - ${status}`);
        });
      } else {
        console.log('❌ Failed to retrieve admin list:', listResponse.data.message);
      }
    } catch (error) {
      console.log('❌ Admin list retrieval failed:', error.response?.data?.message || error.message);
    }

    console.log('\n🎉 Admin feature testing completed!');

  } catch (error) {
    console.error('💥 Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Status:', error.response.status);
    }
  }
}

// Helper function to check if required environment variables are set
function checkEnvironment() {
  console.log('🔍 Checking environment configuration...');
  
  const required = ['SUPER_ADMIN_TOKEN'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.log('❌ Missing required environment variables:');
    missing.forEach(key => console.log(`   - ${key}`));
    console.log('\nPlease set these in your .env file or as environment variables.');
    return false;
  }
  
  console.log('✅ Environment configuration looks good');
  return true;
}

// Run the test
if (checkEnvironment()) {
  testAdminFeatures();
} else {
  console.log('\n💡 To run this test:');
  console.log('1. Set SUPER_ADMIN_TOKEN in your .env file');
  console.log('2. Make sure your backend server is running');
  console.log('3. Update the schoolId in the test data');
  console.log('4. Run: npm run test-admin-features');
} 
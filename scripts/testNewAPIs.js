const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000/api';
const TEST_TOKEN = 'your_test_token_here'; // Replace with actual token

// Test the new school-specific APIs
async function testNewAPIs() {
  console.log('🧪 Testing New School-Specific APIs...\n');

  try {
    // Test 1: Get school devices
    console.log('📱 Testing GET /api/devices/school/devices');
    try {
      const devicesResponse = await axios.get(`${BASE_URL}/devices/school/devices`, {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`,
          'Content-Type': 'application/json'
        },
        params: {
          page: 1,
          limit: 5,
          search: '',
          isActive: true
        }
      });
      
      console.log('✅ School devices API response:', {
        status: devicesResponse.status,
        dataCount: devicesResponse.data.data?.length || 0,
        pagination: devicesResponse.data.pagination
      });
    } catch (error) {
      console.log('❌ School devices API error:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message
      });
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 2: Get school attendance
    console.log('📊 Testing GET /api/attendance/school/attendance');
    try {
      const attendanceResponse = await axios.get(`${BASE_URL}/attendance/school/attendance`, {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`,
          'Content-Type': 'application/json'
        },
        params: {
          page: 1,
          limit: 5,
          search: '',
          status: 'Present',
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        }
      });
      
      console.log('✅ School attendance API response:', {
        status: attendanceResponse.status,
        dataCount: attendanceResponse.data.data?.length || 0,
        pagination: attendanceResponse.data.pagination
      });
    } catch (error) {
      console.log('❌ School attendance API error:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message
      });
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 3: Test with different query parameters
    console.log('🔍 Testing with different query parameters');
    
    // Test devices with status filter
    try {
      const devicesWithStatus = await axios.get(`${BASE_URL}/devices/school/devices`, {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`,
          'Content-Type': 'application/json'
        },
        params: {
          status: 'Operational',
          classroom: 'Room 101'
        }
      });
      
      console.log('✅ Devices with status filter:', {
        status: devicesWithStatus.status,
        dataCount: devicesWithStatus.data.data?.length || 0
      });
    } catch (error) {
      console.log('❌ Devices with status filter error:', error.response?.data?.message || error.message);
    }

    // Test attendance with course filter
    try {
      const attendanceWithCourse = await axios.get(`${BASE_URL}/attendance/school/attendance`, {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`,
          'Content-Type': 'application/json'
        },
        params: {
          courseId: 'test_course_id', // Replace with actual course ID
          classroom: 'Room 101'
        }
      });
      
      console.log('✅ Attendance with course filter:', {
        status: attendanceWithCourse.status,
        dataCount: attendanceWithCourse.data.data?.length || 0
      });
    } catch (error) {
      console.log('❌ Attendance with course filter error:', error.response?.data?.message || error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test unauthorized access
async function testUnauthorizedAccess() {
  console.log('\n🚫 Testing Unauthorized Access...\n');

  try {
    // Test without token
    console.log('🔒 Testing without authentication token');
    try {
      await axios.get(`${BASE_URL}/devices/school/devices`);
      console.log('❌ Should have failed without token');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected without token (401)');
      } else {
        console.log('❌ Unexpected response without token:', error.response?.status);
      }
    }

    // Test with invalid role
    console.log('\n🔒 Testing with invalid role (if you have a non-admin token)');
    // This would require a token with a different role to test properly
    
  } catch (error) {
    console.error('❌ Unauthorized access test failed:', error.message);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting API Tests...\n');
  
  await testNewAPIs();
  await testUnauthorizedAccess();
  
  console.log('\n✨ API Tests completed!');
}

// Export for use in other scripts
module.exports = {
  testNewAPIs,
  testUnauthorizedAccess,
  runTests
};

// Run if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

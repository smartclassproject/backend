/**
 * Example: How to create a school admin with school ID
 * 
 * This script demonstrates the process of:
 * 1. Getting available schools
 * 2. Creating a school admin with the required school ID
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000/api';
const SUPER_ADMIN_CREDENTIALS = {
  email: 'superadmin@smartclass.com',
  password: 'SuperAdmin123!'
};

// Helper function to make authenticated requests
const makeAuthenticatedRequest = async (token, method, endpoint, data = null) => {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
  
  if (data) {
    config.data = data;
  }
  
  return axios(config);
};

const createSchoolAdminExample = async () => {
  try {
    console.log('🚀 Starting School Admin Creation Example\n');
    
    // Step 1: Login as super admin
    console.log('1️⃣ Logging in as super admin...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, SUPER_ADMIN_CREDENTIALS);
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful\n');
    
    // Step 2: Get available schools
    console.log('2️⃣ Fetching available schools...');
    const schoolsResponse = await makeAuthenticatedRequest(token, 'GET', '/admins/schools');
    const schools = schoolsResponse.data.data;
    
    if (schools.length === 0) {
      console.log('❌ No schools available. Please create a school first.');
      return;
    }
    
    console.log('✅ Available schools:');
    schools.forEach(school => {
      console.log(`   - ${school.name} (ID: ${school._id})`);
    });
    console.log('');
    
    // Step 3: Create school admin
    console.log('3️⃣ Creating school admin...');
    const schoolId = schools[0]._id; // Use the first available school
    
    const newSchoolAdmin = {
      username: 'schooladmin1',
      email: 'schooladmin1@smartclass.com',
      password: 'SchoolAdmin123!',
      role: 'school_admin',
      schoolId: schoolId, // REQUIRED for school_admin role
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '+1234567890'
    };
    
    const createResponse = await makeAuthenticatedRequest(
      token, 
      'POST', 
      '/admins', 
      newSchoolAdmin
    );
    
    console.log('✅ School admin created successfully!');
    console.log('📋 Admin details:');
    console.log(`   Username: ${createResponse.data.data.username}`);
    console.log(`   Email: ${createResponse.data.data.email}`);
    console.log(`   Role: ${createResponse.data.data.role}`);
    console.log(`   School: ${schools[0].name}`);
    console.log('');
    
    // Step 4: Test login with new school admin
    console.log('4️⃣ Testing login with new school admin...');
    const testLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: newSchoolAdmin.email,
      password: newSchoolAdmin.password
    });
    
    console.log('✅ School admin login successful!');
    console.log(`   Token: ${testLoginResponse.data.data.token.substring(0, 50)}...`);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
    
    if (error.response?.status === 400) {
      console.log('\n💡 Common issues:');
      console.log('   - Make sure you have created a school first');
      console.log('   - Check that the school ID is valid');
      console.log('   - Ensure the email/username is unique');
    }
  }
};

// Run the example
createSchoolAdminExample(); 
const mongoose = require('mongoose');
const AdminUser = require('../models/AdminUser');
require('dotenv').config();

// Super admin credentials
const SUPER_ADMIN_CREDENTIALS = {
  email: 'superadmin@smartclass.com',
  password: 'SuperAdmin123!',
  role: 'super_admin',
  isActive: true
};

const createSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB Atlas');

    // Check if super admin already exists
    const existingAdmin = await AdminUser.findOne({ 
      email: SUPER_ADMIN_CREDENTIALS.email 
    });

    if (existingAdmin) {
      console.log('⚠️  Super admin already exists with email:', SUPER_ADMIN_CREDENTIALS.email);
      console.log('   You can use these credentials to login:');
      console.log('   Email:', SUPER_ADMIN_CREDENTIALS.email);
      console.log('   Password:', SUPER_ADMIN_CREDENTIALS.password);
      return;
    }

    // Create new super admin
    const superAdmin = new AdminUser(SUPER_ADMIN_CREDENTIALS);
    await superAdmin.save();

    console.log('✅ Super admin created successfully!');
    console.log('📧 Email:', SUPER_ADMIN_CREDENTIALS.email);
    console.log('🔑 Password:', SUPER_ADMIN_CREDENTIALS.password);
    console.log('👤 Role:', SUPER_ADMIN_CREDENTIALS.role);
    console.log('');
    console.log('🚀 You can now login to the SmartClass API using these credentials');
    console.log('   POST /api/auth/login');
    console.log('   Body: { "email": "superadmin@smartclass.com", "password": "SuperAdmin123!" }');

  } catch (error) {
    console.error('❌ Error creating super admin:', error.message);
    if (error.code === 11000) {
      console.log('   This email is already registered');
    }
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
};

// Run the script
createSuperAdmin(); 
const AdminUser = require('../models/AdminUser');
const School = require('../models/School');
const { sendResponse, sendError } = require('../utils/response');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const emailService = require('../utils/emailService');
const PasswordToken = require('../models/PasswordToken');

/**
 * Get all admin users with pagination and filtering
 */
const getAllAdmins = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      role = '',
      schoolId = '',
      isActive = ''
    } = req.query;

    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = {};
    
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) {
      filter.role = role;
    }
    
    if (schoolId) {
      filter.schoolId = schoolId;
    }
    
    if (isActive !== '') {
      filter.isActive = isActive === 'true';
    }

    // Get total count
    const total = await AdminUser.countDocuments(filter);
    
    // Get admins with pagination
    const admins = await AdminUser.find(filter)
      .populate('schoolId', 'name location')
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Add password setup status for each admin
    const adminsWithStatus = admins.map(admin => {
      const adminObj = admin.toObject();
      adminObj.needsPasswordSetup = !admin.passwordSetup;
      return adminObj;
    });

    const pages = Math.ceil(total / limit);

    sendResponse(res, 200, {
      data: adminsWithStatus,
      pagination: {
        page: parseInt(page),
        total,
        pages
      }
    });
  } catch (error) {
    sendError(res, 500, 'Error fetching admin users', error);
  }
};

/**
 * Get admin user by ID
 */
const getAdminById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const admin = await AdminUser.findById(id)
      .populate('schoolId', 'name location')
      .select('-password');

    if (!admin) {
      return sendError(res, 404, 'Admin user not found');
    }

    // Check if user has permission to view this admin
    if (req.user.role === 'school_admin' && req.user.schoolId.toString() !== admin.schoolId.toString()) {
      return sendError(res, 403, 'Access denied');
    }

    sendResponse(res, 200, { data: admin });
  } catch (error) {
    sendError(res, 500, 'Error fetching admin user', error);
  }
};

/**
 * Create new admin user
 */
const createAdmin = async (req, res) => {
  let admin = null;
  let passwordToken = null;
  
  try {
    const {
      email,
      role,
      schoolId,
      firstName,
      lastName,
      phone
    } = req.body;

    // Check if email already exists
    const existingEmail = await AdminUser.findOne({ email });
    if (existingEmail) {
      return sendError(res, 400, 'Email already exists');
    }

    // Verify school exists if schoolId is provided
    if (schoolId) {
      const school = await School.findById(schoolId);
      if (!school) {
        return sendError(res, 400, 'School not found');
      }
    }

    // Get school information for email (do this before creating admin)
    let schoolInfo = null;
    if (schoolId) {
      schoolInfo = await School.findById(schoolId).select('name location');
    }

    // Create admin user without password
    admin = new AdminUser({
      email,
      role,
      schoolId,
      name: `${firstName} ${lastName}`,
      phone,
      passwordSetup: false // Password setup is pending
    });

    // Save admin user
    await admin.save();

    // Create password setup token
    passwordToken = await PasswordToken.createToken(admin._id, 'AdminUser', 'setup');

    // Try to send password setup email (but don't fail if it doesn't work)
    let emailSent = false;
    try {
      await emailService.sendPasswordSetupEmail(
        admin.email,
        passwordToken.token,
        firstName,
        role,
        schoolInfo
      );
      emailSent = true;
      console.log(`✅ Password setup email sent successfully to ${email}`);
    } catch (emailError) {
      console.error(`⚠️ Failed to send password setup email to ${email}:`, emailError.message);
      console.log(`💡 Admin user created successfully. Use resend endpoint or manual password creation if needed.`);
      
      // Note: We don't delete the admin or token - they can still use resend or manual creation
    }

    // Return admin without password
    const adminResponse = admin.toObject();
    delete adminResponse.password;

    // Return success response regardless of email status
    if (emailSent) {
      return sendResponse(res, 201, { 
        data: adminResponse,
        message: 'Admin user created successfully. Password setup email has been sent.'
      });
    } else {
      return sendResponse(res, 201, { 
        data: adminResponse,
        message: 'Admin user created successfully. Password setup email could not be sent. Use resend endpoint or contact super admin for manual password setup.',
        warning: 'Email delivery failed - admin can use resend endpoint or super admin can create password manually'
      });
    }
    
  } catch (error) {
    console.error('Error in createAdmin:', error);
    
    // Cleanup: Delete any created resources if something failed
    if (admin && admin._id) {
      try {
        await AdminUser.findByIdAndDelete(admin._id);
        console.log(`Cleaned up admin user: ${admin._id}`);
      } catch (cleanupError) {
        console.error('Failed to cleanup admin user:', cleanupError);
      }
    }
    
    if (passwordToken && passwordToken._id) {
      try {
        await PasswordToken.findByIdAndDelete(passwordToken._id);
        console.log(`Cleaned up password token: ${passwordToken._id}`);
      } catch (cleanupError) {
        console.error('Failed to cleanup password token:', cleanupError);
      }
    }
    
    return sendError(res, 500, 'Error creating admin user', error);
  }
};

/**
 * Update admin user
 */
const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const admin = await AdminUser.findById(id);
    if (!admin) {
      return sendError(res, 404, 'Admin user not found');
    }

    // Check if email is being updated and if it already exists
    if (updateData.email && updateData.email !== admin.email) {
      const existingEmail = await AdminUser.findOne({ 
        email: updateData.email,
        _id: { $ne: id }
      });
      if (existingEmail) {
        return sendError(res, 400, 'Email already exists');
      }
    }

    // Verify school exists if schoolId is being updated
    if (updateData.schoolId) {
      const school = await School.findById(updateData.schoolId);
      if (!school) {
        return sendError(res, 400, 'School not found');
      }
    }

    // Update admin

    // add the name 
    updateData.name = `${updateData.firstName} ${updateData.lastName}`;
    delete updateData.firstName;
    delete updateData.lastName;

    const updatedAdmin = await AdminUser.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('schoolId', 'name location').select('-password');

    sendResponse(res, 200, { 
      data: updatedAdmin,
      message: 'Admin user updated successfully'
    });
  } catch (error) {
    sendError(res, 500, 'Error updating admin user', error);
  }
};

/**
 * Delete admin user
 */
const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await AdminUser.findById(id);
    if (!admin) {
      return sendError(res, 404, 'Admin user not found');
    }

    // Prevent deletion of the last super admin
    if (admin.role === 'super_admin') {
      const superAdminCount = await AdminUser.countDocuments({ role: 'super_admin' });
      if (superAdminCount <= 1) {
        return sendError(res, 400, 'Cannot delete the last super admin');
      }
    }

    await AdminUser.findByIdAndDelete(id);

    return sendResponse(res, 200, { 
      message: 'Admin user deleted successfully'
    });
    
  } catch (error) {
    sendError(res, 500, 'Error deleting admin user', error);
  }
};

/**
 * Toggle admin user active status
 */
const toggleAdminStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await AdminUser.findById(id);
    if (!admin) {
      return sendError(res, 404, 'Admin user not found');
    }

    // Prevent deactivating the last super admin
    if (admin.role === 'super_admin' && admin.isActive) {
      const activeSuperAdminCount = await AdminUser.countDocuments({ 
        role: 'super_admin', 
        isActive: true 
      });
      if (activeSuperAdminCount <= 1) {
        return sendError(res, 400, 'Cannot deactivate the last active super admin');
      }
    }

    admin.isActive = !admin.isActive;
    await admin.save();

    sendResponse(res, 200, { 
      data: { isActive: admin.isActive },
      message: `Admin user ${admin.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    sendError(res, 500, 'Error toggling admin status', error);
  }
};

/**
 * Change admin user password
 */
const changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    const admin = await AdminUser.findById(id);
    if (!admin) {
      return sendError(res, 404, 'Admin user not found');
    }

    // Check if user has permission to change this password
    if (req.user.role === 'school_admin' && req.user._id.toString() !== id) {
      return sendError(res, 403, 'Access denied');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, admin.password);
    if (!isPasswordValid) {
      return sendError(res, 400, 'Current password is incorrect');
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    admin.password = hashedPassword;
    await admin.save();

    sendResponse(res, 200, { 
      message: 'Password changed successfully'
    });
  } catch (error) {
    sendError(res, 500, 'Error changing password', error);
  }
};

/**
 * Get current admin profile
 */
const getMyProfile = async (req, res) => {
  try {
    const admin = await AdminUser.findById(req.user._id)
      .populate('schoolId', 'name location')
      .select('-password');

    sendResponse(res, 200, { data: admin });
  } catch (error) {
    sendError(res, 500, 'Error fetching profile', error);
  }
};

/**
 * Update current admin profile
 */
const updateMyProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;

    const admin = await AdminUser.findByIdAndUpdate(
      req.user._id,
      { firstName, lastName, phone },
      { new: true, runValidators: true }
    ).populate('schoolId', 'name location').select('-password');

    sendResponse(res, 200, { 
      data: admin,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    sendError(res, 500, 'Error updating profile', error);
  }
};

/**
 * Get available schools for admin creation
 */
const getAvailableSchools = async (req, res) => {
  try {
    const schools = await School.find({})
      .select('_id name location')
      .sort({ name: 1 });

    sendResponse(res, 200, { 
      data: schools,
      message: 'Available schools retrieved successfully'
    });
  } catch (error) {
    sendError(res, 500, 'Error fetching available schools', error);
  }
};



/**
 * Request password reset
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return sendError(res, 400, 'Email is required');
    }

    // Find admin by email
    const admin = await AdminUser.findOne({ email: email.toLowerCase() });
    if (!admin) {
      // Don't reveal if email exists or not for security
      return sendResponse(res, 200, { 
        message: 'If an account with this email exists, a password reset email has been sent.'
      });
    }

    // Check if admin has set up their password
    if (!admin.passwordSetup) {
      return sendError(res, 400, 'Please complete your initial password setup first');
    }

    // Create password reset token
    const passwordToken = await PasswordToken.createToken(admin._id, 'AdminUser', 'reset');

    // Send password reset email
    try {
      await emailService.sendPasswordResetEmail(
        admin.email,
        passwordToken.token,
        admin.name.split(' ')[0] || 'User'
      );
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Delete the token if email fails
      await PasswordToken.findByIdAndDelete(passwordToken._id);
      return sendError(res, 500, 'Failed to send password reset email. Please try again.');
    }

    sendResponse(res, 200, { 
      message: 'If an account with this email exists, a password reset email has been sent.'
    });
  } catch (error) {
    sendError(res, 500, 'Error processing password reset request', error);
  }
};

/**
 * Resend password setup email
 */
const resendPasswordSetupEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return sendError(res, 400, 'Email is required');
    }

    // Find admin by email
    const admin = await AdminUser.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return sendError(res, 404, 'Admin user not found');
    }

    // Check if admin already has password set up
    if (admin.passwordSetup) {
      return sendError(res, 400, 'Admin user already has password set up');
    }

    // Delete any existing unused tokens for this user
    await PasswordToken.deleteMany({ 
      userId: admin._id, 
      type: 'setup', 
      used: false 
    });

    // Create new password setup token
    const passwordToken = await PasswordToken.createToken(admin._id, 'AdminUser', 'setup');

    // Get school information if available
    let schoolInfo = null;
    if (admin.schoolId) {
      schoolInfo = await School.findById(admin.schoolId).select('name location');
    }

    // Send password setup email
    try {
      await emailService.sendPasswordSetupEmail(
        admin.email,
        passwordToken.token,
        admin.name.split(' ')[0] || 'User',
        admin.role,
        schoolInfo
      );
    } catch (emailError) {
      console.error('Failed to resend password setup email:', emailError);
      // Delete the token if email fails
      await PasswordToken.findByIdAndDelete(passwordToken._id);
      return sendError(res, 500, 'Failed to resend password setup email. Please try again.');
    }

    sendResponse(res, 200, { 
      message: 'Password setup email has been resent successfully.'
    });
  } catch (error) {
    sendError(res, 500, 'Error resending password setup email', error);
  }
};

/**
 * Create password manually (super admin only)
 */
const createPasswordManually = async (req, res) => {
  try {
    const { adminId, password } = req.body;

    if (!adminId || !password) {
      return sendError(res, 400, 'Admin ID and password are required');
    }

    if (password.length < 4) {
      return sendError(res, 400, 'Password must be at least 4 characters long');
    }

    // Check if current user is super admin
    if (req.user.role !== 'super_admin') {
      return sendError(res, 403, 'Only super admins can create passwords manually');
    }

    // Find the admin user
    const admin = await AdminUser.findById(adminId);
    if (!admin) {
      return sendError(res, 404, 'Admin user not found');
    }

    // Check if admin already has password set up
    if (admin.passwordSetup) {
      return sendError(res, 400, 'Admin user already has password set up');
    }

    // Hash the password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update admin with password and mark as set up
    admin.password = hashedPassword;
    admin.passwordSetup = true;
    await admin.save();

    // Delete any existing unused setup tokens for this user
    await PasswordToken.deleteMany({ 
      userId: admin._id, 
      type: 'setup', 
      used: false 
    });

    sendResponse(res, 200, { 
      message: 'Password created successfully for admin user.',
      data: {
        adminId: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });
  } catch (error) {
    sendError(res, 500, 'Error creating password manually', error);
  }
};

module.exports = {
  getAllAdmins,
  getAdminById,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  toggleAdminStatus,
  changePassword,
  getMyProfile,
  updateMyProfile,
  getAvailableSchools,
  forgotPassword,
  resendPasswordSetupEmail,
  createPasswordManually
}; 
const AdminUser = require('../models/AdminUser');
const jwt = require('jsonwebtoken');
const { sendResponse, sendError } = require('../utils/response');

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return sendError(res, 400, 'Email and password are required');
    }

    const user = await AdminUser.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log('User not found');
      return sendError(res, 401, 'Invalid credentials');
    }
    
    // Check if password is set up
    if (!user.passwordSetup) {
      return sendError(res, 403, 'Please complete your password setup first. Check your email for the setup link.');
    }

    // Compare the provided password with the stored hashed password
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return sendError(res, 401, 'Invalid credentials');
    }
    
    if (!user.isActive) {
      return sendError(res, 403, 'Account is deactivated');
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role, schoolId: user.schoolId },
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    user.lastLogin = new Date();
    await user.save();
    return sendResponse(res, 200, {
      message: 'Login successful',
      data: {
        token,
        user: user.getPublicProfile()
      }
    });

  } catch (err) {
    next(err);
  }
};

// POST /api/auth/logout
exports.logout = async (req, res, next) => {
  // For JWT, logout is handled on the client by deleting the token
  return sendResponse(res, 200, { message: 'Logout successful' });
};

// GET /api/auth/session
exports.session = async (req, res, next) => {
  try {
    // If using JWT, session is validated by middleware
    // Here, just echo back the user if authenticated
    if (!req.user) {
      return sendError(res, 401, 'Not authenticated');
    }

    // Check if user is still active in database
    const currentUser = await AdminUser.findById(req.user._id).select('-password');
    
    if (!currentUser) {
      return sendError(res, 401, 'User not found');
    }

    if (!currentUser.isActive) {
      return sendError(res, 403, 'Account is deactivated');
    }

    // Get additional session information
    const sessionInfo = {
      user: currentUser.getPublicProfile(),
      session: {
        authenticated: true,
        lastLogin: currentUser.lastLogin,
        tokenExpiresIn: process.env.JWT_EXPIRE || '7d',
        permissions: getPermissionsByRole(currentUser.role)
      }
    };

    return sendResponse(res, 200, {
      message: 'Session valid',
      data: sessionInfo
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return sendError(res, 400, 'Email is required');
    }

    // Find admin by email
    const admin = await AdminUser.findOne({ email: email.toLowerCase() });
    if (!admin) {
      console.log('Email not found');
      // Don't reveal if email exists or not for security
      return sendResponse(res, 200, { 
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Check if admin is active
    if (!admin.isActive) {
      console.log('Admin is not active');
      return sendResponse(res, 200, { 
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Create new password reset token
    const PasswordToken = require('../models/PasswordToken');

    // Delete any existing unused reset tokens for this user
    await PasswordToken.deleteMany({ 
      userId: admin._id, 
      type: 'reset', 
      used: false 
    });
    const passwordToken = await PasswordToken.createToken(admin._id, 'AdminUser', 'reset');

    // Get school information if available
    let schoolInfo = null;
    if (admin.schoolId) {
      const School = require('../models/School');
      schoolInfo = await School.findById(admin.schoolId).select('name location');
    }

    // Send password reset email
    try {
      const emailService = require('../utils/emailService');
      await emailService.sendPasswordResetEmail(
        admin.email,
        passwordToken.token,
        admin.name.split(' ')[0] || 'User'
      );
      
      console.log(`✅ Password reset email sent successfully to ${email}`);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Delete the token if email fails
      await PasswordToken.findByIdAndDelete(passwordToken._id);
      return sendError(res, 500, 'Failed to send password reset email. Please try again.');
    }

    sendResponse(res, 200, { 
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  } catch (error) {
    sendError(res, 500, 'Error processing password reset request', error);
  }
};

// POST /api/auth/setup-password
exports.setupPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return sendError(res, 400, 'Token and password are required');
    }

    if (password.length < 4) {
      return sendError(res, 400, 'Password must be at least 4 characters long');
    }

    // Import required models
    const PasswordToken = require('../models/PasswordToken');
    const AdminUser = require('../models/AdminUser');
    const bcrypt = require('bcryptjs');

    // Find and validate the token (try both setup and reset types)
    let passwordToken = await PasswordToken.findAndValidateToken(token, 'setup');
    let isReset = false;
    
    if (!passwordToken) {
      passwordToken = await PasswordToken.findAndValidateToken(token, 'reset');
      isReset = true;
    }
    
    if (!passwordToken) {
      return sendError(res, 400, 'Invalid or expired token');
    }

    // Get the admin user
    const admin = await AdminUser.findById(passwordToken.userId);
    if (!admin) {
      return sendError(res, 404, 'Admin user not found');
    }

    if (isReset) {
      // Password reset flow
      if (!admin.passwordSetup) {
        return sendError(res, 400, 'Please complete your initial password setup first');
      }
    } else {
      // Initial password setup flow
      if (admin.passwordSetup) {
        return sendError(res, 400, 'Password is already set up for this account');
      }
    }

    // Hash the new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update admin with password and mark as set up
    admin.password = hashedPassword;
    admin.passwordSetup = true;
    await admin.save();

    // Mark token as used
    await passwordToken.markAsUsed();

    // Generate JWT token for automatic login
    const jwt = require('jsonwebtoken');
    const authToken = jwt.sign(
      { 
        userId: admin._id, 
        role: admin.role, 
        schoolId: admin.schoolId 
      },
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    const message = isReset 
      ? 'Password reset successfully. You are now logged in.'
      : 'Password set up successfully. You are now logged in.';

    return sendResponse(res, 200, { 
      message,
      data: {
        token: authToken,
        user: admin.getPublicProfile ? admin.getPublicProfile() : {
          _id: admin._id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          schoolId: admin.schoolId,
          isActive: admin.isActive
        }
      }
    });
  } catch (error) {
    sendError(res, 500, 'Error setting up password', error);
  }
};

// Helper function to get permissions by role
const getPermissionsByRole = (role) => {
  const permissions = {
    super_admin: [
      'manage_schools',
      'manage_admins',
      'manage_students',
      'manage_teachers',
      'manage_courses',
      'manage_schedules',
      'manage_attendance',
      'manage_devices',
      'view_reports',
      'export_data',
      'system_settings'
    ],
    school_admin: [
      'manage_students',
      'manage_teachers', 
      'manage_courses',
      'manage_schedules',
      'manage_attendance',
      'manage_devices',
      'view_reports',
      'export_data'
    ]
  };
  
  return permissions[role] || [];
}; 
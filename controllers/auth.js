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
      return sendError(res, 401, 'Invalid credentials');
    }
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
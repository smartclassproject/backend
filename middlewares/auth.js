const jwt = require('jsonwebtoken');
const AdminUser = require('../models/AdminUser');
const TeacherUser = require('../models/TeacherUser');
const Teacher = require('../models/Teacher');

/**
 * Authentication middleware to verify JWT token
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'smartclass2025');
    
    // Determine user type and find user in appropriate database
    let user;
    if (decoded.userType === 'teacher' || decoded.role === 'teacher') {
      user = await TeacherUser.findById(decoded.userId).select('-password');
      if (user) {
        const teacher = await Teacher.findById(decoded.teacherId || user.teacherId);
        if (!teacher || !teacher.isActive) {
          return res.status(401).json({
            success: false,
            message: 'Teacher account is not active'
          });
        }
        // Add teacher info to user object
        user.teacherId = teacher._id;
        user.schoolId = teacher.schoolId;
        user.name = teacher.name;
      }
    } else {
      user = await AdminUser.findById(decoded.userId).select('-password');
    }
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token - user not found'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Add decoded token info to user object for easier access
    user.userType = decoded.userType || (decoded.role === 'teacher' ? 'teacher' : 'admin');
    if (decoded.teacherId) {
      user.teacherId = decoded.teacherId;
    }

    // Add user to request object
    req.user = user;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Role-based authorization middleware
 * @param {string[]} allowedRoles - Array of allowed roles
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Get role from user object (could be from AdminUser or TeacherUser)
    const userRole = req.user.role || (req.user.userType === 'teacher' ? 'teacher' : req.user.role);
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - insufficient permissions'
      });
    }

    next();
  };
};

/**
 * School-specific authorization middleware
 * Ensures school_admin can only access their school's data
 */
const authorizeSchoolAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Super admin can access all schools
    if (req.user.role === 'super_admin') {
      return next();
    }

    // School admin can only access their school
    if (req.user.role === 'school_admin') {
      const schoolId = req.params.schoolId || req.body.schoolId || req.query.schoolId;
      
      if (!schoolId) {
        return res.status(400).json({
          success: false,
          message: 'School ID is required'
        });
      }

      if (schoolId !== req.user.schoolId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied - can only access your school\'s data'
        });
      }
    }

    next();
  } catch (error) {
    console.error('School access authorization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Resource ownership authorization middleware
 * Ensures users can only access resources they own or are authorized to access
 */
const authorizeResourceAccess = (resourceModel, resourceIdField = '_id') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Super admin can access all resources
      if (req.user.role === 'super_admin') {
        return next();
      }

      // School admin can only access resources from their school
      if (req.user.role === 'school_admin') {
        const resourceId = req.params[resourceIdField] || req.body[resourceIdField];
        
        if (!resourceId) {
          return res.status(400).json({
            success: false,
            message: `${resourceIdField} is required`
          });
        }

        const resource = await resourceModel.findById(resourceId);
        
        if (!resource) {
          return res.status(404).json({
            success: false,
            message: 'Resource not found'
          });
        }

        if (resource.schoolId.toString() !== req.user.schoolId.toString()) {
          return res.status(403).json({
            success: false,
            message: 'Access denied - can only access resources from your school'
          });
        }
      }

      next();
    } catch (error) {
      console.error('Resource access authorization error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  authorizeSchoolAccess,
  authorizeResourceAccess,
  authorize: authorizeRoles // Alias for backward compatibility
}; 
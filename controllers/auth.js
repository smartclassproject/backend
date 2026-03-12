const AdminUser = require('../models/AdminUser');
const TeacherUser = require('../models/TeacherUser');
const Teacher = require('../models/Teacher');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sendResponse, sendError } = require('../utils/response');

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return sendError(res, 400, 'Email and password are required');
    }

    // Try to find user in AdminUser first
    let user = await AdminUser.findOne({ email: email.toLowerCase() });
    let userType = 'admin';
    
    // If not found in AdminUser, try TeacherUser
    if (!user) {
      user = await TeacherUser.findOne({ email: email.toLowerCase() }).populate('teacherId');
      userType = 'teacher';
    }
    
    if (!user) {
      console.log('User not found');
      return sendError(res, 401, 'Invalid credentials');
    }
    
    // For teachers, check if this is first-time login with default password
    if (userType === 'teacher' && !user.passwordSetup) {
      // Check if the provided password matches the default password
      const isDefaultPassword = user.defaultPassword 
        ? await bcrypt.compare(password, user.defaultPassword)
        : false;
      
      if (isDefaultPassword) {
        // Allow login but mark that password change is required
        const teacher = user.teacherId || await Teacher.findById(user.teacherId);
        if (!teacher || !teacher.isActive) {
          return sendError(res, 403, 'Teacher account is not active');
        }
        
        const jwtPayload = {
          userId: user._id,
          role: 'teacher',
          schoolId: teacher.schoolId,
          teacherId: teacher._id,
          userType: 'teacher',
          requiresPasswordChange: true
        };
        
        const userProfile = {
          _id: user._id,
          email: user.email,
          role: 'teacher',
          schoolId: teacher.schoolId,
          teacherId: teacher._id,
          name: teacher.name,
          isActive: user.isActive,
          requiresPasswordChange: true
        };
        
        // Generate JWT token
        const token = jwt.sign(
          jwtPayload,
          process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
          { expiresIn: process.env.JWT_EXPIRE || '7d' }
        );

        user.lastLogin = new Date();
        await user.save();
        
        return sendResponse(res, 200, {
          message: 'Login successful. Please change your password.',
          data: {
            token,
            user: userProfile,
            requiresPasswordChange: true
          }
        });
      } else {
        return sendError(res, 401, 'Invalid credentials. Please use your default password for first-time login.');
      }
    }

    // For admin users, check if password is set up
    if (userType === 'admin' && !user.passwordSetup) {
      return sendError(res, 403, 'Please complete your password setup first. Check your email for the setup link.');
    }

    // For teachers who have set up password, ensure password field exists
    if (userType === 'teacher' && user.passwordSetup && !user.password) {
      return sendError(res, 500, 'Password field is missing. Please contact administrator.');
    }

    // For teachers who haven't set up password but reached here, they should have used default password
    // This shouldn't happen, but handle it gracefully
    if (userType === 'teacher' && !user.passwordSetup) {
      // Try default password as fallback
      if (user.defaultPassword) {
        const isDefaultPassword = await bcrypt.compare(password, user.defaultPassword);
        if (isDefaultPassword) {
          const teacher = user.teacherId || await Teacher.findById(user.teacherId);
          if (!teacher || !teacher.isActive) {
            return sendError(res, 403, 'Teacher account is not active');
          }
          
          const jwtPayload = {
            userId: user._id,
            role: 'teacher',
            schoolId: teacher.schoolId,
            teacherId: teacher._id,
            userType: 'teacher',
            requiresPasswordChange: true
          };
          
          const userProfile = {
            _id: user._id,
            email: user.email,
            role: 'teacher',
            schoolId: teacher.schoolId,
            teacherId: teacher._id,
            name: teacher.name,
            isActive: user.isActive,
            requiresPasswordChange: true
          };
          
          const token = jwt.sign(
            jwtPayload,
            process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
            { expiresIn: process.env.JWT_EXPIRE || '7d' }
          );

          user.lastLogin = new Date();
          await user.save();
          
          return sendResponse(res, 200, {
            message: 'Login successful. Please change your password.',
            data: {
              token,
              user: userProfile,
              requiresPasswordChange: true
            }
          });
        }
      }
      return sendError(res, 401, 'Invalid credentials. Please use your default password for first-time login.');
    }

    // Compare the provided password with the stored hashed password
    // Ensure password exists before comparing
    if (!user.password) {
      return sendError(res, 500, 'Password field is missing. Please contact administrator.');
    }

    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return sendError(res, 401, 'Invalid credentials');
    }
    
    if (!user.isActive) {
      return sendError(res, 403, 'Account is deactivated');
    }

    // Prepare user data for JWT
    let jwtPayload = {};
    let userProfile = {};
    
    if (userType === 'admin') {
      jwtPayload = {
        userId: user._id,
        role: user.role,
        schoolId: user.schoolId,
        userType: 'admin'
      };
      userProfile = user.getPublicProfile();
    } else {
      // Teacher user
      const teacher = user.teacherId || await Teacher.findById(user.teacherId);
      if (!teacher || !teacher.isActive) {
        return sendError(res, 403, 'Teacher account is not active');
      }
      
      jwtPayload = {
        userId: user._id,
        role: 'teacher',
        schoolId: teacher.schoolId,
        teacherId: teacher._id,
        userType: 'teacher'
      };
      
      userProfile = {
        _id: user._id,
        email: user.email,
        role: 'teacher',
        schoolId: teacher.schoolId,
        teacherId: teacher._id,
        name: teacher.name,
        isActive: user.isActive
      };
    }

    // Generate JWT
    const token = jwt.sign(
      jwtPayload,
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    user.lastLogin = new Date();
    await user.save();
    
    return sendResponse(res, 200, {
      message: 'Login successful',
      data: {
        token,
        user: userProfile
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

    let currentUser;
    let userProfile;
    let role;
    
    // Check user type from token
    if (req.user.userType === 'teacher') {
      currentUser = await TeacherUser.findById(req.user._id).select('-password').populate('teacherId');
      if (!currentUser) {
        return sendError(res, 401, 'User not found');
      }
      
      const teacher = currentUser.teacherId || await Teacher.findById(currentUser.teacherId);
      if (!teacher || !teacher.isActive) {
        return sendError(res, 403, 'Teacher account is not active');
      }
      
      role = 'teacher';
      userProfile = {
        _id: currentUser._id,
        email: currentUser.email,
        role: 'teacher',
        schoolId: teacher.schoolId,
        teacherId: teacher._id,
        name: teacher.name,
        isActive: currentUser.isActive,
        requiresPasswordChange: !currentUser.passwordSetup
      };
    } else {
      // Admin user
      currentUser = await AdminUser.findById(req.user._id).select('-password');
      if (!currentUser) {
        return sendError(res, 401, 'User not found');
      }
      role = currentUser.role;
      userProfile = currentUser.getPublicProfile();
    }

    if (!currentUser.isActive) {
      return sendError(res, 403, 'Account is deactivated');
    }

    // Get additional session information
    const sessionInfo = {
      user: userProfile,
      session: {
        authenticated: true,
        lastLogin: currentUser.lastLogin,
        tokenExpiresIn: process.env.JWT_EXPIRE || '7d',
        permissions: getPermissionsByRole(role)
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

    // Find user by email (try admin first, then teacher)
    let user = await AdminUser.findOne({ email: email.toLowerCase() });
    let userType = 'AdminUser';
    let userName = user?.name;
    
    if (!user) {
      user = await TeacherUser.findOne({ email: email.toLowerCase() }).populate('teacherId');
      if (user) {
        userType = 'TeacherUser';
        userName = user.teacherId?.name || 'User';
      }
    }
    
    if (!user) {
      console.log('Email not found');
      // Don't reveal if email exists or not for security
      return sendResponse(res, 200, { 
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      console.log('User is not active');
      return sendResponse(res, 200, { 
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Create new password reset token
    const PasswordToken = require('../models/PasswordToken');

    // Delete any existing unused reset tokens for this user
    await PasswordToken.deleteMany({ 
      userId: user._id, 
      type: 'reset', 
      used: false 
    });
    const passwordToken = await PasswordToken.createToken(user._id, userType, 'reset');

    // Send password reset email
    try {
      const emailService = require('../utils/emailService');
      await emailService.sendPasswordResetEmail(
        user.email,
        passwordToken.token,
        userName?.split(' ')[0] || 'User'
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
    const bcrypt = require('bcryptjs');
    const Teacher = require('../models/Teacher');

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

    // Determine user type/model and get user
    let user;
    const userModel = passwordToken.userModel || 'AdminUser';
    
    if (userModel === 'TeacherUser') {
      user = await TeacherUser.findById(passwordToken.userId);
      if (!user) {
        return sendError(res, 404, 'Teacher user not found');
      }
    } else {
      user = await AdminUser.findById(passwordToken.userId);
      if (!user) {
        return sendError(res, 404, 'Admin user not found');
      }
    }

    if (isReset) {
      // Password reset flow. If user never set a password, allow setting it (e.g. teacher using reset link for first time).
      // No restriction here; we set password and passwordSetup below.
    } else {
      // Initial password setup flow
      if (user.passwordSetup) {
        return sendError(res, 400, 'Password is already set up for this account');
      }
    }

    // Hash the new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update user with password and mark as set up
    user.password = hashedPassword;
    user.passwordSetup = true;
    await user.save();

    // Mark token as used
    await passwordToken.markAsUsed();

    // Generate JWT token for automatic login
    const jwt = require('jsonwebtoken');
    let jwtPayload = {};
    let userProfile = {};
    
    if (userModel === 'TeacherUser') {
      const teacher = await Teacher.findById(user.teacherId);
      if (!teacher || !teacher.isActive) {
        return sendError(res, 403, 'Teacher account is not active');
      }
      
      jwtPayload = {
        userId: user._id,
        role: 'teacher',
        schoolId: teacher.schoolId,
        teacherId: teacher._id,
        userType: 'teacher'
      };
      
      userProfile = {
        _id: user._id,
        email: user.email,
        role: 'teacher',
        schoolId: teacher.schoolId,
        teacherId: teacher._id,
        name: teacher.name,
        isActive: user.isActive
      };
    } else {
      jwtPayload = {
        userId: user._id,
        role: user.role,
        schoolId: user.schoolId,
        userType: 'admin'
      };
      userProfile = user.getPublicProfile ? user.getPublicProfile() : {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        schoolId: user.schoolId,
        isActive: user.isActive
      };
    }
    
    const authToken = jwt.sign(
      jwtPayload,
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const message = isReset 
      ? 'Password reset successfully. You are now logged in.'
      : 'Password set up successfully. You are now logged in.';

    return sendResponse(res, 200, { 
      message,
      data: {
        token: authToken,
        user: userProfile
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
    ],
    teacher: [
      'view_schedules',
      'modify_own_schedules',
      'post_exams',
      'post_lessons',
      'view_students',
      'view_attendance',
      'upload_reports'
    ]
  };
  
  return permissions[role] || [];
};

// POST /api/auth/teacher/set-password - Set new password for teacher on first login
exports.teacherSetPassword = async (req, res, next) => {
  try {
    const { email, defaultPassword, newPassword } = req.body;

    if (!email || !defaultPassword || !newPassword) {
      return sendError(res, 400, 'Email, default password, and new password are required');
    }

    if (newPassword.length < 4) {
      return sendError(res, 400, 'New password must be at least 4 characters long');
    }

    // Find teacher user
    const teacherUser = await TeacherUser.findOne({ email: email.toLowerCase() }).populate('teacherId');
    if (!teacherUser) {
      return sendError(res, 404, 'Teacher user not found');
    }

    // Verify it's a first-time login (passwordSetup is false)
    if (teacherUser.passwordSetup) {
      return sendError(res, 400, 'Password has already been set. Please use the forgot password feature if needed.');
    }

    // Verify the default password matches
    if (!teacherUser.defaultPassword) {
      return sendError(res, 400, 'Default password not found. Please contact administrator.');
    }

    const isDefaultPassword = await bcrypt.compare(defaultPassword, teacherUser.defaultPassword);
    if (!isDefaultPassword) {
      return sendError(res, 401, 'Invalid default password');
    }

    // Verify new password is different from default
    const isSameAsDefault = await bcrypt.compare(newPassword, teacherUser.defaultPassword);
    if (isSameAsDefault) {
      return sendError(res, 400, 'New password must be different from the default password');
    }

    // Hash the new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update teacher user with new password
    teacherUser.password = hashedNewPassword;
    teacherUser.passwordSetup = true;
    teacherUser.defaultPassword = undefined; // Remove default password after first setup
    await teacherUser.save();

    // Get teacher info
    const teacher = teacherUser.teacherId || await Teacher.findById(teacherUser.teacherId);
    if (!teacher || !teacher.isActive) {
      return sendError(res, 403, 'Teacher account is not active');
    }

    // Generate JWT token for automatic login
    const token = jwt.sign(
      {
        userId: teacherUser._id,
        role: 'teacher',
        schoolId: teacher.schoolId,
        teacherId: teacher._id,
        userType: 'teacher'
      },
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    // Update last login
    teacherUser.lastLogin = new Date();
    await teacherUser.save();

    const userProfile = {
      _id: teacherUser._id,
      email: teacherUser.email,
      role: 'teacher',
      schoolId: teacher.schoolId,
      teacherId: teacher._id,
      name: teacher.name,
      isActive: teacherUser.isActive
    };

    return sendResponse(res, 200, {
      message: 'Password set successfully. You are now logged in.',
      data: {
        token,
        user: userProfile
      }
    });
  } catch (error) {
    console.error('Error setting teacher password:', error);
    sendError(res, 500, 'Error setting password', error);
  }
}; 
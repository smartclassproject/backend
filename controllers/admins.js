const AdminUser = require('../models/AdminUser');
const School = require('../models/School');
const { sendResponse, sendError } = require('../utils/response');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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

    const pages = Math.ceil(total / limit);

    sendResponse(res, 200, {
      data: admins,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
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
  try {
    const {
      email,
      password,
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

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create admin user
    const admin = new AdminUser({
      email,
      password: hashedPassword,
      role,
      schoolId,
      name: `${firstName} ${lastName}`,
      phone
    });

    await admin.save();

    // Return admin without password
    const adminResponse = admin.toObject();
    delete adminResponse.password;

    return sendResponse(res, 201, { 
      data: adminResponse,
      message: 'Admin user created successfully'
    });
  } catch (error) {
    sendError(res, 500, 'Error creating admin user', error);
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

    sendResponse(res, 200, { 
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
  getAvailableSchools
}; 
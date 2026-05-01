const bcrypt = require('bcryptjs');
const SchoolStaff = require('../models/SchoolStaff');
const StaffModule = require('../models/StaffModule');
const { sendError, sendResponse } = require('../utils/response');

const SYSTEM_MODULES = [
  { key: 'students', label: 'Students' },
  { key: 'teachers', label: 'Teachers' },
  { key: 'courses', label: 'Courses' },
  { key: 'finance', label: 'Finance' },
  { key: 'announcements', label: 'Announcements' },
  { key: 'inquiries', label: 'Inquiries' },
  { key: 'reports', label: 'Reports' },
  { key: 'library', label: 'Library' },
];

const ROLE_DEFAULT_MODULES = {
  DIRECTOR_OF_STUDIES: ['students', 'teachers', 'courses'],
  ACCOUNTANT: ['finance', 'reports'],
  MATRON: ['students'],
  PATRON: ['students'],
  DISCIPLINE_MASTER: ['students'],
  LIBRARIAN: ['library'],
  OTHER: [],
};

const normalizeModuleKey = (value = '') =>
  String(value).trim().toLowerCase().replace(/\s+/g, '_');

const ensureSystemModules = async () => {
  await Promise.all(
    SYSTEM_MODULES.map((moduleItem) =>
      StaffModule.updateOne(
        { key: moduleItem.key },
        {
          $setOnInsert: {
            ...moduleItem,
            isActive: true,
            isSystem: true,
          },
        },
        { upsert: true }
      )
    )
  );
};

const getAllowedModuleSet = async () => {
  await ensureSystemModules();
  const activeModules = await StaffModule.find({ isActive: true }).select('key');
  return new Set(activeModules.map((moduleItem) => moduleItem.key));
};

const resolveTargetSchoolId = (req, requestedSchoolId) => {
  if (req.user.role === 'super_admin') {
    return requestedSchoolId;
  }
  return req.user.schoolId?.toString();
};

const canAccessStaff = (req, staffDoc) => {
  if (req.user.role === 'super_admin') return true;
  return staffDoc.schoolId.toString() === req.user.schoolId?.toString();
};

exports.getRoleTemplates = async (req, res) => {
  return sendResponse(res, 200, {
    data: {
      templates: Object.entries(ROLE_DEFAULT_MODULES).map(([role, modules]) => ({
        role,
        defaultModules: modules,
      })),
    },
  });
};

exports.getModules = async (req, res, next) => {
  try {
    await ensureSystemModules();
    const modules = await StaffModule.find().sort({ label: 1 });
    return sendResponse(res, 200, { data: modules });
  } catch (error) {
    return next(error);
  }
};

exports.createModule = async (req, res, next) => {
  try {
    if (req.user.role !== 'super_admin') {
      return sendError(res, 403, 'Only super admin can create modules');
    }
    const key = normalizeModuleKey(req.body.key);
    const label = String(req.body.label || '').trim();
    if (!key || !label) {
      return sendError(res, 400, 'key and label are required');
    }
    const existing = await StaffModule.findOne({ key });
    if (existing) {
      return sendError(res, 409, 'Module key already exists');
    }
    const created = await StaffModule.create({
      key,
      label,
      description: req.body.description || '',
      isActive: req.body.isActive !== false,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });
    return sendResponse(res, 201, { message: 'Module created', data: created });
  } catch (error) {
    return next(error);
  }
};

exports.updateModule = async (req, res, next) => {
  try {
    if (req.user.role !== 'super_admin') {
      return sendError(res, 403, 'Only super admin can update modules');
    }
    const moduleItem = await StaffModule.findById(req.params.id);
    if (!moduleItem) {
      return sendError(res, 404, 'Module not found');
    }
    if (req.body.label !== undefined) moduleItem.label = String(req.body.label).trim();
    if (req.body.description !== undefined) moduleItem.description = String(req.body.description || '').trim();
    moduleItem.updatedBy = req.user._id;
    await moduleItem.save();
    return sendResponse(res, 200, { message: 'Module updated', data: moduleItem });
  } catch (error) {
    return next(error);
  }
};

exports.updateModuleStatus = async (req, res, next) => {
  try {
    if (req.user.role !== 'super_admin') {
      return sendError(res, 403, 'Only super admin can update module status');
    }
    const moduleItem = await StaffModule.findById(req.params.id);
    if (!moduleItem) {
      return sendError(res, 404, 'Module not found');
    }
    if (typeof req.body.isActive !== 'boolean') {
      return sendError(res, 400, 'isActive boolean is required');
    }
    moduleItem.isActive = req.body.isActive;
    moduleItem.updatedBy = req.user._id;
    await moduleItem.save();
    return sendResponse(res, 200, { message: 'Module status updated', data: moduleItem });
  } catch (error) {
    return next(error);
  }
};

exports.createStaff = async (req, res, next) => {
  try {
    if (!['super_admin', 'school_admin'].includes(req.user.role)) {
      return sendError(res, 403, 'Only admins can create staff');
    }

    const schoolId = resolveTargetSchoolId(req, req.body.schoolId);
    if (!schoolId) {
      return sendError(res, 400, 'schoolId is required');
    }

    const {
      firstName,
      lastName,
      phoneNumber,
      email,
      staffRole,
      customRoleTitle,
      modules,
      password,
    } = req.body;

    if (!firstName || !lastName || !phoneNumber || !email || !staffRole) {
      return sendError(res, 400, 'firstName, lastName, phoneNumber, email and staffRole are required');
    }

    const allowedModules = await getAllowedModuleSet();
    const requestedModules = Array.isArray(modules) ? modules.map(normalizeModuleKey) : ROLE_DEFAULT_MODULES[staffRole] || [];
    const invalidModules = requestedModules.filter((moduleKey) => !allowedModules.has(moduleKey));
    if (invalidModules.length) {
      return sendError(res, 400, `Invalid or inactive modules: ${invalidModules.join(', ')}`);
    }

    const existing = await SchoolStaff.findOne({ email: email.toLowerCase() });
    if (existing) {
      return sendError(res, 409, 'Staff email already exists');
    }

    const created = await SchoolStaff.create({
      schoolId,
      firstName,
      lastName,
      phoneNumber,
      email: email.toLowerCase(),
      staffRole,
      customRoleTitle: customRoleTitle || '',
      modules: requestedModules,
      password: password || '1234',
      createdByUserId: req.user._id,
      createdByRole: req.user.role === 'super_admin' ? 'SUPER_ADMIN' : 'SCHOOL_ADMIN',
      updatedByUserId: req.user._id,
    });

    return sendResponse(res, 201, {
      message: 'Staff created successfully',
      data: created.getPublicProfile(),
    });
  } catch (error) {
    return next(error);
  }
};

exports.getStaffList = async (req, res, next) => {
  try {
    const query = {};
    if (req.user.role !== 'super_admin') {
      query.schoolId = req.user.schoolId;
    } else if (req.query.schoolId) {
      query.schoolId = req.query.schoolId;
    }
    if (req.query.staffRole) query.staffRole = req.query.staffRole;
    if (req.query.isActive === 'true') query.isActive = true;
    if (req.query.isActive === 'false') query.isActive = false;

    const staffList = await SchoolStaff.find(query).select('-password').sort({ createdAt: -1 });
    return sendResponse(res, 200, { data: staffList });
  } catch (error) {
    return next(error);
  }
};

exports.getStaffById = async (req, res, next) => {
  try {
    const staff = await SchoolStaff.findById(req.params.id).select('-password');
    if (!staff) return sendError(res, 404, 'Staff not found');
    if (!canAccessStaff(req, staff)) {
      return sendError(res, 403, 'Access denied');
    }
    return sendResponse(res, 200, { data: staff });
  } catch (error) {
    return next(error);
  }
};

exports.updateStaff = async (req, res, next) => {
  try {
    const staff = await SchoolStaff.findById(req.params.id);
    if (!staff) return sendError(res, 404, 'Staff not found');
    if (!canAccessStaff(req, staff)) return sendError(res, 403, 'Access denied');

    const editableFields = ['firstName', 'lastName', 'phoneNumber', 'email', 'staffRole', 'customRoleTitle'];
    editableFields.forEach((fieldName) => {
      if (req.body[fieldName] !== undefined) {
        staff[fieldName] = fieldName === 'email' ? String(req.body[fieldName]).toLowerCase() : req.body[fieldName];
      }
    });

    if (req.body.modules) {
      const allowedModules = await getAllowedModuleSet();
      const requestedModules = req.body.modules.map(normalizeModuleKey);
      const invalidModules = requestedModules.filter((moduleKey) => !allowedModules.has(moduleKey));
      if (invalidModules.length) {
        return sendError(res, 400, `Invalid or inactive modules: ${invalidModules.join(', ')}`);
      }
      staff.modules = requestedModules;
    }

    staff.updatedByUserId = req.user._id;
    await staff.save();
    return sendResponse(res, 200, { message: 'Staff updated', data: staff.getPublicProfile() });
  } catch (error) {
    return next(error);
  }
};

exports.updateStaffStatus = async (req, res, next) => {
  try {
    const staff = await SchoolStaff.findById(req.params.id);
    if (!staff) return sendError(res, 404, 'Staff not found');
    if (!canAccessStaff(req, staff)) return sendError(res, 403, 'Access denied');
    if (typeof req.body.isActive !== 'boolean') return sendError(res, 400, 'isActive boolean is required');
    staff.isActive = req.body.isActive;
    staff.updatedByUserId = req.user._id;
    await staff.save();
    return sendResponse(res, 200, { message: 'Staff status updated', data: staff.getPublicProfile() });
  } catch (error) {
    return next(error);
  }
};

exports.resetStaffCredentials = async (req, res, next) => {
  try {
    const staff = await SchoolStaff.findById(req.params.id);
    if (!staff) return sendError(res, 404, 'Staff not found');
    if (!canAccessStaff(req, staff)) return sendError(res, 403, 'Access denied');

    const newPassword = String(req.body.newPassword || '1234');
    if (newPassword.length < 4) {
      return sendError(res, 400, 'newPassword must be at least 4 characters');
    }
    const salt = await bcrypt.genSalt(12);
    staff.password = await bcrypt.hash(newPassword, salt);
    staff.updatedByUserId = req.user._id;
    await staff.save();
    return sendResponse(res, 200, { message: 'Staff credentials reset successfully' });
  } catch (error) {
    return next(error);
  }
};

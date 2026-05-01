const bcrypt = require('bcryptjs');
const AdminUser = require('../models/AdminUser');
const TeacherUser = require('../models/TeacherUser');
const Teacher = require('../models/Teacher');
const School = require('../models/School');
const SchoolStaff = require('../models/SchoolStaff');
const { sendResponse, sendError } = require('../utils/response');

exports.getProfile = async (req, res, next) => {
  try {
    const role = req.user.role || (req.user.userType === 'teacher' ? 'teacher' : null);
    if (role === 'teacher' || req.user.userType === 'teacher') {
      const teacherUser = await TeacherUser.findById(req.user._id).select('-password -defaultPassword');
      if (!teacherUser) return sendError(res, 404, 'User not found');
      const teacher = await Teacher.findById(teacherUser.teacherId);
      if (!teacher) return sendError(res, 404, 'Teacher profile not found');
      const school = await School.findById(teacher.schoolId);
      return sendResponse(res, 200, {
        message: 'Profile retrieved',
        data: { role: 'teacher', teacherUser, teacher, school }
      });
    }

    if (role === 'school_staff' || req.user.userType === 'school_staff') {
      const staff = await SchoolStaff.findById(req.user._id).select('-password');
      if (!staff) return sendError(res, 404, 'User not found');
      const school = await School.findById(staff.schoolId);
      return sendResponse(res, 200, {
        message: 'Profile retrieved',
        data: { role: 'school_staff', staff, school }
      });
    }

    const admin = await AdminUser.findById(req.user._id).select('-password');
    if (!admin) return sendError(res, 404, 'User not found');
    let school = null;
    if (admin.schoolId) {
      school = await School.findById(admin.schoolId);
    }
    return sendResponse(res, 200, {
      message: 'Profile retrieved',
      data: { role: admin.role, admin, school }
    });
  } catch (err) {
    next(err);
  }
};

exports.patchProfile = async (req, res, next) => {
  try {
    const { name, phone, profileUrl, email, department, specialization } = req.body;

    if (req.user.role === 'teacher' || req.user.userType === 'teacher') {
      const teacherUser = await TeacherUser.findById(req.user._id);
      if (!teacherUser) return sendError(res, 404, 'User not found');
      const teacher = await Teacher.findById(teacherUser.teacherId);
      if (!teacher) return sendError(res, 404, 'Teacher not found');

      if (name !== undefined) teacher.name = name;
      if (phone !== undefined) teacher.phone = phone;
      if (department !== undefined) teacher.department = department;
      if (specialization !== undefined) teacher.specialization = specialization;
      if (profileUrl !== undefined) teacher.profileUrl = profileUrl || undefined;

      if (email !== undefined && email && String(email).trim().toLowerCase() !== teacher.email) {
        const nextEmail = String(email).trim().toLowerCase();
        const taken = await Teacher.findOne({ email: nextEmail, _id: { $ne: teacher._id } });
        if (taken) return sendError(res, 409, 'Email already in use');
        const takenUser = await TeacherUser.findOne({ email: nextEmail, _id: { $ne: teacherUser._id } });
        if (takenUser) return sendError(res, 409, 'Email already in use');
        teacher.email = nextEmail;
        teacherUser.email = nextEmail;
        await teacherUser.save();
      }

      await teacher.save();
      const school = await School.findById(teacher.schoolId);
      return sendResponse(res, 200, {
        message: 'Profile updated',
        data: { role: 'teacher', teacherUser, teacher, school }
      });
    }

    if (req.user.role === 'school_staff' || req.user.userType === 'school_staff') {
      const staff = await SchoolStaff.findById(req.user._id);
      if (!staff) return sendError(res, 404, 'User not found');
      if (name !== undefined) {
        const parts = String(name).trim().split(/\s+/);
        staff.firstName = parts[0] || staff.firstName;
        staff.lastName = parts.slice(1).join(' ') || staff.lastName;
      }
      if (phone !== undefined) staff.phoneNumber = phone;
      if (profileUrl !== undefined) staff.profileUrl = profileUrl || '';
      if (email !== undefined && email && String(email).trim().toLowerCase() !== staff.email) {
        const nextEmail = String(email).trim().toLowerCase();
        const takenStaff = await SchoolStaff.findOne({ email: nextEmail, _id: { $ne: staff._id } });
        const takenAdmin = await AdminUser.findOne({ email: nextEmail });
        const takenTeacher = await TeacherUser.findOne({ email: nextEmail });
        if (takenStaff || takenAdmin || takenTeacher) return sendError(res, 409, 'Email already in use');
        staff.email = nextEmail;
      }
      await staff.save();
      const school = await School.findById(staff.schoolId);
      return sendResponse(res, 200, {
        message: 'Profile updated',
        data: { role: 'school_staff', staff, school }
      });
    }

    const admin = await AdminUser.findById(req.user._id);
    if (!admin) return sendError(res, 404, 'User not found');
    if (name !== undefined) admin.name = name;
    if (phone !== undefined) admin.phone = phone;
    if (profileUrl !== undefined) admin.profileUrl = profileUrl || undefined;
    await admin.save();

    let school = null;
    if (admin.schoolId) school = await School.findById(admin.schoolId);
    return sendResponse(res, 200, {
      message: 'Profile updated',
      data: { role: admin.role, admin, school }
    });
  } catch (err) {
    next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return sendError(res, 400, 'Current password and new password are required');
    }
    if (String(newPassword).length < 4) {
      return sendError(res, 400, 'New password must be at least 4 characters');
    }

    if (req.user.role === 'teacher' || req.user.userType === 'teacher') {
      const teacherUser = await TeacherUser.findById(req.user._id);
      if (!teacherUser || !teacherUser.password) {
        return sendError(res, 400, 'Password change is not available for this account');
      }
      const ok = await teacherUser.comparePassword(currentPassword);
      if (!ok) return sendError(res, 401, 'Current password is incorrect');
      teacherUser.password = await bcrypt.hash(newPassword, 12);
      teacherUser.passwordSetup = true;
      await teacherUser.save();
      return sendResponse(res, 200, { message: 'Password updated successfully' });
    }

    if (req.user.role === 'school_staff' || req.user.userType === 'school_staff') {
      const staff = await SchoolStaff.findById(req.user._id);
      if (!staff || !staff.password) {
        return sendError(res, 400, 'Password is not set for this account');
      }
      const ok = await staff.comparePassword(currentPassword);
      if (!ok) return sendError(res, 401, 'Current password is incorrect');
      staff.password = await bcrypt.hash(newPassword, 12);
      staff.passwordSetup = true;
      await staff.save();
      return sendResponse(res, 200, { message: 'Password updated successfully' });
    }

    const admin = await AdminUser.findById(req.user._id);
    if (!admin || !admin.password) {
      return sendError(res, 400, 'Password is not set for this account');
    }
    const ok = await admin.comparePassword(currentPassword);
    if (!ok) return sendError(res, 401, 'Current password is incorrect');
    admin.password = await bcrypt.hash(newPassword, 12);
    admin.passwordSetup = true;
    await admin.save();
    return sendResponse(res, 200, { message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
};

exports.uploadProfilePhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return sendError(res, 400, 'No image file uploaded (use field name "photo")');
    }
    const profileUrl = `/uploads/profiles/${req.file.filename}`;

    if (req.user.role === 'teacher' || req.user.userType === 'teacher') {
      const teacherUser = await TeacherUser.findById(req.user._id);
      if (!teacherUser) return sendError(res, 404, 'User not found');
      await Teacher.findByIdAndUpdate(teacherUser.teacherId, { profileUrl });
    } else {
      if (req.user.role === 'school_staff' || req.user.userType === 'school_staff') {
        const staff = await SchoolStaff.findById(req.user._id);
        if (!staff) return sendError(res, 404, 'User not found');
        staff.profileUrl = profileUrl;
        await staff.save();
      } else {
        const admin = await AdminUser.findById(req.user._id);
        if (!admin) return sendError(res, 404, 'User not found');
        admin.profileUrl = profileUrl;
        await admin.save();
      }
    }

    return sendResponse(res, 200, { message: 'Photo uploaded', data: { profileUrl } });
  } catch (err) {
    next(err);
  }
};

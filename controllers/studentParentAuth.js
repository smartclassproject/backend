const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const StudentUser = require('../models/StudentUser');
const ParentUser = require('../models/ParentUser');
const { sendResponse, sendError } = require('../utils/response');

const signToken = (payload) => jwt.sign(payload, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production', { expiresIn: process.env.JWT_EXPIRE || '7d' });

const formatDateVariants = (date) => {
  if (!date) return [];
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return [];
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return [`${yyyy}-${mm}-${dd}`, `${dd}/${mm}/${yyyy}`, `${dd}-${mm}-${yyyy}`];
};

exports.studentLogin = async (req, res) => {
  try {
    const { studentId, password } = req.body;
    if (!studentId || !password) return sendError(res, 400, 'studentId and password are required');
    const student = await Student.findOne({ studentId: String(studentId).trim() });
    if (!student || !student.isActive) return sendError(res, 401, 'Invalid credentials');

    let user = await StudentUser.findOne({ studentIdRef: student._id });
    if (!user) user = await StudentUser.create({ schoolId: student.schoolId, studentIdRef: student._id, studentId: student.studentId });

    let requiresPasswordChange = false;
    if (user.passwordSetup && user.password) {
      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return sendError(res, 401, 'Invalid credentials');
    } else {
      const validDefaults = formatDateVariants(student.dateOfBirth);
      if (!validDefaults.includes(String(password).trim())) return sendError(res, 401, 'Invalid credentials');
      requiresPasswordChange = true;
    }

    user.lastLogin = new Date();
    await user.save();

    const token = signToken({ userId: user._id, role: 'student', schoolId: student.schoolId, studentId: student._id, userType: 'student', requiresPasswordChange });
    return sendResponse(res, 200, {
      message: requiresPasswordChange ? 'Login successful. Please set your password.' : 'Login successful',
      data: { token, requiresPasswordChange, user: { _id: user._id, role: 'student', studentId: student._id, schoolId: student.schoolId, name: student.name } }
    });
  } catch (error) { return sendError(res, 500, 'Internal server error'); }
};

exports.parentLogin = async (req, res) => {
  try {
    const { studentId, password } = req.body;
    if (!studentId || !password) return sendError(res, 400, 'studentId and password are required');
    const student = await Student.findOne({ studentId: String(studentId).trim() });
    if (!student || !student.isActive) return sendError(res, 401, 'Invalid credentials');

    let parent = await ParentUser.findOne({ studentIdRef: student._id, firstName: { $exists: true } });
    if (!parent) {
      if (!student.parentFirstName) return sendError(res, 400, 'Parent account not configured for this student');
      parent = await ParentUser.create({ schoolId: student.schoolId, studentIdRef: student._id, studentId: student.studentId, firstName: student.parentFirstName, lastName: student.parentLastName || '', phoneNumber: student.parentPhoneNumber || '' });
    }

    let requiresPasswordChange = false;
    if (parent.passwordSetup && parent.password) {
      const ok = await bcrypt.compare(password, parent.password);
      if (!ok) return sendError(res, 401, 'Invalid credentials');
    } else {
      const firstName = (parent.firstName || '').trim().toLowerCase();
      if (!firstName || String(password).trim().toLowerCase() !== firstName) return sendError(res, 401, 'Invalid credentials');
      requiresPasswordChange = true;
    }

    parent.lastLogin = new Date();
    await parent.save();

    const token = signToken({ userId: parent._id, role: 'parent', schoolId: student.schoolId, studentId: student._id, userType: 'parent', requiresPasswordChange });
    return sendResponse(res, 200, {
      message: requiresPasswordChange ? 'Login successful. Please set your password.' : 'Login successful',
      data: { token, requiresPasswordChange, user: { _id: parent._id, role: 'parent', studentId: student._id, schoolId: student.schoolId, name: `${parent.firstName} ${parent.lastName || ''}`.trim() } }
    });
  } catch (error) { return sendError(res, 500, 'Internal server error'); }
};

exports.completeFirstLogin = async (req, res) => {
  try {
    const { role, userId, newPassword } = req.body;
    if (!role || !userId || !newPassword) return sendError(res, 400, 'role, userId and newPassword are required');
    if (String(newPassword).length < 4) return sendError(res, 400, 'New password must be at least 4 characters');

    const model = role === 'student' ? StudentUser : role === 'parent' ? ParentUser : null;
    if (!model) return sendError(res, 400, 'Invalid role');
    const user = await model.findById(userId);
    if (!user) return sendError(res, 404, 'User not found');

    user.password = await bcrypt.hash(newPassword, 12);
    user.passwordSetup = true;
    await user.save();

    const token = signToken({ userId: user._id, role, schoolId: user.schoolId, studentId: user.studentIdRef, userType: role, requiresPasswordChange: false });
    return sendResponse(res, 200, { message: 'Password set successfully', data: { token } });
  } catch (error) { return sendError(res, 500, 'Internal server error'); }
};

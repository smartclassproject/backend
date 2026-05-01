const Inquiry = require('../models/Inquiry');
const Student = require('../models/Student');
const { sendResponse, sendError } = require('../utils/response');

exports.createInquiry = async (req, res) => {
  try {
    const { subject, message, category = 'general', studentId } = req.body;
    if (!subject || !message) return sendError(res, 400, 'Subject and message are required');

    const schoolId = req.user.schoolId;
    let resolvedStudentId = studentId;
    if (req.user.role === 'student') resolvedStudentId = req.user.studentId;
    if (req.user.role === 'parent' && !resolvedStudentId) resolvedStudentId = req.user.studentId;

    if (resolvedStudentId) {
      const s = await Student.findById(resolvedStudentId);
      if (!s || s.schoolId.toString() !== schoolId.toString()) return sendError(res, 400, 'Invalid student for this school');
    }

    const item = await Inquiry.create({
      schoolId,
      studentId: resolvedStudentId,
      requesterId: req.user._id,
      requesterModel: req.user.role === 'parent' ? 'ParentUser' : 'StudentUser',
      requesterType: req.user.role === 'parent' ? 'PARENT' : 'STUDENT',
      subject,
      category,
      message
    });
    return sendResponse(res, 201, { message: 'Inquiry submitted successfully', data: item });
  } catch (error) {
    return sendError(res, 500, 'Internal server error');
  }
};

exports.getMyInquiries = async (req, res) => {
  try {
    const requesterModel = req.user.role === 'parent' ? 'ParentUser' : 'StudentUser';
    const items = await Inquiry.find({ requesterId: req.user._id, requesterModel }).sort({ createdAt: -1 });
    return sendResponse(res, 200, { message: 'Inquiries retrieved successfully', data: items });
  } catch (error) {
    return sendError(res, 500, 'Internal server error');
  }
};

exports.getSchoolInquiries = async (req, res) => {
  try {
    const query = { schoolId: req.user.schoolId };
    if (req.query.status) query.status = req.query.status;
    const items = await Inquiry.find(query).sort({ createdAt: -1 });
    return sendResponse(res, 200, { message: 'School inquiries retrieved successfully', data: items });
  } catch (error) {
    return sendError(res, 500, 'Internal server error');
  }
};

exports.replyToInquiry = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return sendError(res, 400, 'Reply message is required');
    const item = await Inquiry.findById(req.params.id);
    if (!item) return sendError(res, 404, 'Inquiry not found');

    const isAdmin = req.user.role === 'school_admin' || req.user.role === 'school_staff';
    const inSchool = item.schoolId.toString() === req.user.schoolId?.toString();
    const isOwner = item.requesterId.toString() === req.user._id.toString();
    if (!(isAdmin && inSchool) && !isOwner) return sendError(res, 403, 'Access denied');

    item.responses.push({
      authorId: req.user._id,
      authorModel: isAdmin ? (req.user.role === 'school_staff' ? 'SchoolStaff' : 'AdminUser') : (req.user.role === 'parent' ? 'ParentUser' : 'StudentUser'),
      message
    });
    if (isAdmin && item.status === 'OPEN') item.status = 'IN_PROGRESS';
    await item.save();
    return sendResponse(res, 200, { message: 'Reply submitted successfully', data: item });
  } catch (error) {
    return sendError(res, 500, 'Internal server error');
  }
};

exports.updateInquiryStatus = async (req, res) => {
  try {
    const { status, priority } = req.body;
    const item = await Inquiry.findById(req.params.id);
    if (!item) return sendError(res, 404, 'Inquiry not found');
    if (item.schoolId.toString() !== req.user.schoolId.toString()) return sendError(res, 403, 'Access denied');

    if (status) item.status = status;
    if (priority) item.priority = priority;
    if (req.body.assignedTo !== undefined) item.assignedTo = req.body.assignedTo || undefined;

    await item.save();
    return sendResponse(res, 200, { message: 'Inquiry updated successfully', data: item });
  } catch (error) {
    return sendError(res, 500, 'Internal server error');
  }
};

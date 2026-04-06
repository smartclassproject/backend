const Student = require('../models/Student');
const Course = require('../models/Course');
const CourseSchedule = require('../models/CourseSchedule');
const Material = require('../models/Material');
const Lesson = require('../models/Lesson');
const TermResult = require('../models/TermResult');
const StudentFeeAccount = require('../models/StudentFeeAccount');
const SchoolPaymentInstruction = require('../models/SchoolPaymentInstruction');
const FeePaymentSubmission = require('../models/FeePaymentSubmission');
const Announcement = require('../models/Announcement');
const Inquiry = require('../models/Inquiry');
const { sendResponse, sendError } = require('../utils/response');

exports.getMe = async (req, res) => {
  const student = await Student.findById(req.user.studentId).populate('majorId', 'name code').populate('classId', 'name code');
  if (!student) return sendError(res, 404, 'Student not found');
  return sendResponse(res, 200, { message: 'Student profile retrieved successfully', data: student });
};

exports.getTimetable = async (req, res) => {
  const student = await Student.findById(req.user.studentId);
  if (!student) return sendError(res, 404, 'Student not found');
  const courses = await Course.find({ schoolId: student.schoolId, majorId: student.majorId, isActive: true }).select('_id name code');
  const courseIds = courses.map(c => c._id);
  const schedules = await CourseSchedule.find({ schoolId: student.schoolId, courseId: { $in: courseIds }, isActive: true }).populate('courseId', 'name code').populate('teacherId', 'name').sort({ startDate: 1 });
  return sendResponse(res, 200, { message: 'Timetable retrieved successfully', data: { courses, schedules } });
};

exports.getReports = async (req, res) => {
  const results = await TermResult.find({ studentId: req.user.studentId, schoolId: req.user.schoolId }).populate('courseId', 'name code').sort({ academicYear: -1, term: -1, createdAt: -1 });
  return sendResponse(res, 200, { message: 'Reports retrieved successfully', data: results });
};

exports.downloadReport = async (req, res) => {
  const result = await TermResult.findById(req.params.id).populate('courseId', 'name code');
  if (!result) return sendError(res, 404, 'Report not found');
  if (result.studentId.toString() !== req.user.studentId.toString()) return sendError(res, 403, 'Access denied');

  const account = await StudentFeeAccount.findOne({ schoolId: req.user.schoolId, studentId: req.user.studentId }).sort({ updatedAt: -1 });
  if (!account || account.status !== 'PAID') return sendError(res, 403, 'Please complete school fees to download official report');
  return sendResponse(res, 200, { message: 'Report download authorized', data: { reportId: result._id, signed: true, downloadable: true } });
};

exports.getFees = async (req, res) => {
  const account = await StudentFeeAccount.findOne({ schoolId: req.user.schoolId, studentId: req.user.studentId }).sort({ updatedAt: -1 });
  const instructions = await SchoolPaymentInstruction.findOne({ schoolId: req.user.schoolId, isActive: true });
  const submissions = await FeePaymentSubmission.find({ schoolId: req.user.schoolId, studentId: req.user.studentId }).sort({ createdAt: -1 });
  return sendResponse(res, 200, { message: 'Fees data retrieved successfully', data: { account, instructions, submissions } });
};

exports.submitFeeProof = async (req, res) => {
  const { amountSubmitted, paymentMethod, paymentReference, paidAt, proofUrl, notes } = req.body;
  if (!amountSubmitted || !paymentMethod) return sendError(res, 400, 'amountSubmitted and paymentMethod are required');
  const doc = await FeePaymentSubmission.create({ schoolId: req.user.schoolId, studentId: req.user.studentId, submittedByType: 'STUDENT', submittedById: req.user._id, submittedByModel: 'StudentUser', amountSubmitted: Number(amountSubmitted), paymentMethod, paymentReference, paidAt: paidAt ? new Date(paidAt) : undefined, proofUrl, notes });
  return sendResponse(res, 201, { message: 'Payment proof submitted successfully', data: doc });
};

exports.getMaterials = async (req, res) => {
  const student = await Student.findById(req.user.studentId);
  if (!student) return sendError(res, 404, 'Student not found');
  const courses = await Course.find({ schoolId: student.schoolId, majorId: student.majorId, isActive: true }).select('_id');
  const courseIds = courses.map(c => c._id);
  const materials = await Material.find({ schoolId: student.schoolId, courseId: { $in: courseIds }, isPublished: true, isActive: true }).populate('courseId', 'name code').populate('teacherId', 'name').sort({ createdAt: -1 });
  return sendResponse(res, 200, { message: 'Materials retrieved successfully', data: materials });
};

exports.getLessons = async (req, res) => {
  const student = await Student.findById(req.user.studentId);
  if (!student) return sendError(res, 404, 'Student not found');
  const courses = await Course.find({ schoolId: student.schoolId, majorId: student.majorId, isActive: true }).select('_id');
  const courseIds = courses.map(c => c._id);
  const lessons = await Lesson.find({ schoolId: student.schoolId, courseId: { $in: courseIds }, isPublished: true, isActive: true }).populate('courseId', 'name code').populate('teacherId', 'name').sort({ lessonDate: -1 });
  return sendResponse(res, 200, { message: 'Lessons retrieved successfully', data: lessons });
};

exports.getAnnouncements = async (req, res) => {
  const now = new Date();
  const announcements = await Announcement.find({ schoolId: req.user.schoolId, isActive: true, publishAt: { $lte: now }, $and: [{ $or: [{ expiresAt: null }, { expiresAt: { $exists: false } }, { expiresAt: { $gte: now } }] }], $or: [{ targetAudience: { $in: ['ALL'] } }, { targetAudience: { $in: ['STUDENTS'] } }] }).sort({ isPinned: -1, publishAt: -1 });
  return sendResponse(res, 200, { message: 'Announcements retrieved successfully', data: announcements });
};

exports.createInquiry = async (req, res) => {
  const { subject, message, category = 'general' } = req.body;
  if (!subject || !message) return sendError(res, 400, 'Subject and message are required');
  const item = await Inquiry.create({ schoolId: req.user.schoolId, studentId: req.user.studentId, requesterId: req.user._id, requesterModel: 'StudentUser', requesterType: 'STUDENT', subject, category, message });
  return sendResponse(res, 201, { message: 'Inquiry submitted successfully', data: item });
};

exports.getInquiries = async (req, res) => {
  const items = await Inquiry.find({ requesterId: req.user._id, requesterModel: 'StudentUser' }).sort({ createdAt: -1 });
  return sendResponse(res, 200, { message: 'Inquiries retrieved successfully', data: items });
};

exports.replyInquiry = async (req, res) => {
  const { message } = req.body;
  if (!message) return sendError(res, 400, 'Reply message is required');
  const item = await Inquiry.findById(req.params.id);
  if (!item) return sendError(res, 404, 'Inquiry not found');
  if (item.requesterId.toString() !== req.user._id.toString() || item.requesterModel !== 'StudentUser') return sendError(res, 403, 'Access denied');
  item.responses.push({ authorId: req.user._id, authorModel: 'StudentUser', message });
  await item.save();
  return sendResponse(res, 200, { message: 'Reply submitted successfully', data: item });
};

const Student = require('../models/Student');
const TermResult = require('../models/TermResult');
const StudentFeeAccount = require('../models/StudentFeeAccount');
const SchoolPaymentInstruction = require('../models/SchoolPaymentInstruction');
const FeePaymentSubmission = require('../models/FeePaymentSubmission');
const Announcement = require('../models/Announcement');
const Inquiry = require('../models/Inquiry');
const { sendResponse, sendError } = require('../utils/response');

exports.getDashboard = async (req, res) => {
  const student = await Student.findById(req.user.studentId).populate('majorId', 'name code').populate('classId', 'name code');
  if (!student) return sendError(res, 404, 'Student not found');
  const account = await StudentFeeAccount.findOne({ schoolId: req.user.schoolId, studentId: req.user.studentId }).sort({ updatedAt: -1 });
  const latestResults = await TermResult.find({ schoolId: req.user.schoolId, studentId: req.user.studentId }).populate('courseId', 'name code').sort({ academicYear: -1, term: -1, createdAt: -1 }).limit(10);
  const announcements = await Announcement.find({ schoolId: req.user.schoolId, isActive: true, $or: [{ targetAudience: { $in: ['ALL'] } }, { targetAudience: { $in: ['PARENTS'] } }] }).sort({ isPinned: -1, publishAt: -1 }).limit(10);
  return sendResponse(res, 200, { message: 'Parent dashboard data retrieved successfully', data: { student, fees: account, latestResults, announcements } });
};

exports.getReports = async (req, res) => {
  const query = { schoolId: req.user.schoolId, studentId: req.user.studentId };
  const { academicYear, term } = req.query;
  if (academicYear !== undefined && academicYear !== null && academicYear !== '') {
    const y = parseInt(String(academicYear), 10);
    if (!Number.isNaN(y)) query.academicYear = y;
  }
  if (term !== undefined && term !== null && term !== '' && String(term).toLowerCase() !== 'all') {
    const t = parseInt(String(term), 10);
    if (!Number.isNaN(t)) query.term = t;
  }
  const results = await TermResult.find(query)
    .populate('courseId', 'name code')
    .sort({ academicYear: -1, term: 1, courseId: 1, createdAt: -1 });
  return sendResponse(res, 200, { message: 'Reports retrieved successfully', data: results });
};

exports.downloadReport = async (req, res) => {
  const result = await TermResult.findById(req.params.id);
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
  const amt = Number(amountSubmitted);
  if (
    amountSubmitted === undefined ||
    amountSubmitted === null ||
    amountSubmitted === '' ||
    Number.isNaN(amt) ||
    amt <= 0
  ) {
    return sendError(res, 400, 'amountSubmitted is required and must be a positive number');
  }
  if (!String(paymentMethod || '').trim()) {
    return sendError(res, 400, 'paymentMethod is required');
  }
  const doc = await FeePaymentSubmission.create({ schoolId: req.user.schoolId, studentId: req.user.studentId, submittedByType: 'PARENT', submittedById: req.user._id, submittedByModel: 'ParentUser', amountSubmitted: amt, paymentMethod, paymentReference, paidAt: paidAt ? new Date(paidAt) : undefined, proofUrl, notes });
  return sendResponse(res, 201, { message: 'Payment proof submitted successfully', data: doc });
};

exports.getAnnouncements = async (req, res) => {
  const now = new Date();
  const items = await Announcement.find({ schoolId: req.user.schoolId, isActive: true, publishAt: { $lte: now }, $and: [{ $or: [{ expiresAt: null }, { expiresAt: { $exists: false } }, { expiresAt: { $gte: now } }] }], $or: [{ targetAudience: { $in: ['ALL'] } }, { targetAudience: { $in: ['PARENTS'] } }] }).sort({ isPinned: -1, publishAt: -1 });
  return sendResponse(res, 200, { message: 'Announcements retrieved successfully', data: items });
};

exports.createInquiry = async (req, res) => {
  const { subject, message, category = 'general' } = req.body;
  if (!subject || !message) return sendError(res, 400, 'Subject and message are required');
  const item = await Inquiry.create({ schoolId: req.user.schoolId, studentId: req.user.studentId, requesterId: req.user._id, requesterModel: 'ParentUser', requesterType: 'PARENT', subject, category, message });
  return sendResponse(res, 201, { message: 'Inquiry submitted successfully', data: item });
};

exports.getInquiries = async (req, res) => {
  const items = await Inquiry.find({ requesterId: req.user._id, requesterModel: 'ParentUser' }).sort({ createdAt: -1 });
  return sendResponse(res, 200, { message: 'Inquiries retrieved successfully', data: items });
};

exports.replyInquiry = async (req, res) => {
  const { message } = req.body;
  if (!message) return sendError(res, 400, 'Reply message is required');
  const item = await Inquiry.findById(req.params.id);
  if (!item) return sendError(res, 404, 'Inquiry not found');
  if (item.requesterId.toString() !== req.user._id.toString() || item.requesterModel !== 'ParentUser') return sendError(res, 403, 'Access denied');
  item.responses.push({ authorId: req.user._id, authorModel: 'ParentUser', message });
  await item.save();
  return sendResponse(res, 200, { message: 'Reply submitted successfully', data: item });
};

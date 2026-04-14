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
const StudentUser = require('../models/StudentUser');
const PrivacyPolicy = require('../models/PrivacyPolicy');
const FileAsset = require('../models/FileAsset');
const bcrypt = require('bcryptjs');
const { sendResponse, sendError } = require('../utils/response');

exports.getMe = async (req, res) => {
  const student = await Student.findById(req.user.studentId).populate('majorId', 'name code').populate('classId', 'name code');
  if (!student) return sendError(res, 404, 'Student not found');
  const data = {
    identity: {
      name: student.name,
      studentId: student.studentId,
      className: student.classId?.name || student.class || null,
      status: student.isActive ? 'active' : 'inactive',
    },
    personal: {
      dateOfBirth: student.dateOfBirth,
      gender: student.gender || null,
      email: student.email || null,
      phone: student.phone || null,
      profileUrl: student.profileUrl || null,
    },
    academic: {
      major: student.majorId?.name || null,
      majorCode: student.majorId?.code || null,
      enrollmentYear: student.enrollmentYear || null,
      academicYear: student.academicYear || null,
      entryTerm: student.entryTerm || null,
      enrollmentSeason: student.enrollmentSeason || null,
      enrollmentCohortYear: student.enrollmentCohortYear || null,
    },
    parentGuardian: {
      firstName: student.parentFirstName || null,
      lastName: student.parentLastName || null,
      phoneNumber: student.parentPhoneNumber || null,
    },
    raw: student,
  };
  return sendResponse(res, 200, { message: 'Student profile retrieved successfully', data });
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
  const submissions = await FeePaymentSubmission.find({ schoolId: req.user.schoolId, studentId: req.user.studentId })
    .populate('proofAssetId', 'publicUrl mimeType category originalName sizeBytes')
    .sort({ createdAt: -1 });
  const paymentInstructions = instructions
    ? {
        paymentMethods: [
          instructions.bankAccountNumber ? 'BANK_TRANSFER' : null,
          instructions.momoNumber ? 'MOMO' : null,
        ].filter(Boolean),
        bankName: instructions.bankName || null,
        accountName: instructions.bankAccountName || instructions.momoAccountName || null,
        accountNumber: instructions.bankAccountNumber || null,
        walletNumber: instructions.momoNumber || null,
        notes: instructions.instructionsText || null,
        updatedAt: instructions.updatedAt,
      }
    : null;
  return sendResponse(res, 200, {
    message: 'Fees data retrieved successfully',
    data: { account, instructions, paymentInstructions, submissions },
  });
};

exports.submitFeeProof = async (req, res) => {
  const { amountSubmitted, paymentMethod, paymentReference, paidAt, proofUrl, proofAssetId, notes } = req.body;
  if (!amountSubmitted || !paymentMethod) return sendError(res, 400, 'amountSubmitted and paymentMethod are required');
  let resolvedProofUrl = proofUrl || null;
  let resolvedProofAssetId = null;

  if (proofAssetId) {
    const asset = await FileAsset.findById(proofAssetId);
    if (!asset) return sendError(res, 404, 'Uploaded proof file not found');
    if (String(asset.schoolId) !== String(req.user.schoolId)) return sendError(res, 403, 'Proof file does not belong to your school');
    if (asset.context !== 'fees_proof' || asset.category !== 'image') {
      return sendError(res, 400, 'Fee proof must be an uploaded image in fees_proof context');
    }
    resolvedProofAssetId = asset._id;
    resolvedProofUrl = asset.publicUrl;
  } else if (!proofUrl) {
    return sendError(res, 400, 'Payment proof image is required');
  }

  const doc = await FeePaymentSubmission.create({
    schoolId: req.user.schoolId,
    studentId: req.user.studentId,
    submittedByType: 'STUDENT',
    submittedById: req.user._id,
    submittedByModel: 'StudentUser',
    amountSubmitted: Number(amountSubmitted),
    paymentMethod,
    paymentReference,
    paidAt: paidAt ? new Date(paidAt) : undefined,
    proofUrl: resolvedProofUrl,
    proofAssetId: resolvedProofAssetId,
    notes,
  });
  return sendResponse(res, 201, { message: 'Payment proof submitted successfully', data: doc });
};

exports.getMaterials = async (req, res) => {
  const student = await Student.findById(req.user.studentId);
  if (!student) return sendError(res, 404, 'Student not found');
  const courses = await Course.find({ schoolId: student.schoolId, majorId: student.majorId, isActive: true }).select('_id');
  const courseIds = courses.map(c => c._id);
  const materials = await Material.find({ schoolId: student.schoolId, courseId: { $in: courseIds }, isPublished: true, isActive: true }).populate('courseId', 'name code').populate('teacherId', 'name').sort({ createdAt: -1 });
  const data = materials.map((m) => ({
    _id: m._id,
    title: m.title,
    description: m.description || null,
    subject: m.courseId?.name || null,
    courseCode: m.courseId?.code || null,
    fileType: m.fileType || 'other',
    fileSize: m.fileSize || null,
    downloadUrl: m.fileUrl,
    fileUrl: m.fileUrl,
    publishedAt: m.createdAt,
    teacherName: m.teacherId?.name || null,
    raw: m,
  }));
  return sendResponse(res, 200, { message: 'Materials retrieved successfully', data });
};

exports.getLessons = async (req, res) => {
  const student = await Student.findById(req.user.studentId);
  if (!student) return sendError(res, 404, 'Student not found');
  const courses = await Course.find({ schoolId: student.schoolId, majorId: student.majorId, isActive: true }).select('_id');
  const courseIds = courses.map(c => c._id);
  const lessons = await Lesson.find({ schoolId: student.schoolId, courseId: { $in: courseIds }, isPublished: true, isActive: true }).populate('courseId', 'name code').populate('teacherId', 'name').sort({ lessonDate: -1 });
  const data = lessons.map((l) => ({
    _id: l._id,
    title: l.title,
    summary: l.description || null,
    subject: l.courseId?.name || null,
    courseCode: l.courseId?.code || null,
    lessonDate: l.lessonDate,
    teacherName: l.teacherId?.name || null,
    materials: l.materials || [],
    raw: l,
  }));
  return sendResponse(res, 200, { message: 'Lessons retrieved successfully', data });
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
  const items = await Inquiry.find({ requesterId: req.user._id, requesterModel: 'StudentUser' }).sort({ updatedAt: -1, createdAt: -1 });
  const data = items.map((item) => ({
    ...item.toObject(),
    statusLabel: item.status === 'IN_PROGRESS' ? 'answered' : item.status.toLowerCase(),
    thread: [
      {
        authorRole: 'student',
        message: item.message,
        createdAt: item.createdAt,
      },
      ...item.responses.map((r) => ({
        authorRole: r.authorModel === 'AdminUser' ? 'admin' : 'student',
        message: r.message,
        createdAt: r.createdAt,
      })),
    ],
  }));
  return sendResponse(res, 200, { message: 'Inquiries retrieved successfully', data });
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

exports.getPrivacyPolicy = async (req, res) => {
  const schoolPolicy = await PrivacyPolicy.findOne({ schoolId: req.user.schoolId, isActive: true }).sort({ updatedAt: -1 });
  const globalPolicy = !schoolPolicy
    ? await PrivacyPolicy.findOne({ schoolId: null, isActive: true }).sort({ updatedAt: -1 })
    : null;
  const policy = schoolPolicy || globalPolicy;
  return sendResponse(res, 200, {
    message: 'Privacy policy retrieved successfully',
    data: policy
      ? {
          title: policy.title,
          content: policy.content,
          version: policy.version || null,
          updatedAt: policy.updatedAt,
          source: schoolPolicy ? 'school' : 'global',
        }
      : null,
  });
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  if (!currentPassword || !newPassword) return sendError(res, 400, 'currentPassword and newPassword are required');
  if (confirmPassword !== undefined && newPassword !== confirmPassword) {
    return sendError(res, 400, 'confirmPassword does not match newPassword');
  }
  if (String(newPassword).length < 4) return sendError(res, 400, 'New password must be at least 4 characters');

  const studentUser = await StudentUser.findById(req.user._id);
  if (!studentUser) return sendError(res, 404, 'Student user not found');

  const isValid = await studentUser.comparePassword(currentPassword);
  if (!isValid) return sendError(res, 400, 'Current password is incorrect');

  studentUser.password = await bcrypt.hash(newPassword, 12);
  studentUser.passwordSetup = true;
  await studentUser.save();
  return sendResponse(res, 200, { message: 'Password changed successfully' });
};

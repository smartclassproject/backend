const Student = require('../models/Student');
const SchoolPaymentInstruction = require('../models/SchoolPaymentInstruction');
const StudentFeeAccount = require('../models/StudentFeeAccount');
const FeePaymentSubmission = require('../models/FeePaymentSubmission');
const { sendResponse, sendError, isValidObjectId } = require('../utils/response');

const ensureStudentInSchool = async (studentId, schoolId) => {
  const student = await Student.findById(studentId);
  if (!student) return null;
  if (student.schoolId.toString() !== schoolId.toString()) return null;
  return student;
};

exports.upsertInstructions = async (req, res) => {
  try {
    const payload = {
      schoolId: req.user.schoolId,
      bankName: req.body.bankName,
      bankAccountName: req.body.bankAccountName,
      bankAccountNumber: req.body.bankAccountNumber,
      momoNumber: req.body.momoNumber,
      momoAccountName: req.body.momoAccountName,
      instructionsText: req.body.instructionsText,
      isActive: req.body.isActive !== undefined ? !!req.body.isActive : true
    };
    const doc = await SchoolPaymentInstruction.findOneAndUpdate(
      { schoolId: req.user.schoolId }, payload, { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return sendResponse(res, 200, { message: 'Payment instructions saved successfully', data: doc });
  } catch (error) { return sendError(res, 500, 'Internal server error'); }
};

exports.getInstructions = async (req, res) => {
  try {
    const schoolId = req.user.schoolId || req.query.schoolId;
    if (!schoolId) return sendError(res, 400, 'School ID is required');
    const doc = await SchoolPaymentInstruction.findOne({ schoolId, isActive: true });
    return sendResponse(res, 200, { message: 'Payment instructions retrieved successfully', data: doc || null });
  } catch (error) { return sendError(res, 500, 'Internal server error'); }
};

exports.upsertFeeAccount = async (req, res) => {
  try {
    const { studentId, academicYear, term, totalAmountDue, currency } = req.body;
    if (!studentId || totalAmountDue === undefined) return sendError(res, 400, 'studentId and totalAmountDue are required');
    if (!isValidObjectId(studentId)) return sendError(res, 400, 'Invalid student ID');

    const student = await ensureStudentInSchool(studentId, req.user.schoolId);
    if (!student) return sendError(res, 404, 'Student not found in your school');

    const doc = await StudentFeeAccount.findOneAndUpdate(
      { schoolId: req.user.schoolId, studentId, academicYear: academicYear || null, term: term || null },
      { schoolId: req.user.schoolId, studentId, academicYear: academicYear || undefined, term: term || undefined, currency: currency || 'RWF', totalAmountDue: Number(totalAmountDue), lastUpdatedBy: req.user._id },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    await doc.save();
    return sendResponse(res, 200, { message: 'Student fee account saved successfully', data: doc });
  } catch (error) { return sendError(res, 500, 'Internal server error'); }
};

exports.getFeeAccounts = async (req, res) => {
  try {
    const query = { schoolId: req.user.schoolId };
    if (req.query.studentId) query.studentId = req.query.studentId;
    if (req.query.status) query.status = req.query.status;
    if (req.query.academicYear) query.academicYear = parseInt(req.query.academicYear, 10);
    if (req.query.term) query.term = parseInt(req.query.term, 10);

    const accounts = await StudentFeeAccount.find(query).populate('studentId', 'name studentId class classId enrollmentYear').sort({ updatedAt: -1 });
    return sendResponse(res, 200, { message: 'Fee accounts retrieved successfully', data: accounts });
  } catch (error) { return sendError(res, 500, 'Internal server error'); }
};

exports.submitPaymentProof = async (req, res) => {
  try {
    const { studentId, amountSubmitted, paymentMethod, paymentReference, paidAt, proofUrl, notes } = req.body;
    if (!studentId) return sendError(res, 400, 'studentId is required');
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

    const student = await ensureStudentInSchool(studentId, req.user.schoolId);
    if (!student) return sendError(res, 404, 'Student not found in your school');

    const isParent = req.user.role === 'parent';
    if (isParent && req.user.studentId && req.user.studentId.toString() !== studentId.toString()) return sendError(res, 403, 'Parents can only submit for linked student');

    const doc = await FeePaymentSubmission.create({
      schoolId: req.user.schoolId,
      studentId,
      submittedByType: isParent ? 'PARENT' : 'STUDENT',
      submittedById: req.user._id,
      submittedByModel: isParent ? 'ParentUser' : 'StudentUser',
      amountSubmitted: amt, paymentMethod, paymentReference,
      paidAt: paidAt ? new Date(paidAt) : undefined, proofUrl, notes
    });

    const account = await StudentFeeAccount.findOne({ schoolId: req.user.schoolId, studentId }).sort({ updatedAt: -1 });
    if (account && account.status !== 'PAID') { account.status = 'UNDER_REVIEW'; await account.save(); }

    return sendResponse(res, 201, { message: 'Payment proof submitted successfully', data: doc });
  } catch (error) { return sendError(res, 500, 'Internal server error'); }
};

exports.getPaymentSubmissions = async (req, res) => {
  try {
    const query = { schoolId: req.user.schoolId };
    if (req.user.role === 'student' || req.user.role === 'parent') query.studentId = req.user.studentId;
    if (req.query.status) query.verificationStatus = req.query.status;
    if (req.query.studentId && req.user.role === 'school_admin') query.studentId = req.query.studentId;

    const docs = await FeePaymentSubmission.find(query).populate('studentId', 'name studentId class classId').sort({ createdAt: -1 });
    return sendResponse(res, 200, { message: 'Payment submissions retrieved successfully', data: docs });
  } catch (error) { return sendError(res, 500, 'Internal server error'); }
};

exports.approveSubmission = async (req, res) => {
  try {
    const doc = await FeePaymentSubmission.findById(req.params.id);
    if (!doc) return sendError(res, 404, 'Submission not found');
    if (doc.schoolId.toString() !== req.user.schoolId.toString()) return sendError(res, 403, 'Access denied');
    if (doc.verificationStatus !== 'PENDING') return sendError(res, 400, 'Only pending submissions can be approved');

    doc.verificationStatus = 'APPROVED'; doc.verifiedBy = req.user._id; doc.verifiedAt = new Date(); doc.rejectionReason = undefined;
    await doc.save();

    let account = await StudentFeeAccount.findOne({ schoolId: doc.schoolId, studentId: doc.studentId }).sort({ updatedAt: -1 });
    if (!account) {
      account = await StudentFeeAccount.create({ schoolId: doc.schoolId, studentId: doc.studentId, totalAmountDue: 0, totalAmountPaid: Number(doc.amountSubmitted), lastUpdatedBy: req.user._id });
    } else {
      account.totalAmountPaid = Number(account.totalAmountPaid || 0) + Number(doc.amountSubmitted || 0);
      account.lastUpdatedBy = req.user._id;
      await account.save();
    }
    return sendResponse(res, 200, { message: 'Payment submission approved successfully', data: doc });
  } catch (error) { return sendError(res, 500, 'Internal server error'); }
};

exports.rejectSubmission = async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    const doc = await FeePaymentSubmission.findById(req.params.id);
    if (!doc) return sendError(res, 404, 'Submission not found');
    if (doc.schoolId.toString() !== req.user.schoolId.toString()) return sendError(res, 403, 'Access denied');
    if (doc.verificationStatus !== 'PENDING') return sendError(res, 400, 'Only pending submissions can be rejected');

    doc.verificationStatus = 'REJECTED'; doc.verifiedBy = req.user._id; doc.verifiedAt = new Date();
    doc.rejectionReason = rejectionReason || 'Submission rejected by school';
    await doc.save();

    const account = await StudentFeeAccount.findOne({ schoolId: doc.schoolId, studentId: doc.studentId }).sort({ updatedAt: -1 });
    if (account && account.status === 'UNDER_REVIEW') { account.status = account.totalAmountPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID'; await account.save(); }

    return sendResponse(res, 200, { message: 'Payment submission rejected successfully', data: doc });
  } catch (error) { return sendError(res, 500, 'Internal server error'); }
};

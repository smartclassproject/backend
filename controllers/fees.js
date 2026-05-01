const Student = require('../models/Student');
const SchoolPaymentInstruction = require('../models/SchoolPaymentInstruction');
const StudentFeeAccount = require('../models/StudentFeeAccount');
const FeePaymentSubmission = require('../models/FeePaymentSubmission');
const { sendResponse, sendError, isValidObjectId } = require('../utils/response');
const {
  findPreferredFeeAccount,
  legacyFeeBucketKey,
  cohortFeeBucketKey,
  SCHOOL_WIDE_FEE_BUCKET,
} = require('../utils/feeAccountHelpers');

const MAX_BULK_STUDENTS = 5000;

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

    const ay = academicYear != null && academicYear !== '' ? Number(academicYear) : null;
    const tm = term != null && term !== '' ? Number(term) : null;
    const feeBucketKey = legacyFeeBucketKey(ay, tm);

    const doc = await StudentFeeAccount.findOneAndUpdate(
      { schoolId: req.user.schoolId, studentId, feeBucketKey },
      {
        $set: {
          schoolId: req.user.schoolId,
          studentId,
          feeBucketKey,
          academicYear: ay != null && !Number.isNaN(ay) ? ay : undefined,
          term: tm != null && !Number.isNaN(tm) ? tm : undefined,
          currency: currency || 'RWF',
          totalAmountDue: Number(totalAmountDue),
          lastUpdatedBy: req.user._id,
        },
        $unset: { enrollmentSeason: '', enrollmentCohortYear: '' },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    await doc.save();
    return sendResponse(res, 200, { message: 'Student fee account saved successfully', data: doc });
  } catch (error) { return sendError(res, 500, 'Internal server error'); }
};

exports.bulkUpsertFeeAccounts = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const {
      mode,
      enrollmentSeason,
      enrollmentCohortYear,
      onlyActive,
      totalAmountDue,
      currency = 'RWF',
      dryRun,
    } = req.body;

    const amt = Number(totalAmountDue);
    if (Number.isNaN(amt) || amt < 0) return sendError(res, 400, 'totalAmountDue must be a non-negative number');

    const activeOnly = onlyActive !== false;
    if (!mode || !['ALL_ACTIVE', 'COHORT'].includes(mode)) {
      return sendError(res, 400, 'mode must be ALL_ACTIVE or COHORT');
    }

    const studentFilter = { schoolId };
    if (activeOnly) studentFilter.isActive = true;

    let feeBucketKey;
    if (mode === 'COHORT') {
      const season = enrollmentSeason ? String(enrollmentSeason).toLowerCase() : '';
      const cy = enrollmentCohortYear != null && enrollmentCohortYear !== '' ? Number(enrollmentCohortYear) : NaN;
      if (!['fall', 'spring', 'summer', 'winter'].includes(season)) {
        return sendError(res, 400, 'enrollmentSeason is required for COHORT mode (fall, spring, summer, winter)');
      }
      if (Number.isNaN(cy) || cy < 2000 || cy > 2100) {
        return sendError(res, 400, 'enrollmentCohortYear is required for COHORT mode');
      }
      studentFilter.enrollmentSeason = season;
      studentFilter.enrollmentCohortYear = cy;
      try {
        feeBucketKey = cohortFeeBucketKey(season, cy);
      } catch (e) {
        return sendError(res, 400, e.message || 'Invalid cohort');
      }
    } else {
      feeBucketKey = SCHOOL_WIDE_FEE_BUCKET;
    }

    const total = await Student.countDocuments(studentFilter);
    if (total > MAX_BULK_STUDENTS) {
      return sendError(res, 400, `Too many students (${total}). Maximum per request is ${MAX_BULK_STUDENTS}.`);
    }

    let skippedMissingCohort = 0;
    if (mode === 'COHORT' && dryRun) {
      const base = { schoolId };
      if (activeOnly) base.isActive = true;
      skippedMissingCohort = await Student.countDocuments({
        ...base,
        $or: [
          { enrollmentSeason: { $in: [null, ''] } },
          { enrollmentSeason: { $exists: false } },
          { enrollmentCohortYear: null },
          { enrollmentCohortYear: { $exists: false } },
        ],
      });
    }

    const sample = await Student.find(studentFilter)
      .select('name studentId enrollmentSeason enrollmentCohortYear')
      .sort({ name: 1 })
      .limit(20)
      .lean();

    const cohortLabel = (s, y) => {
      if (!s || y == null || y === '') return '—';
      const cap = String(s).charAt(0).toUpperCase() + String(s).slice(1).toLowerCase();
      return `${cap} ${y}`;
    };
    const sampleOut = sample.map((s) => ({
      _id: s._id,
      name: s.name,
      studentId: s.studentId,
      cohortLabel: cohortLabel(s.enrollmentSeason, s.enrollmentCohortYear),
    }));

    if (dryRun) {
      return sendResponse(res, 200, {
        message: 'Bulk fee preview',
        data: {
          total,
          feeBucketKey,
          sample: sampleOut,
          skippedMissingCohort,
        },
      });
    }

    if (total === 0) {
      return sendError(res, 400, 'No students match this selection');
    }

    const students = await Student.find(studentFilter).select('_id').lean();
    let applied = 0;
    const failed = [];
    const cur = String(currency || 'RWF').toUpperCase().slice(0, 10);

    for (const s of students) {
      try {
        const $set = {
          schoolId,
          studentId: s._id,
          feeBucketKey,
          totalAmountDue: amt,
          currency: cur,
          lastUpdatedBy: req.user._id,
        };
        const $unset = { academicYear: '', term: '' };
        if (mode === 'COHORT') {
          const season = String(enrollmentSeason).toLowerCase();
          $set.enrollmentSeason = season;
          $set.enrollmentCohortYear = Number(enrollmentCohortYear);
        } else {
          $unset.enrollmentSeason = '';
          $unset.enrollmentCohortYear = '';
        }

        const doc = await StudentFeeAccount.findOneAndUpdate(
          { schoolId, studentId: s._id, feeBucketKey },
          { $set, $unset },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        if (doc) await doc.save();
        applied += 1;
      } catch (err) {
        failed.push({ studentId: String(s._id), reason: err.message || 'update failed' });
      }
    }

    return sendResponse(res, 200, {
      message: 'Bulk fee accounts updated',
      data: { applied, failed, feeBucketKey },
    });
  } catch (error) {
    return sendError(res, 500, 'Internal server error');
  }
};

exports.getFeeAccounts = async (req, res) => {
  try {
    const query = { schoolId: req.user.schoolId };
    if (req.query.studentId) query.studentId = req.query.studentId;
    if (req.query.status) query.status = req.query.status;
    if (req.query.academicYear) query.academicYear = parseInt(req.query.academicYear, 10);
    if (req.query.term) query.term = parseInt(req.query.term, 10);

    const accounts = await StudentFeeAccount.find(query)
      .populate('studentId', 'name studentId class classId enrollmentYear enrollmentSeason enrollmentCohortYear')
      .sort({ updatedAt: -1 });
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
    const account = await findPreferredFeeAccount(req.user.schoolId, studentId);
    if (!account) return sendError(res, 400, 'No fee account found for this student');
    const remainingBalance = Number(account.balance || 0);
    if (remainingBalance <= 0) {
      return sendError(res, 400, 'Fees are already fully paid. No additional payment is required.');
    }
    if (amt > remainingBalance) {
      return sendError(res, 400, `Amount cannot be greater than remaining balance (${remainingBalance})`);
    }

    const doc = await FeePaymentSubmission.create({
      schoolId: req.user.schoolId,
      studentId,
      submittedByType: isParent ? 'PARENT' : 'STUDENT',
      submittedById: req.user._id,
      submittedByModel: isParent ? 'ParentUser' : 'StudentUser',
      amountSubmitted: amt, paymentMethod, paymentReference,
      paidAt: paidAt ? new Date(paidAt) : undefined, proofUrl, notes
    });

    if (account && account.status !== 'PAID') { account.status = 'UNDER_REVIEW'; await account.save(); }

    return sendResponse(res, 201, { message: 'Payment proof submitted successfully', data: doc });
  } catch (error) { return sendError(res, 500, 'Internal server error'); }
};

exports.getPaymentSubmissions = async (req, res) => {
  try {
    const query = { schoolId: req.user.schoolId };
    if (req.user.role === 'student' || req.user.role === 'parent') query.studentId = req.user.studentId;
    if (req.query.status) query.verificationStatus = req.query.status;
    if (req.query.studentId && (req.user.role === 'school_admin' || req.user.role === 'school_staff')) query.studentId = req.query.studentId;

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

    let account = await findPreferredFeeAccount(doc.schoolId, doc.studentId);
    if (!account) {
      const st = await Student.findById(doc.studentId).select('enrollmentSeason enrollmentCohortYear');
      const payload = {
        schoolId: doc.schoolId,
        studentId: doc.studentId,
        totalAmountDue: 0,
        totalAmountPaid: Number(doc.amountSubmitted),
        lastUpdatedBy: req.user._id,
      };
      if (st?.enrollmentSeason && st.enrollmentCohortYear != null && st.enrollmentCohortYear !== '') {
        payload.enrollmentSeason = String(st.enrollmentSeason).toLowerCase();
        payload.enrollmentCohortYear = Number(st.enrollmentCohortYear);
      }
      account = await StudentFeeAccount.create(payload);
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

    const account = await findPreferredFeeAccount(doc.schoolId, doc.studentId);
    if (account && account.status === 'UNDER_REVIEW') { account.status = account.totalAmountPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID'; await account.save(); }

    return sendResponse(res, 200, { message: 'Payment submission rejected successfully', data: doc });
  } catch (error) { return sendError(res, 500, 'Internal server error'); }
};

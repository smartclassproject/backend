const Student = require('../models/Student');
const StudentFeeAccount = require('../models/StudentFeeAccount');

const SEASONS = new Set(['fall', 'spring', 'summer', 'winter']);

exports.SCHOOL_WIDE_FEE_BUCKET = 'school-wide';

exports.legacyFeeBucketKey = (academicYear, term) =>
  `legacy-${academicYear ?? 'null'}-t${term ?? 'null'}`;

exports.cohortFeeBucketKey = (season, cohortYear) => {
  const s = String(season || '').toLowerCase();
  if (!SEASONS.has(s)) throw new Error('Invalid enrollment season');
  return `${s}-${Number(cohortYear)}`;
};

/**
 * Preferred fee row for a student: cohort bucket if it exists, else school-wide, else latest by updatedAt.
 */
exports.findPreferredFeeAccount = async (schoolId, studentId) => {
  const sid = String(schoolId);
  const stid = String(studentId);
  const student = await Student.findById(stid).select('enrollmentSeason enrollmentCohortYear');
  const season = student?.enrollmentSeason ? String(student.enrollmentSeason).toLowerCase() : '';
  const cy = student?.enrollmentCohortYear;
  if (season && SEASONS.has(season) && cy !== undefined && cy !== null && !Number.isNaN(Number(cy))) {
    const key = `${season}-${Number(cy)}`;
    const hit = await StudentFeeAccount.findOne({ schoolId: sid, studentId: stid, feeBucketKey: key });
    if (hit) return hit;
  }
  const wide = await StudentFeeAccount.findOne({
    schoolId: sid,
    studentId: stid,
    feeBucketKey: exports.SCHOOL_WIDE_FEE_BUCKET,
  });
  if (wide) return wide;
  return StudentFeeAccount.findOne({ schoolId: sid, studentId: stid }).sort({ updatedAt: -1 });
};

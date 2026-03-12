const TermResult = require('../models/TermResult');
const School = require('../models/School');
const Course = require('../models/Course');
const Student = require('../models/Student');
const CourseSchedule = require('../models/CourseSchedule');
const { sendResponse, sendError, isValidObjectId } = require('../utils/response');

/**
 * GET /api/report-cards/students-for-term
 * Teacher: get list of students (in same major as course) for a course to enter term results.
 * Query: courseId, academicYear, term
 */
exports.getStudentsForTerm = async (req, res) => {
  try {
    const { courseId, academicYear, term } = req.query;
    if (!courseId || !academicYear || !term) {
      return sendError(res, 400, 'courseId, academicYear, and term are required');
    }
    if (!isValidObjectId(courseId)) return sendError(res, 400, 'Invalid course ID');

    const schoolId = req.user.schoolId;
    const teacherId = req.user.teacherId || req.user._id;

    const course = await Course.findById(courseId);
    if (!course) return sendError(res, 404, 'Course not found');
    if (course.schoolId.toString() !== schoolId.toString()) {
      return sendError(res, 403, 'Course does not belong to your school');
    }

    // Teacher must be assigned to this course (via at least one schedule)
    const assigned = await CourseSchedule.exists({ courseId, teacherId });
    if (!assigned) return sendError(res, 403, 'You are not assigned to this course');

    const school = await School.findById(schoolId);
    const maxTerm = school?.numberOfTerms ?? 3;
    const termNum = parseInt(term, 10);
    if (isNaN(termNum) || termNum < 1 || termNum > maxTerm) {
      return sendError(res, 400, `Term must be between 1 and ${maxTerm}`);
    }

    // Students in the same major as the course
    const students = await Student.find({
      schoolId,
      majorId: course.majorId,
      isActive: true
    })
      .select('_id name studentId class')
      .sort({ name: 1 });

    // Existing results for this term/course/year (to pre-fill)
    const existing = await TermResult.find({
      schoolId,
      academicYear: parseInt(academicYear, 10),
      term: termNum,
      courseId
    }).select('studentId examMarks disciplineMarks remarks');

    const existingMap = new Map(existing.map(r => [r.studentId.toString(), r]));

    const list = students.map(s => {
      const ex = existingMap.get(s._id.toString());
      return {
        _id: s._id,
        name: s.name,
        studentId: s.studentId,
        class: s.class,
        examMarks: ex?.examMarks ?? '',
        disciplineMarks: ex?.disciplineMarks ?? '',
        remarks: ex?.remarks ?? ''
      };
    });

    return sendResponse(res, 200, {
      message: 'Students retrieved for term',
      data: list,
      course: { _id: course._id, name: course.name, code: course.code },
      academicYear: parseInt(academicYear, 10),
      term: termNum
    });
  } catch (error) {
    sendError(res, 500, 'Error fetching students for term', error);
  }
};

/**
 * POST /api/report-cards/term-results
 * Teacher: submit or update term results (exam + discipline marks) for a course.
 * Body: { academicYear, term, courseId, results: [{ studentId, examMarks, disciplineMarks, remarks? }] }
 */
exports.submitTermResults = async (req, res) => {
  try {
    const { academicYear, term, courseId, results } = req.body;
    if (!academicYear || !term || !courseId || !Array.isArray(results)) {
      return sendError(res, 400, 'academicYear, term, courseId, and results array are required');
    }
    if (!isValidObjectId(courseId)) return sendError(res, 400, 'Invalid course ID');

    const schoolId = req.user.schoolId;
    const teacherId = req.user.teacherId || req.user._id;

    const course = await Course.findById(courseId);
    if (!course) return sendError(res, 404, 'Course not found');
    if (course.schoolId.toString() !== schoolId.toString()) {
      return sendError(res, 403, 'Course does not belong to your school');
    }

    const assigned = await CourseSchedule.exists({ courseId, teacherId });
    if (!assigned) return sendError(res, 403, 'You are not assigned to this course');

    const school = await School.findById(schoolId);
    const maxTerm = school?.numberOfTerms ?? 3;
    const termNum = parseInt(term, 10);
    const yearNum = parseInt(academicYear, 10);
    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      return sendError(res, 400, 'Invalid academic year');
    }
    if (isNaN(termNum) || termNum < 1 || termNum > maxTerm) {
      return sendError(res, 400, `Term must be between 1 and ${maxTerm}`);
    }

    const bulkOps = results.map(r => {
      const examMarks = typeof r.examMarks === 'number' ? r.examMarks : parseFloat(r.examMarks);
      const disciplineMarks = typeof r.disciplineMarks === 'number' ? r.disciplineMarks : parseFloat(r.disciplineMarks);
      if (isNaN(examMarks) || examMarks < 0 || examMarks > 100 ||
          isNaN(disciplineMarks) || disciplineMarks < 0 || disciplineMarks > 100) {
        return null;
      }
      return {
        updateOne: {
          filter: {
            schoolId,
            academicYear: yearNum,
            term: termNum,
            courseId,
            studentId: r.studentId
          },
          update: {
            $set: {
              schoolId,
              academicYear: yearNum,
              term: termNum,
              courseId,
              teacherId,
              studentId: r.studentId,
              examMarks,
              disciplineMarks: disciplineMarks,
              remarks: (r.remarks || '').trim().slice(0, 500),
              submittedAt: new Date()
            }
          },
          upsert: true
        }
      };
    }).filter(Boolean);

    if (bulkOps.length === 0) {
      return sendError(res, 400, 'No valid results to save. Each result must have examMarks and disciplineMarks (0-100).');
    }

    await TermResult.bulkWrite(bulkOps);

    return sendResponse(res, 200, {
      message: 'Term results saved successfully',
      data: { count: bulkOps.length }
    });
  } catch (error) {
    sendError(res, 500, 'Error saving term results', error);
  }
};

/**
 * GET /api/report-cards/my-results
 * Teacher: get my submitted term results (filter by academicYear, term, courseId).
 */
exports.getMyTermResults = async (req, res) => {
  try {
    const { academicYear, term, courseId, page = 1, limit = 50 } = req.query;
    const teacherId = req.user.teacherId || req.user._id;
    const schoolId = req.user.schoolId;

    const query = { schoolId, teacherId };
    if (academicYear) query.academicYear = parseInt(academicYear, 10);
    if (term) query.term = parseInt(term, 10);
    if (courseId) query.courseId = courseId;

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, Math.max(1, parseInt(limit, 10)));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const [results, total] = await Promise.all([
      TermResult.find(query)
        .populate('courseId', 'name code')
        .populate('studentId', 'name studentId class')
        .sort({ academicYear: -1, term: -1, courseId: 1 })
        .skip(skip)
        .limit(limitNum),
      TermResult.countDocuments(query)
    ]);

    return sendResponse(res, 200, {
      message: 'Term results retrieved',
      data: results,
      pagination: { page: parseInt(page, 10) || 1, limit: limitNum, total }
    });
  } catch (error) {
    sendError(res, 500, 'Error fetching term results', error);
  }
};

/**
 * GET /api/report-cards
 * School: get all report card entries with filters (academicYear, term, studentId, courseId, class).
 */
exports.getReportCards = async (req, res) => {
  try {
    const { academicYear, term, studentId, courseId, class: classFilter, page = 1, limit = 50 } = req.query;
    const schoolId = req.user.schoolId;

    const query = { schoolId };
    if (academicYear) query.academicYear = parseInt(academicYear, 10);
    if (term) query.term = parseInt(term, 10);
    if (studentId) query.studentId = studentId;
    if (courseId) query.courseId = courseId;

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, Math.max(1, parseInt(limit, 10)));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

    let results = await TermResult.find(query)
      .populate('courseId', 'name code')
      .populate('studentId', 'name studentId class majorId')
      .populate('teacherId', 'name')
      .sort({ academicYear: -1, term: -1, studentId: 1, courseId: 1 })
      .skip(skip)
      .limit(limitNum);

    if (classFilter) {
      results = results.filter(r => r.studentId && r.studentId.class === classFilter);
    }

    const total = await TermResult.countDocuments(query);

    return sendResponse(res, 200, {
      message: 'Report cards retrieved',
      data: results,
      pagination: { page: parseInt(page, 10) || 1, limit: limitNum, total }
    });
  } catch (error) {
    sendError(res, 500, 'Error fetching report cards', error);
  }
};

/**
 * GET /api/report-cards/student/:studentId
 * School: get full report card for one student (all terms, all courses).
 */
exports.getReportCardByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { academicYear } = req.query;
    if (!isValidObjectId(studentId)) return sendError(res, 400, 'Invalid student ID');

    const schoolId = req.user.schoolId;

    const student = await Student.findById(studentId)
      .populate('majorId', 'name code');
    if (!student) return sendError(res, 404, 'Student not found');
    if (student.schoolId.toString() !== schoolId.toString()) {
      return sendError(res, 403, 'Student does not belong to your school');
    }

    const query = { schoolId, studentId };
    if (academicYear) query.academicYear = parseInt(academicYear, 10);

    const results = await TermResult.find(query)
      .populate('courseId', 'name code')
      .populate('teacherId', 'name')
      .sort({ academicYear: -1, term: 1, courseId: 1 });

    // Group by academic year and term
    const byYearTerm = {};
    results.forEach(r => {
      const key = `${r.academicYear}-${r.term}`;
      if (!byYearTerm[key]) byYearTerm[key] = { academicYear: r.academicYear, term: r.term, courses: [] };
      byYearTerm[key].courses.push({
        courseId: r.courseId,
        courseName: r.courseId?.name,
        courseCode: r.courseId?.code,
        teacherName: r.teacherId?.name,
        examMarks: r.examMarks,
        disciplineMarks: r.disciplineMarks,
        remarks: r.remarks
      });
    });

    const reportCard = {
      student: {
        _id: student._id,
        name: student.name,
        studentId: student.studentId,
        class: student.class,
        major: student.majorId
      },
      terms: Object.values(byYearTerm).sort((a, b) => {
        if (a.academicYear !== b.academicYear) return b.academicYear - a.academicYear;
        return a.term - b.term;
      })
    };

    return sendResponse(res, 200, {
      message: 'Report card retrieved',
      data: reportCard
    });
  } catch (error) {
    sendError(res, 500, 'Error fetching report card', error);
  }
};

/**
 * GET /api/report-cards/terms-config
 * Get school's number of terms (for school_admin and teacher).
 */
exports.getTermsConfig = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    if (!schoolId) return sendError(res, 403, 'School context required');

    const school = await School.findById(schoolId).select('numberOfTerms');
    const numberOfTerms = school?.numberOfTerms ?? 3;

    return sendResponse(res, 200, {
      message: 'Terms config retrieved',
      data: { numberOfTerms }
    });
  } catch (error) {
    sendError(res, 500, 'Error fetching terms config', error);
  }
};

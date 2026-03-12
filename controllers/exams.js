const Exam = require('../models/Exam');
const Course = require('../models/Course');
const CourseSchedule = require('../models/CourseSchedule');
const { sendResponse, sendError } = require('../utils/response');

// GET /api/exams - Get all exams with pagination and filters
exports.getAllExams = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { courseId, scheduleId, teacherId, isPublished } = req.query;

    // Build query based on user role
    const query = {};
    
    // School admin can only see their school's exams
    if (req.user.role === 'school_admin') {
      query.schoolId = req.user.schoolId;
    }
    
    // Teacher can only see their own exams
    if (req.user.role === 'teacher' || req.user.userType === 'teacher') {
      query.teacherId = req.user.teacherId || req.user._id;
      query.schoolId = req.user.schoolId;
    }

    // Add filters
    if (courseId) query.courseId = courseId;
    if (scheduleId) query.scheduleId = scheduleId;
    if (teacherId && (req.user.role === 'school_admin' || req.user.role === 'super_admin')) {
      query.teacherId = teacherId;
    }
    if (isPublished !== undefined) query.isPublished = isPublished === 'true';

    const [exams, total] = await Promise.all([
      Exam.find(query)
        .populate('courseId', 'name code')
        .populate('scheduleId', 'classroom')
        .populate('teacherId', 'name email')
        .sort({ examDate: -1, examTime: -1 })
        .skip(skip)
        .limit(limit),
      Exam.countDocuments(query)
    ]);

    return sendResponse(res, 200, {
      message: 'Exams retrieved successfully',
      data: exams,
      pagination: { page, limit, total }
    });
  } catch (error) {
    sendError(res, 500, 'Error fetching exams', error);
  }
};

// GET /api/exams/:id - Get exam by ID
exports.getExamById = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('courseId', 'name code description')
      .populate('scheduleId', 'classroom weeklySessions')
      .populate('teacherId', 'name email phone');

    if (!exam) {
      return sendError(res, 404, 'Exam not found');
    }

    // Check access permissions
    if (req.user.role === 'school_admin' && exam.schoolId.toString() !== req.user.schoolId.toString()) {
      return sendError(res, 403, 'Access denied');
    }
    
    if ((req.user.role === 'teacher' || req.user.userType === 'teacher') && 
        exam.teacherId.toString() !== (req.user.teacherId || req.user._id).toString()) {
      return sendError(res, 403, 'Access denied');
    }

    return sendResponse(res, 200, { message: 'Exam retrieved successfully', data: exam });
  } catch (error) {
    sendError(res, 500, 'Error fetching exam', error);
  }
};

// POST /api/exams - Create new exam
exports.createExam = async (req, res) => {
  try {
    const {
      courseId,
      scheduleId,
      title,
      description,
      examDate,
      examTime,
      duration,
      maxScore,
      reportUrl,
      isPublished
    } = req.body;

    // Verify course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return sendError(res, 404, 'Course not found');
    }

    // Get teacher ID based on user role
    let teacherId;
    if (req.user.role === 'teacher' || req.user.userType === 'teacher') {
      teacherId = req.user.teacherId || req.user._id;
    } else if (req.body.teacherId) {
      teacherId = req.body.teacherId;
    } else {
      // If schedule is provided, use schedule's teacher
      if (scheduleId) {
        const schedule = await CourseSchedule.findById(scheduleId);
        if (schedule) {
          teacherId = schedule.teacherId;
        }
      }
    }

    // If schedule is provided, verify it exists and belongs to the course
    if (scheduleId) {
      const schedule = await CourseSchedule.findById(scheduleId);
      if (!schedule) {
        return sendError(res, 404, 'Schedule not found');
      }

      if (schedule.courseId.toString() !== courseId) {
        return sendError(res, 400, 'Schedule does not belong to the specified course');
      }

      // Verify teacher is assigned to the schedule if teacherId is set
      if (teacherId && schedule.teacherId.toString() !== teacherId.toString()) {
        return sendError(res, 403, 'You are not assigned to this schedule');
      }
    }

    // Check access permissions
    if (req.user.role === 'school_admin' && course.schoolId.toString() !== req.user.schoolId.toString()) {
      return sendError(res, 403, 'Access denied');
    }

    const exam = new Exam({
      schoolId: course.schoolId,
      courseId,
      scheduleId,
      teacherId,
      title,
      description,
      examDate: new Date(examDate),
      examTime,
      duration: duration || 120,
      maxScore: maxScore || 100,
      reportUrl,
      isPublished: isPublished || false
    });

    await exam.save();

    const populatedExam = await Exam.findById(exam._id)
      .populate('courseId', 'name code')
      .populate('scheduleId', 'classroom')
      .populate('teacherId', 'name email');

    return sendResponse(res, 201, { message: 'Exam created successfully', data: populatedExam });
  } catch (error) {
    sendError(res, 500, 'Error creating exam', error);
  }
};

// PUT /api/exams/:id - Update exam
exports.updateExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return sendError(res, 404, 'Exam not found');
    }

    // Check access permissions
    if (req.user.role === 'school_admin' && exam.schoolId.toString() !== req.user.schoolId.toString()) {
      return sendError(res, 403, 'Access denied');
    }
    
    if ((req.user.role === 'teacher' || req.user.userType === 'teacher') && 
        exam.teacherId.toString() !== (req.user.teacherId || req.user._id).toString()) {
      return sendError(res, 403, 'Access denied - you can only update your own exams');
    }

    const {
      title,
      description,
      examDate,
      examTime,
      duration,
      maxScore,
      reportUrl,
      isPublished
    } = req.body;

    if (title) exam.title = title;
    if (description !== undefined) exam.description = description;
    if (examDate) exam.examDate = new Date(examDate);
    if (examTime) exam.examTime = examTime;
    if (duration) exam.duration = duration;
    if (maxScore) exam.maxScore = maxScore;
    if (reportUrl !== undefined) exam.reportUrl = reportUrl;
    if (isPublished !== undefined) exam.isPublished = isPublished;

    await exam.save();

    const populatedExam = await Exam.findById(exam._id)
      .populate('courseId', 'name code')
      .populate('scheduleId', 'classroom')
      .populate('teacherId', 'name email');

    return sendResponse(res, 200, { message: 'Exam updated successfully', data: populatedExam });
  } catch (error) {
    sendError(res, 500, 'Error updating exam', error);
  }
};

// DELETE /api/exams/:id - Delete exam
exports.deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return sendError(res, 404, 'Exam not found');
    }

    // Check access permissions
    if (req.user.role === 'school_admin' && exam.schoolId.toString() !== req.user.schoolId.toString()) {
      return sendError(res, 403, 'Access denied');
    }
    
    if ((req.user.role === 'teacher' || req.user.userType === 'teacher') && 
        exam.teacherId.toString() !== (req.user.teacherId || req.user._id).toString()) {
      return sendError(res, 403, 'Access denied - you can only delete your own exams');
    }

    await Exam.findByIdAndDelete(req.params.id);

    return sendResponse(res, 200, { message: 'Exam deleted successfully' });
  } catch (error) {
    sendError(res, 500, 'Error deleting exam', error);
  }
};

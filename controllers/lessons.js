const Lesson = require('../models/Lesson');
const Course = require('../models/Course');
const CourseSchedule = require('../models/CourseSchedule');
const { sendResponse, sendError } = require('../utils/response');
const { refIdString } = require('../utils/mongoIds');

// GET /api/lessons - Get all lessons with pagination and filters
exports.getAllLessons = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { courseId, scheduleId, teacherId, isPublished } = req.query;

    // Build query based on user role
    const query = {};
    
    // School admin can only see their school's lessons
    if (req.user.role === 'school_admin') {
      query.schoolId = req.user.schoolId;
    }
    
    // Teacher can only see their own lessons (Lesson.teacherId refs Teacher, not TeacherUser)
    if (req.user.role === 'teacher' || req.user.userType === 'teacher') {
      if (!req.user.teacherId) {
        return sendResponse(res, 200, {
          message: 'Lessons retrieved successfully',
          data: [],
          pagination: { page, limit, total: 0 }
        });
      }
      query.teacherId = req.user.teacherId;
      query.schoolId = req.user.schoolId;
    }

    // Add filters
    if (courseId) query.courseId = courseId;
    if (scheduleId) query.scheduleId = scheduleId;
    if (teacherId && (req.user.role === 'school_admin' || req.user.role === 'super_admin')) {
      query.teacherId = teacherId;
    }
    if (isPublished !== undefined) query.isPublished = isPublished === 'true';

    const [lessons, total] = await Promise.all([
      Lesson.find(query)
        .populate('courseId', 'name code')
        .populate('scheduleId', 'classroom')
        .populate('teacherId', 'name email')
        .sort({ lessonDate: -1 })
        .skip(skip)
        .limit(limit),
      Lesson.countDocuments(query)
    ]);

    return sendResponse(res, 200, {
      message: 'Lessons retrieved successfully',
      data: lessons,
      pagination: { page, limit, total }
    });
  } catch (error) {
    sendError(res, 500, 'Error fetching lessons', error);
  }
};

// GET /api/lessons/:id - Get lesson by ID
exports.getLessonById = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id)
      .populate('courseId', 'name code description')
      .populate('scheduleId', 'classroom weeklySessions')
      .populate('teacherId', 'name email phone');

    if (!lesson) {
      return sendError(res, 404, 'Lesson not found');
    }

    // Check access permissions
    if (req.user.role === 'school_admin' && lesson.schoolId.toString() !== req.user.schoolId.toString()) {
      return sendError(res, 403, 'Access denied');
    }
    
    if (req.user.role === 'teacher' || req.user.userType === 'teacher') {
      if (!req.user.teacherId || refIdString(lesson.teacherId) !== refIdString(req.user.teacherId)) {
        return sendError(res, 403, 'Access denied');
      }
    }

    return sendResponse(res, 200, { message: 'Lesson retrieved successfully', data: lesson });
  } catch (error) {
    sendError(res, 500, 'Error fetching lesson', error);
  }
};

// POST /api/lessons - Create new lesson (schedule optional for chapter-style lessons)
exports.createLesson = async (req, res) => {
  try {
    const {
      courseId,
      scheduleId,
      title,
      description,
      lessonDate,
      materials,
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
      teacherId = req.user.teacherId;
      if (!teacherId) {
        return sendError(res, 400, 'Teacher profile is not linked to this account');
      }
    } else if (req.body.teacherId) {
      teacherId = req.body.teacherId;
    } else {
      return sendError(res, 400, 'Teacher ID is required for school/super admin');
    }

    let resolvedScheduleId = null;
    if (scheduleId) {
      const schedule = await CourseSchedule.findById(scheduleId);
      if (!schedule) {
        return sendError(res, 404, 'Schedule not found');
      }
      if (schedule.courseId.toString() !== courseId) {
        return sendError(res, 400, 'Schedule does not belong to the specified course');
      }
      if (schedule.teacherId.toString() !== teacherId.toString()) {
        return sendError(res, 403, 'You are not assigned to this schedule');
      }
      resolvedScheduleId = scheduleId;
    }

    // Check access permissions
    if (req.user.role === 'school_admin' && course.schoolId.toString() !== req.user.schoolId.toString()) {
      return sendError(res, 403, 'Access denied');
    }

    const lesson = new Lesson({
      schoolId: course.schoolId,
      courseId,
      scheduleId: resolvedScheduleId,
      teacherId,
      title,
      description,
      lessonDate: new Date(lessonDate),
      materials: materials || [],
      isPublished: isPublished || false
    });

    await lesson.save();

    const populatedLesson = await Lesson.findById(lesson._id)
      .populate('courseId', 'name code')
      .populate('scheduleId', 'classroom')
      .populate('teacherId', 'name email');

    return sendResponse(res, 201, { message: 'Lesson created successfully', data: populatedLesson });
  } catch (error) {
    sendError(res, 500, 'Error creating lesson', error);
  }
};

// PUT /api/lessons/:id - Update lesson
exports.updateLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
      return sendError(res, 404, 'Lesson not found');
    }

    // Check access permissions
    if (req.user.role === 'school_admin' && lesson.schoolId.toString() !== req.user.schoolId.toString()) {
      return sendError(res, 403, 'Access denied');
    }
    
    if (req.user.role === 'teacher' || req.user.userType === 'teacher') {
      if (!req.user.teacherId || refIdString(lesson.teacherId) !== refIdString(req.user.teacherId)) {
        return sendError(res, 403, 'Access denied - you can only update your own lessons');
      }
    }

    const {
      title,
      description,
      lessonDate,
      materials,
      isPublished
    } = req.body;

    if (title) lesson.title = title;
    if (description !== undefined) lesson.description = description;
    if (lessonDate) lesson.lessonDate = new Date(lessonDate);
    if (materials !== undefined) lesson.materials = materials;
    if (isPublished !== undefined) lesson.isPublished = isPublished;

    await lesson.save();

    const populatedLesson = await Lesson.findById(lesson._id)
      .populate('courseId', 'name code')
      .populate('scheduleId', 'classroom')
      .populate('teacherId', 'name email');

    return sendResponse(res, 200, { message: 'Lesson updated successfully', data: populatedLesson });
  } catch (error) {
    sendError(res, 500, 'Error updating lesson', error);
  }
};

// DELETE /api/lessons/:id - Delete lesson
exports.deleteLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
      return sendError(res, 404, 'Lesson not found');
    }

    // Check access permissions
    if (req.user.role === 'school_admin' && lesson.schoolId.toString() !== req.user.schoolId.toString()) {
      return sendError(res, 403, 'Access denied');
    }
    
    if (req.user.role === 'teacher' || req.user.userType === 'teacher') {
      if (!req.user.teacherId || refIdString(lesson.teacherId) !== refIdString(req.user.teacherId)) {
        return sendError(res, 403, 'Access denied - you can only delete your own lessons');
      }
    }

    await Lesson.findByIdAndDelete(req.params.id);

    return sendResponse(res, 200, { message: 'Lesson deleted successfully' });
  } catch (error) {
    sendError(res, 500, 'Error deleting lesson', error);
  }
};

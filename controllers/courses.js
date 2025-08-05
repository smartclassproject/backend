const Course = require('../models/Course');
const Major = require('../models/Major');
const { 
  successResponse, 
  errorResponse, 
  paginatedResponse, 
  createdResponse, 
  updatedResponse, 
  deletedResponse, 
  notFoundResponse 
} = require('../utils/response');

// GET /api/courses - Get all courses with pagination and search
exports.getAllCourses = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const majorId = req.query.majorId || '';
    const skip = (page - 1) * limit;

    // Build query based on user role
    const query = {};
    
    // School admin can only see their school's courses
    if (req.user.role === 'school_admin') {
      query.schoolId = req.user.schoolId;
    }

    // Add search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    // Add major filter
    if (majorId) {
      query.majorId = majorId;
    }

    // Execute query with pagination
    const [courses, total] = await Promise.all([
      Course.find(query)
        .populate('majorId', 'name code')
        .populate('schedulesCount')
        .populate('attendanceCount')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      Course.countDocuments(query)
    ]);

    return paginatedResponse(res, 'Courses retrieved successfully', courses, page, limit, total);
  } catch (error) {
    next(error);
  }
};

// GET /api/courses/:id - Get course by ID
exports.getCourseById = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('majorId', 'name code description')
      .populate('schedulesCount')
      .populate('attendanceCount');

    if (!course) {
      return notFoundResponse(res, 'Course not found');
    }

    return successResponse(res, 200, 'Course retrieved successfully', course);
  } catch (error) {
    next(error);
  }
};

// POST /api/courses - Create new course
exports.createCourse = async (req, res, next) => {
  try {
    const { name, code, majorId, description, credits } = req.body;

    // Verify major exists and belongs to the school
    const major = await Major.findById(majorId);
    if (!major) {
      return errorResponse(res, 404, 'Major not found');
    }

    if (req.user.role === 'school_admin' && major.schoolId.toString() !== req.user.schoolId.toString()) {
      return errorResponse(res, 403, 'Major does not belong to your school');
    }

    // Check if course with same code already exists in the school
    const existingCourse = await Course.findOne({ 
      schoolId: major.schoolId,
      code: code.toUpperCase()
    });
    if (existingCourse) {
      return errorResponse(res, 409, 'Course with this code already exists in your school');
    }

    const course = new Course({
      schoolId: major.schoolId,
      majorId,
      name,
      code: code.toUpperCase(),
      description,
      credits: credits || 3
    });

    await course.save();

    const populatedCourse = await Course.findById(course._id)
      .populate('majorId', 'name code');

    return createdResponse(res, 'Course created successfully', populatedCourse);
  } catch (error) {
    next(error);
  }
};

// PUT /api/courses/:id - Update course
exports.updateCourse = async (req, res, next) => {
  try {
    const { name, code, majorId, description, credits, isActive } = req.body;
    const courseId = req.params.id;

    const course = await Course.findById(courseId);
    if (!course) {
      return notFoundResponse(res, 'Course not found');
    }

    // Check if code is being changed and conflicts with existing course in the same school
    if (code && code.toUpperCase() !== course.code) {
      const existingCourse = await Course.findOne({ 
        schoolId: course.schoolId,
        code: code.toUpperCase(),
        _id: { $ne: courseId }
      });
      if (existingCourse) {
        return errorResponse(res, 409, 'Course with this code already exists in your school');
      }
    }

    // Verify major exists and belongs to the school if being changed
    if (majorId && majorId !== course.majorId.toString()) {
      const major = await Major.findById(majorId);
      if (!major) {
        return errorResponse(res, 404, 'Major not found');
      }

      if (req.user.role === 'school_admin' && major.schoolId.toString() !== req.user.schoolId.toString()) {
        return errorResponse(res, 403, 'Major does not belong to your school');
      }
    }

    // Update fields
    if (name) course.name = name;
    if (code) course.code = code.toUpperCase();
    if (majorId) course.majorId = majorId;
    if (description !== undefined) course.description = description;
    if (credits) course.credits = credits;
    if (isActive !== undefined) course.isActive = isActive;

    await course.save();

    const updatedCourse = await Course.findById(course._id)
      .populate('majorId', 'name code');

    return updatedResponse(res, 'Course updated successfully', updatedCourse);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/courses/:id - Delete course
exports.deleteCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return notFoundResponse(res, 'Course not found');
    }

    // Check if course has active schedules
    const hasActiveSchedules = await require('../models/CourseSchedule').exists({ 
      courseId: course._id,
      isActive: true,
      endDate: { $gte: new Date() }
    });

    if (hasActiveSchedules) {
      return errorResponse(res, 400, 'Cannot delete course with active schedules. Please deactivate instead.');
    }

    // Check if course has attendance records
    const hasAttendance = await require('../models/Attendance').exists({ courseId: course._id });
    if (hasAttendance) {
      return errorResponse(res, 400, 'Cannot delete course with attendance records. Please deactivate instead.');
    }

    await Course.findByIdAndDelete(req.params.id);

    return deletedResponse(res, 'Course deleted successfully');
  } catch (error) {
    next(error);
  }
}; 
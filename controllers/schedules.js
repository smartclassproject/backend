const CourseSchedule = require('../models/CourseSchedule');
const Course = require('../models/Course');
const Teacher = require('../models/Teacher');
const moment = require('moment');
const { 
  successResponse, 
  errorResponse, 
  paginatedResponse, 
  createdResponse, 
  updatedResponse, 
  deletedResponse, 
  notFoundResponse 
} = require('../utils/response');

// GET /api/schedules - Get all schedules with pagination and filters
exports.getAllSchedules = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const courseId = req.query.courseId || '';
    const teacherId = req.query.teacherId || '';
    const classroom = req.query.classroom || '';
    const status = req.query.status || '';
    const skip = (page - 1) * limit;

    // Build query based on user role
    const query = {};
    
    // School admin can only see their school's schedules
    if (req.user.role === 'school_admin') {
      query.schoolId = req.user.schoolId;
    }

    // Add filters
    if (courseId) query.courseId = courseId;
    if (teacherId) query.teacherId = teacherId;
    if (classroom) query.classroom = { $regex: classroom, $options: 'i' };
    if (status) query.isActive = status === 'active';

    // Execute query with pagination
    const [schedules, total] = await Promise.all([
      CourseSchedule.find(query)
        .populate('courseId', 'name code')
        .populate('teacherId', 'name email')
        .populate('attendanceCount')
        .sort({ startDate: 1 })
        .skip(skip)
        .limit(limit),
      CourseSchedule.countDocuments(query)
    ]);

    return paginatedResponse(res, 'Schedules retrieved successfully', schedules, page, limit, total);
  } catch (error) {
    next(error);
  }
};

// GET /api/schedules/calendar - Get schedules for calendar view
exports.getCalendarSchedules = async (req, res, next) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : moment().startOf('week').toDate();
    const endDate = req.query.endDate ? new Date(req.query.endDate) : moment().endOf('week').toDate();

    // Build query based on user role
    const query = {
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
      isActive: true
    };
    
    // School admin can only see their school's schedules
    if (req.user.role === 'school_admin') {
      query.schoolId = req.user.schoolId;
    }

    const schedules = await CourseSchedule.find(query)
      .populate('courseId', 'name code')
      .populate('teacherId', 'name');

    // Transform schedules for calendar view
    const calendarEvents = [];
    schedules.forEach(schedule => {
      schedule.weeklySessions.forEach(session => {
        const dayIndex = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(session.day);
        
        // Generate events for each week in the date range
        let currentDate = moment(startDate).day(dayIndex);
        if (currentDate.isBefore(moment(startDate))) {
          currentDate.add(1, 'week');
        }

        while (currentDate.isSameOrBefore(moment(endDate))) {
          if (currentDate.isBetween(moment(schedule.startDate), moment(schedule.endDate), 'day', '[]')) {
            calendarEvents.push({
              id: schedule._id,
              title: `${schedule.courseId.name} - ${schedule.classroom}`,
              start: currentDate.format('YYYY-MM-DD') + 'T' + session.startTime + ':00',
              end: currentDate.format('YYYY-MM-DD') + 'T' + session.endTime + ':00',
              course: schedule.courseId.name,
              teacher: schedule.teacherId.name,
              classroom: schedule.classroom,
              scheduleId: schedule._id
            });
          }
          currentDate.add(1, 'week');
        }
      });
    });

    return successResponse(res, 200, 'Calendar schedules retrieved successfully', calendarEvents);
  } catch (error) {
    next(error);
  }
};

// GET /api/schedules/:id - Get schedule by ID
exports.getScheduleById = async (req, res, next) => {
  try {
    const schedule = await CourseSchedule.findById(req.params.id)
      .populate('courseId', 'name code description')
      .populate('teacherId', 'name email phone')
      .populate('attendanceCount');

    if (!schedule) {
      return notFoundResponse(res, 'Schedule not found');
    }

    return successResponse(res, 200, 'Schedule retrieved successfully', schedule);
  } catch (error) {
    next(error);
  }
};

// POST /api/schedules - Create new schedule
exports.createSchedule = async (req, res, next) => {
  try {
    const {
      courseId,
      classroom,
      teacherId,
      startDate,
      endDate,
      weeklySessions,
      maxStudents
    } = req.body;

    // Verify course exists and belongs to the school
    const course = await Course.findById(courseId);
    if (!course) {
      return errorResponse(res, 404, 'Course not found');
    }

    if (req.user.role === 'school_admin' && course.schoolId.toString() !== req.user.schoolId.toString()) {
      return errorResponse(res, 403, 'Course does not belong to your school');
    }

    // Verify teacher exists and belongs to the school
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return errorResponse(res, 404, 'Teacher not found');
    }

    if (req.user.role === 'school_admin' && teacher.schoolId.toString() !== req.user.schoolId.toString()) {
      return errorResponse(res, 403, 'Teacher does not belong to your school');
    }

    // Check for time conflicts
    const newSchedule = new CourseSchedule({
      courseId,
      schoolId: course.schoolId,
      classroom,
      teacherId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      weeklySessions,
      maxStudents: maxStudents || 30
    });

    const conflicts = await checkScheduleConflicts(newSchedule);
    if (conflicts.length > 0) {
      return errorResponse(res, 409, 'Schedule conflicts detected', { conflicts });
    }

    await newSchedule.save();

    const populatedSchedule = await CourseSchedule.findById(newSchedule._id)
      .populate('courseId', 'name code')
      .populate('teacherId', 'name');

    return createdResponse(res, 'Schedule created successfully', populatedSchedule);
  } catch (error) {
    next(error);
  }
};

// PUT /api/schedules/:id - Update schedule
exports.updateSchedule = async (req, res, next) => {
  try {
    const {
      classroom,
      teacherId,
      startDate,
      endDate,
      weeklySessions,
      maxStudents,
      isActive
    } = req.body;
    const scheduleId = req.params.id;

    const schedule = await CourseSchedule.findById(scheduleId);
    if (!schedule) {
      return notFoundResponse(res, 'Schedule not found');
    }

    // Verify teacher exists and belongs to the school if being changed
    if (teacherId && teacherId !== schedule.teacherId.toString()) {
      const teacher = await Teacher.findById(teacherId);
      if (!teacher) {
        return errorResponse(res, 404, 'Teacher not found');
      }

      if (req.user.role === 'school_admin' && teacher.schoolId.toString() !== req.user.schoolId.toString()) {
        return errorResponse(res, 403, 'Teacher does not belong to your school');
      }
    }

    // Check for time conflicts if schedule details are being changed
    if (classroom || teacherId || startDate || endDate || weeklySessions) {
      const updatedSchedule = {
        ...schedule.toObject(),
        classroom: classroom || schedule.classroom,
        teacherId: teacherId || schedule.teacherId,
        startDate: startDate ? new Date(startDate) : schedule.startDate,
        endDate: endDate ? new Date(endDate) : schedule.endDate,
        weeklySessions: weeklySessions || schedule.weeklySessions
      };

      const conflicts = await checkScheduleConflicts(updatedSchedule, scheduleId);
      if (conflicts.length > 0) {
        return errorResponse(res, 409, 'Schedule conflicts detected', { conflicts });
      }
    }

    // Update fields
    if (classroom) schedule.classroom = classroom;
    if (teacherId) schedule.teacherId = teacherId;
    if (startDate) schedule.startDate = new Date(startDate);
    if (endDate) schedule.endDate = new Date(endDate);
    if (weeklySessions) schedule.weeklySessions = weeklySessions;
    if (maxStudents) schedule.maxStudents = maxStudents;
    if (isActive !== undefined) schedule.isActive = isActive;

    await schedule.save();

    const updatedSchedule = await CourseSchedule.findById(schedule._id)
      .populate('courseId', 'name code')
      .populate('teacherId', 'name');

    return updatedResponse(res, 'Schedule updated successfully', updatedSchedule);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/schedules/:id - Delete schedule
exports.deleteSchedule = async (req, res, next) => {
  try {
    const schedule = await CourseSchedule.findById(req.params.id);
    
    if (!schedule) {
      return notFoundResponse(res, 'Schedule not found');
    }

    // Check if schedule has attendance records
    const hasAttendance = await require('../models/Attendance').exists({ scheduleId: schedule._id });
    if (hasAttendance) {
      return errorResponse(res, 400, 'Cannot delete schedule with attendance records. Please deactivate instead.');
    }

    await CourseSchedule.findByIdAndDelete(req.params.id);

    return deletedResponse(res, 'Schedule deleted successfully');
  } catch (error) {
    next(error);
  }
};

// POST /api/schedules/check-conflicts - Check for schedule conflicts
exports.checkConflicts = async (req, res, next) => {
  try {
    const { courseId, teacherId, classroom, startDate, endDate, weeklySessions, excludeScheduleId } = req.body;

    const testSchedule = {
      courseId,
      teacherId,
      classroom,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      weeklySessions
    };

    const conflicts = await checkScheduleConflicts(testSchedule, excludeScheduleId);

    return successResponse(res, 200, 'Conflict check completed', { conflicts });
  } catch (error) {
    next(error);
  }
};

// Helper function to check for schedule conflicts
async function checkScheduleConflicts(newSchedule, excludeScheduleId = null) {
  const conflicts = [];

  // Find overlapping schedules
  const overlappingSchedules = await CourseSchedule.find({
    schoolId: newSchedule.schoolId,
    startDate: { $lte: newSchedule.endDate },
    endDate: { $gte: newSchedule.startDate },
    isActive: true,
    ...(excludeScheduleId && { _id: { $ne: excludeScheduleId } })
  }).populate('courseId', 'name').populate('teacherId', 'name');

  overlappingSchedules.forEach(existingSchedule => {
    // Check for classroom conflicts
    if (existingSchedule.classroom === newSchedule.classroom) {
      const hasTimeConflict = checkTimeOverlap(existingSchedule.weeklySessions, newSchedule.weeklySessions);
      if (hasTimeConflict) {
        conflicts.push({
          type: 'classroom',
          message: `Classroom conflict with ${existingSchedule.courseId.name}`,
          schedule: existingSchedule
        });
      }
    }

    // Check for teacher conflicts
    if (existingSchedule.teacherId.toString() === newSchedule.teacherId.toString()) {
      const hasTimeConflict = checkTimeOverlap(existingSchedule.weeklySessions, newSchedule.weeklySessions);
      if (hasTimeConflict) {
        conflicts.push({
          type: 'teacher',
          message: `Teacher conflict with ${existingSchedule.courseId.name}`,
          schedule: existingSchedule
        });
      }
    }
  });

  return conflicts;
}

// Helper function to check time overlap between weekly sessions
function checkTimeOverlap(sessions1, sessions2) {
  for (const session1 of sessions1) {
    for (const session2 of sessions2) {
      if (session1.day === session2.day) {
        const start1 = moment(session1.startTime, 'HH:mm');
        const end1 = moment(session1.endTime, 'HH:mm');
        const start2 = moment(session2.startTime, 'HH:mm');
        const end2 = moment(session2.endTime, 'HH:mm');

        if (start1.isBefore(end2) && end1.isAfter(start2)) {
          return true;
        }
      }
    }
  }
  return false;
} 
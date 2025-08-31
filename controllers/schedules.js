const CourseSchedule = require('../models/CourseSchedule');
const Course = require('../models/Course');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const moment = require('moment');
const { sendResponse, sendError, isValidObjectId } = require('../utils/response');

// GET /api/schedules - Get all schedules with pagination and filters
exports.getAllSchedules = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const courseId = req.query.courseId || '';
    const teacherId = req.query.teacherId || '';
    const classroom = req.query.classroom || '';
    const status = req.query.status || '';
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    
    // Validate date formats
    if (req.query.startDate && isNaN(startDate.getTime())) {
      return sendError(res, 400, 'Invalid startDate format. Use YYYY-MM-DD');
    }
    if (req.query.endDate && isNaN(endDate.getTime())) {
      return sendError(res, 400, 'Invalid endDate format. Use YYYY-MM-DD');
    }
    
    // Validate date range
    if (startDate && endDate && startDate > endDate) {
      return sendError(res, 400, 'startDate cannot be after endDate');
    }
    
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
    
    // Add date filters
    if (startDate || endDate) {
      query.$and = [];
      
      if (startDate) {
        query.$and.push({ endDate: { $gte: startDate } });
      }
      
      if (endDate) {
        query.$and.push({ startDate: { $lte: endDate } });
      }
      
      // If both dates are provided, ensure schedules overlap with the date range
      if (startDate && endDate) {
        query.$and.push({
          $or: [
            // Schedule starts within the range
            { startDate: { $gte: startDate, $lte: endDate } },
            // Schedule ends within the range
            { endDate: { $gte: startDate, $lte: endDate } },
            // Schedule spans the entire range
            { startDate: { $lte: startDate }, endDate: { $gte: endDate } }
          ]
        });
      }
    }

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

    // Build filter summary for response
    const filterSummary = [];
    if (courseId) filterSummary.push(`course: ${courseId}`);
    if (teacherId) filterSummary.push(`teacher: ${teacherId}`);
    if (classroom) filterSummary.push(`classroom: ${classroom}`);
    if (status) filterSummary.push(`status: ${status}`);
    if (startDate) filterSummary.push(`from: ${startDate.toISOString().split('T')[0]}`);
    if (endDate) filterSummary.push(`to: ${endDate.toISOString().split('T')[0]}`);
    
    const message = filterSummary.length > 0 
      ? `Schedules retrieved successfully with filters: ${filterSummary.join(', ')}`
      : 'Schedules retrieved successfully';
    
    return sendResponse(res, 200, { 
      message, 
      data: schedules, 
      pagination: { page, limit, total },
      filters: {
        courseId,
        teacherId,
        classroom,
        status,
        startDate: startDate ? startDate.toISOString().split('T')[0] : null,
        endDate: endDate ? endDate.toISOString().split('T')[0] : null
      }
    });
  } catch (error) {
    sendError(res, 500, 'Error fetching schedules', error);
  }
};

// GET /api/schedules/calendar - Get schedules for calendar view
exports.getCalendarSchedules = async (req, res) => {
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

    return sendResponse(res, 200, { message: 'Calendar schedules retrieved successfully', data: calendarEvents });
  } catch (error) {
    sendError(res, 500, 'Error fetching calendar schedules', error);
  }
};

// GET /api/schedules/:id - Get schedule by ID
exports.getScheduleById = async (req, res) => {
  try {
    const schedule = await CourseSchedule.findById(req.params.id)
      .populate('courseId', 'name code description')
      .populate('teacherId', 'name email phone')
      .populate('attendanceCount');

    if (!schedule) {
      return sendError(res, 404, 'Schedule not found');
    }

    return sendResponse(res, 200, { message: 'Schedule retrieved successfully', data: schedule });
  } catch (error) {
    sendError(res, 500, 'Error fetching schedule', error);
  }
};

// POST /api/schedules - Create new schedule
exports.createSchedule = async (req, res) => {
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
      return sendError(res, 404, 'Course not found');
    }

    if (req.user.role === 'school_admin' && course.schoolId.toString() !== req.user.schoolId.toString()) {
      return sendError(res, 403, 'Course does not belong to your school');
    }

    // Verify teacher exists and belongs to the school
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return sendError(res, 404, 'Teacher not found');
    }

    if (req.user.role === 'school_admin' && teacher.schoolId.toString() !== req.user.schoolId.toString()) {
      return sendError(res, 403, 'Teacher does not belong to your school');
    }

    // Calculate maxStudents automatically based on the number of students in the major
    let calculatedMaxStudents = maxStudents;
    if (!calculatedMaxStudents) {
      try {
        // Count students enrolled in the major that this course belongs to
        const studentCount = await Student.countDocuments({
          majorId: course.majorId,
          schoolId: course.schoolId,
          isActive: true
        });
        
        // Set a reasonable limit: either the actual student count or a minimum of 20
        calculatedMaxStudents = Math.max(studentCount, 20);
        
        // Add a buffer for potential new enrollments (20% more)
        calculatedMaxStudents = Math.ceil(calculatedMaxStudents * 1.2);
        
        console.log(`Auto-calculated maxStudents: ${calculatedMaxStudents} (based on ${studentCount} students in major ${course.majorId})`);
      } catch (error) {
        console.log('Error calculating maxStudents, using default value:', error.message);
        calculatedMaxStudents = 30; // Fallback to default
      }
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
      maxStudents: calculatedMaxStudents
    });

    const conflicts = await checkScheduleConflicts(newSchedule);
    if (conflicts.length > 0) {
      return sendError(res, 409, 'Schedule conflicts detected', { conflicts });
    }

    await newSchedule.save();

    const populatedSchedule = await CourseSchedule.findById(newSchedule._id)
      .populate('courseId', 'name code')
      .populate('teacherId', 'name');

    return sendResponse(res, 201, { message: 'Schedule created successfully', data: populatedSchedule });
  } catch (error) {
    sendError(res, 500, 'Error creating schedule', error);
  }
};

// PUT /api/schedules/:id - Update schedule
exports.updateSchedule = async (req, res) => {
  try {
    const {
      courseId,
      classroom,
      teacherId,
      startDate,
      endDate,
      weeklySessions,
      maxStudents,
      isActive
    } = req.body;
    const scheduleId = req.params.id;

    // check if scheduleId is valid
    if (!isValidObjectId(scheduleId)) {
      return sendError(res, 400, 'Invalid schedule ID');
    }

    const schedule = await CourseSchedule.findById(scheduleId);
    if (!schedule) {
      return sendError(res, 404, 'Schedule not found');
    }

    // Verify teacher exists and belongs to the school if being changed
    if (teacherId && teacherId !== schedule.teacherId.toString()) {
      const teacher = await Teacher.findById(teacherId);
      if (!teacher) {
        return sendError(res, 404, 'Teacher not found');
      }

      if (req.user.role === 'school_admin' && teacher.schoolId.toString() !== req.user.schoolId.toString()) {
        return sendError(res, 403, 'Teacher does not belong to your school');
      }
    }

    // Check for time conflicts if schedule details are being changed
    if (courseId || classroom || teacherId || startDate || endDate || weeklySessions) {
      const updatedSchedule = {
        ...schedule.toObject(),
        courseId: courseId || schedule.courseId,
        classroom: classroom || schedule.classroom,
        teacherId: teacherId || schedule.teacherId,
        startDate: startDate ? new Date(startDate) : schedule.startDate,
        endDate: endDate ? new Date(endDate) : schedule.endDate,
        weeklySessions: weeklySessions || schedule.weeklySessions
      };

      const conflicts = await checkScheduleConflicts(updatedSchedule, scheduleId);
      if (conflicts.length > 0) {
        return sendError(res, 409, 'Schedule conflicts detected', { conflicts });
      }
    }

    // Update fields
    if (courseId) schedule.courseId = courseId;
    if (classroom) schedule.classroom = classroom;
    if (teacherId) schedule.teacherId = teacherId;
    if (startDate) schedule.startDate = new Date(startDate);
    if (endDate) schedule.endDate = new Date(endDate);
    if (weeklySessions) schedule.weeklySessions = weeklySessions;
    if (isActive !== undefined) schedule.isActive = isActive;
    
    // Handle maxStudents update intelligently
    if (maxStudents !== undefined) {
      if (maxStudents === 'auto') {
        // Recalculate maxStudents automatically
        try {
          // Use the updated courseId if it was changed, otherwise use the existing one
          const courseToUse = courseId ? await Course.findById(courseId) : await Course.findById(schedule.courseId);
          if (courseToUse) {
            const studentCount = await Student.countDocuments({
              majorId: courseToUse.majorId,
              schoolId: courseToUse.schoolId,
              isActive: true
            });
            
            const calculatedMaxStudents = Math.max(studentCount, 20);
            const bufferedMaxStudents = Math.ceil(calculatedMaxStudents * 1.2);
            
            schedule.maxStudents = bufferedMaxStudents;
            console.log(`Auto-recalculated maxStudents: ${bufferedMaxStudents} (based on ${studentCount} students in major ${courseToUse.majorId})`);
          }
        } catch (error) {
          console.log('Error recalculating maxStudents:', error.message);
          // Keep existing value if recalculation fails
        }
      } else {
        // Use the provided value
        schedule.maxStudents = maxStudents;
      }
    }

    await schedule.save();

    const updatedSchedule = await CourseSchedule.findById(schedule._id)
      .populate('courseId', 'name code')
      .populate('teacherId', 'name');

    return sendResponse(res, 200, { message: 'Schedule updated successfully', data: updatedSchedule });
  } catch (error) {
    sendError(res, 500, 'Error updating schedule', error);
  }
};

// DELETE /api/schedules/:id - Delete schedule
exports.deleteSchedule = async (req, res) => {
  try {
    const schedule = await CourseSchedule.findById(req.params.id);
    
    if (!schedule) {
      return sendError(res, 404, 'Schedule not found');
    }

    // Check if schedule has attendance records
    const hasAttendance = await require('../models/Attendance').exists({ scheduleId: schedule._id });
    if (hasAttendance) {
      return sendError(res, 400, 'Cannot delete schedule with attendance records. Please deactivate instead.');
    }

    await CourseSchedule.findByIdAndDelete(req.params.id);

    return sendResponse(res, 200, { message: 'Schedule deleted successfully' });
  } catch (error) {
    sendError(res, 500, 'Error deleting schedule', error);
  }
};

// POST /api/schedules/check-conflicts - Check for schedule conflicts
exports.checkConflicts = async (req, res) => {
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

    return sendResponse(res, 200, { message: 'Conflict check completed', data: { conflicts } });
  } catch (error) {
    sendError(res, 500, 'Error checking schedule conflicts', error);
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
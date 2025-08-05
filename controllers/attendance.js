const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Device = require('../models/Device');
const Course = require('../models/Course');
const CourseSchedule = require('../models/CourseSchedule');
const { sendResponse, sendError } = require('../utils/response');

/**
 * Get all attendance records with pagination and filtering
 */
const getAllAttendance = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      schoolId = '',
      majorId = '',
      courseId = '',
      startDate = '',
      endDate = '',
      status = ''
    } = req.query;

    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = {};
    
    if (schoolId) {
      filter.schoolId = schoolId;
    } else if (req.user.role === 'school_admin') {
      // School admins can only see attendance from their school
      filter.schoolId = req.user.schoolId;
    }
    
    if (majorId) {
      filter.majorId = majorId;
    }
    
    if (courseId) {
      filter.courseId = courseId;
    }
    
    if (status) {
      filter.status = status;
    }
    
    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Get total count
    const total = await Attendance.countDocuments(filter);
    
    // Get attendance records with pagination
    let attendanceQuery = Attendance.find(filter)
      .populate('studentId', 'firstName lastName studentId majorId')
      .populate('courseId', 'name code')
      .populate('scheduleId', 'classroom weeklySessions')
      .populate('deviceId', 'name location')
      .populate('majorId', 'name')
      .sort({ date: -1, checkInTime: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Add search functionality
    if (search) {
      attendanceQuery = Attendance.find({
        ...filter,
        $or: [
          { 'studentId.firstName': { $regex: search, $options: 'i' } },
          { 'studentId.lastName': { $regex: search, $options: 'i' } },
          { 'studentId.studentId': { $regex: search, $options: 'i' } },
          { 'courseId.name': { $regex: search, $options: 'i' } }
        ]
      })
      .populate('studentId', 'firstName lastName studentId majorId')
      .populate('courseId', 'name code')
      .populate('scheduleId', 'classroom weeklySessions')
      .populate('deviceId', 'name location')
      .populate('majorId', 'name')
      .sort({ date: -1, checkInTime: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    }

    const attendance = await attendanceQuery;
    const pages = Math.ceil(total / limit);

    return sendResponse(res, 200, {
      data: attendance,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages
      }
    });
  } catch (error) {
    sendError(res, 500, 'Error fetching attendance records', error);
  }
};

/**
 * Get attendance record by ID
 */
const getAttendanceById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const attendance = await Attendance.findById(id)
      .populate('studentId', 'firstName lastName studentId majorId')
      .populate('courseId', 'name code')
      .populate('scheduleId', 'classroom weeklySessions')
      .populate('deviceId', 'name location')
      .populate('majorId', 'name');

    if (!attendance) {
      return sendError(res, 404, 'Attendance record not found');
    }

    // Check if user has permission to view this attendance
    if (req.user.role === 'school_admin' && req.user.schoolId.toString() !== attendance.schoolId.toString()) {
      return sendError(res, 403, 'Access denied');
    }

    sendResponse(res, 200, { data: attendance });
  } catch (error) {
    sendError(res, 500, 'Error fetching attendance record', error);
  }
};

/**
 * Create new attendance record
 */
const createAttendance = async (req, res) => {
  try {
    const {
      studentId,
      courseId,
      scheduleId,
      deviceId,
      date,
      checkInTime,
      checkOutTime,
      status,
      notes
    } = req.body;

    // Verify student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return sendError(res, 400, 'Student not found');
    }

    // Verify course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return sendError(res, 400, 'Course not found');
    }

    // Verify device exists
    const device = await Device.findById(deviceId);
    if (!device) {
      return sendError(res, 400, 'Device not found');
    }

    // Check if user has permission to create attendance for this school
    if (req.user.role === 'school_admin' && req.user.schoolId.toString() !== student.schoolId.toString()) {
      return sendError(res, 403, 'Access denied');
    }

    // Check if attendance already exists for this student on this date
    const existingAttendance = await Attendance.findOne({
      studentId,
      date: new Date(date)
    });

    if (existingAttendance) {
      return sendError(res, 400, 'Attendance record already exists for this student on this date');
    }

    // Create attendance record
    const attendance = new Attendance({
      studentId,
      courseId,
      scheduleId,
      deviceId,
      schoolId: student.schoolId,
      majorId: student.majorId,
      date: new Date(date),
      checkInTime: checkInTime ? new Date(checkInTime) : new Date(),
      checkOutTime: checkOutTime ? new Date(checkOutTime) : null,
      status: status || 'present',
      notes
    });

    await attendance.save();

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('studentId', 'firstName lastName studentId majorId')
      .populate('courseId', 'name code')
      .populate('scheduleId', 'classroom weeklySessions')
      .populate('deviceId', 'name location')
      .populate('majorId', 'name');

    sendResponse(res, 201, { 
      data: populatedAttendance,
      message: 'Attendance record created successfully'
    });
  } catch (error) {
    sendError(res, 500, 'Error creating attendance record', error);
  }
};

/**
 * Update attendance record
 */
const updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return sendError(res, 404, 'Attendance record not found');
    }

    // Check if user has permission to update this attendance
    if (req.user.role === 'school_admin' && req.user.schoolId.toString() !== attendance.schoolId.toString()) {
      return sendError(res, 403, 'Access denied');
    }

    // Update attendance
    const updatedAttendance = await Attendance.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('studentId', 'firstName lastName studentId majorId')
    .populate('courseId', 'name code')
    .populate('scheduleId', 'classroom weeklySessions')
    .populate('deviceId', 'name location')
    .populate('majorId', 'name');

    sendResponse(res, 200, { 
      data: updatedAttendance,
      message: 'Attendance record updated successfully'
    });
  } catch (error) {
    sendError(res, 500, 'Error updating attendance record', error);
  }
};

/**
 * Delete attendance record
 */
const deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;

    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return sendError(res, 404, 'Attendance record not found');
    }

    // Check if user has permission to delete this attendance
    if (req.user.role === 'school_admin' && req.user.schoolId.toString() !== attendance.schoolId.toString()) {
      return sendError(res, 403, 'Access denied');
    }

    await Attendance.findByIdAndDelete(id);

    sendResponse(res, 200, { 
      message: 'Attendance record deleted successfully'
    });
  } catch (error) {
    sendError(res, 500, 'Error deleting attendance record', error);
  }
};

/**
 * Process RFID check-in
 */
const processCheckIn = async (req, res) => {
  try {
    const { deviceId, cardId, courseId } = req.body;

    if (!deviceId || !cardId) {
      return sendError(res, 400, 'Device ID and Card ID are required');
    }

    // Find device
    const device = await Device.findById(deviceId);
    if (!device) {
      return sendError(res, 404, 'Device not found');
    }

    if (!device.isActive) {
      return sendError(res, 400, 'Device is not active');
    }

    // Find student by card ID
    const student = await Student.findOne({ 
      rfidCardId: cardId,
      schoolId: device.schoolId,
      isActive: true
    });

    if (!student) {
      return sendError(res, 400, 'Invalid card or student not found');
    }

    // Check if student is already checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await Attendance.findOne({
      studentId: student._id,
      date: {
        $gte: today,
        $lt: tomorrow
      }
    });

    if (existingAttendance) {
      return sendError(res, 400, 'Student already checked in today');
    }

    // Find current course schedule if courseId is provided
    let scheduleId = null;
    if (courseId) {
      const schedule = await CourseSchedule.findOne({
        courseId,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() }
      });
      if (schedule) {
        scheduleId = schedule._id;
      }
    }

    // Create attendance record
    const attendance = new Attendance({
      studentId: student._id,
      courseId: courseId || null,
      scheduleId,
      deviceId: device._id,
      schoolId: device.schoolId,
      majorId: student.majorId,
      date: new Date(),
      checkInTime: new Date(),
      status: 'present'
    });

    await attendance.save();

    // Update device last seen
    device.lastSeen = new Date();
    await device.save();

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('studentId', 'firstName lastName studentId majorId')
      .populate('courseId', 'name code')
      .populate('scheduleId', 'classroom weeklySessions')
      .populate('deviceId', 'name location')
      .populate('majorId', 'name');

    sendResponse(res, 200, { 
      data: populatedAttendance,
      message: 'Check-in successful'
    });
  } catch (error) {
    sendError(res, 500, 'Error processing check-in', error);
  }
};

/**
 * Get attendance statistics
 */
const getAttendanceStats = async (req, res) => {
  try {
    const { 
      schoolId, 
      majorId, 
      courseId, 
      startDate, 
      endDate 
    } = req.query;

    // Build filter
    const filter = {};
    if (schoolId) {
      filter.schoolId = schoolId;
    } else if (req.user.role === 'school_admin') {
      filter.schoolId = req.user.schoolId;
    }
    
    if (majorId) {
      filter.majorId = majorId;
    }
    
    if (courseId) {
      filter.courseId = courseId;
    }
    
    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Get attendance data
    const attendanceData = await Attendance.find(filter)
      .populate('studentId', 'firstName lastName studentId')
      .populate('majorId', 'name');

    // Calculate statistics
    const totalRecords = attendanceData.length;
    const presentCount = attendanceData.filter(record => record.status === 'present').length;
    const absentCount = attendanceData.filter(record => record.status === 'absent').length;
    const lateCount = attendanceData.filter(record => record.status === 'late').length;
    
    const attendanceRate = totalRecords > 0 ? (presentCount / totalRecords) * 100 : 0;

    // Group by major
    const attendanceByMajor = {};
    attendanceData.forEach(record => {
      const majorName = record.majorId?.name || 'Unknown';
      if (!attendanceByMajor[majorName]) {
        attendanceByMajor[majorName] = {
          total: 0,
          present: 0,
          absent: 0,
          late: 0
        };
      }
      attendanceByMajor[majorName].total++;
      attendanceByMajor[majorName][record.status]++;
    });

    // Convert to array and calculate rates
    const majorStats = Object.entries(attendanceByMajor).map(([major, stats]) => ({
      major,
      ...stats,
      rate: stats.total > 0 ? Math.round((stats.present / stats.total) * 10000) / 100 : 0
    }));

    sendResponse(res, 200, {
      data: {
        summary: {
          totalRecords,
          presentCount,
          absentCount,
          lateCount,
          attendanceRate: Math.round(attendanceRate * 100) / 100
        },
        byMajor: majorStats
      }
    });
  } catch (error) {
    sendError(res, 500, 'Error fetching attendance statistics', error);
  }
};

/**
 * Generate attendance report
 */
const generateReport = async (req, res) => {
  try {
    const { 
      schoolId, 
      majorId, 
      courseId, 
      startDate, 
      endDate, 
      format = 'json' 
    } = req.query;

    // Build filter
    const filter = {};
    if (schoolId) {
      filter.schoolId = schoolId;
    } else if (req.user.role === 'school_admin') {
      filter.schoolId = req.user.schoolId;
    }
    
    if (majorId) {
      filter.majorId = majorId;
    }
    
    if (courseId) {
      filter.courseId = courseId;
    }
    
    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Get attendance data
    const attendanceData = await Attendance.find(filter)
      .populate('studentId', 'firstName lastName studentId')
      .populate('courseId', 'name code')
      .populate('majorId', 'name')
      .populate('deviceId', 'name location')
      .sort({ date: -1 });

    // Calculate summary
    const totalRecords = attendanceData.length;
    const presentCount = attendanceData.filter(record => record.status === 'present').length;
    const absentCount = attendanceData.filter(record => record.status === 'absent').length;
    const lateCount = attendanceData.filter(record => record.status === 'late').length;
    const attendanceRate = totalRecords > 0 ? (presentCount / totalRecords) * 100 : 0;

    // Format report data
    const reportData = attendanceData.map(record => ({
      date: record.date.toISOString().split('T')[0],
      studentName: `${record.studentId.firstName} ${record.studentId.lastName}`,
      studentId: record.studentId.studentId,
      course: record.courseId?.name || 'N/A',
      courseCode: record.courseId?.code || 'N/A',
      major: record.majorId?.name || 'N/A',
      device: record.deviceId?.name || 'N/A',
      location: record.deviceId?.location || 'N/A',
      checkInTime: record.checkInTime,
      checkOutTime: record.checkOutTime,
      status: record.status,
      notes: record.notes
    }));

    const summary = {
      totalRecords,
      presentCount,
      absentCount,
      lateCount,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      dateRange: {
        start: startDate || 'All time',
        end: endDate || 'All time'
      }
    };

    sendResponse(res, 200, {
      data: {
        summary,
        records: reportData
      }
    });
  } catch (error) {
    sendError(res, 500, 'Error generating attendance report', error);
  }
};

/**
 * Bulk update attendance
 */
const bulkUpdateAttendance = async (req, res) => {
  try {
    const { attendanceRecords } = req.body;

    if (!Array.isArray(attendanceRecords) || attendanceRecords.length === 0) {
      return sendError(res, 400, 'Attendance records array is required');
    }

    const results = [];
    const errors = [];

    for (const record of attendanceRecords) {
      try {
        const { id, status, notes } = record;

        const attendance = await Attendance.findById(id);
        if (!attendance) {
          errors.push({ id, error: 'Attendance record not found' });
          continue;
        }

        // Check permissions
        if (req.user.role === 'school_admin' && req.user.schoolId.toString() !== attendance.schoolId.toString()) {
          errors.push({ id, error: 'Access denied' });
          continue;
        }

        // Update attendance
        const updatedAttendance = await Attendance.findByIdAndUpdate(
          id,
          { status, notes },
          { new: true }
        );

        results.push(updatedAttendance);
      } catch (error) {
        errors.push({ id: record.id, error: error.message });
      }
    }

    sendResponse(res, 200, {
      data: {
        updated: results.length,
        errors: errors.length,
        results,
        errors
      },
      message: `Bulk update completed. ${results.length} records updated, ${errors.length} errors.`
    });
  } catch (error) {
    sendError(res, 500, 'Error performing bulk update', error);
  }
};

module.exports = {
  getAllAttendance,
  getAttendanceById,
  createAttendance,
  updateAttendance,
  deleteAttendance,
  processCheckIn,
  getAttendanceStats,
  generateReport,
  bulkUpdateAttendance
}; 
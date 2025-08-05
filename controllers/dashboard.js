const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Course = require('../models/Course');
const Device = require('../models/Device');
const Attendance = require('../models/Attendance');
const Major = require('../models/Major');
const { sendResponse, sendError } = require('../utils/response');

/**
 * Get dashboard overview statistics
 */
const getOverview = async (req, res) => {
  try {
    const { schoolId, dateRange = 'today' } = req.query;
    
    // Determine target school
    let targetSchoolId = schoolId;
    if (req.user.role === 'school_admin') {
      targetSchoolId = req.user.schoolId;
    }

    // Build school filter
    const schoolFilter = targetSchoolId ? { schoolId: targetSchoolId } : {};

    // Calculate date range
    const now = new Date();
    let startDate, endDate;
    
    switch (dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        endDate = now;
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        endDate = now;
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        endDate = now;
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    }

    // Get counts
    const [
      totalStudents,
      totalTeachers,
      totalCourses,
      totalDevices,
      activeDevices,
      todayAttendance
    ] = await Promise.all([
      Student.countDocuments(schoolFilter),
      Teacher.countDocuments(schoolFilter),
      Course.countDocuments(schoolFilter),
      Device.countDocuments(schoolFilter),
      Device.countDocuments({ ...schoolFilter, isActive: true }),
      Attendance.countDocuments({
        ...schoolFilter,
        date: { $gte: startDate, $lt: endDate }
      })
    ]);

    // Calculate attendance rate
    const attendanceRate = totalStudents > 0 ? (todayAttendance / totalStudents) * 100 : 0;

    sendResponse(res, 200, {
      data: {
        totalStudents,
        totalTeachers,
        totalCourses,
        totalDevices,
        activeDevices,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
        todayAttendance
      }
    });
  } catch (error) {
    sendError(res, 500, 'Error fetching dashboard overview', error);
  }
};

/**
 * Get attendance statistics
 */
const getAttendanceStats = async (req, res) => {
  try {
    const { 
      schoolId, 
      startDate, 
      endDate, 
      groupBy = 'day' 
    } = req.query;
    
    // Determine target school
    let targetSchoolId = schoolId;
    if (req.user.role === 'school_admin') {
      targetSchoolId = req.user.schoolId;
    }

    // Build school filter
    const schoolFilter = targetSchoolId ? { schoolId: targetSchoolId } : {};

    // Set default date range if not provided
    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      // Default to last 30 days
      end = new Date();
      start = new Date();
      start.setDate(start.getDate() - 30);
    }

    // Build date filter
    const dateFilter = {
      date: { $gte: start, $lte: end }
    };

    // Get attendance data
    const attendanceData = await Attendance.find({
      ...schoolFilter,
      ...dateFilter
    }).populate('studentId', 'firstName lastName studentId majorId');

    // Group data by date
    const attendanceByDate = {};
    let totalPresent = 0;
    let totalAbsent = 0;

    attendanceData.forEach(record => {
      const dateKey = record.date.toISOString().split('T')[0];
      
      if (!attendanceByDate[dateKey]) {
        attendanceByDate[dateKey] = {
          date: dateKey,
          present: 0,
          absent: 0,
          total: 0
        };
      }

      if (record.status === 'present') {
        attendanceByDate[dateKey].present++;
        totalPresent++;
      } else {
        attendanceByDate[dateKey].absent++;
        totalAbsent++;
      }
      
      attendanceByDate[dateKey].total++;
    });

    // Convert to array and calculate rates
    const attendanceArray = Object.values(attendanceByDate).map(item => ({
      ...item,
      rate: item.total > 0 ? Math.round((item.present / item.total) * 10000) / 100 : 0
    }));

    // Sort by date
    attendanceArray.sort((a, b) => new Date(a.date) - new Date(b.date));

    const totalDays = attendanceArray.length;
    const averageAttendance = totalDays > 0 ? 
      Math.round((totalPresent / (totalPresent + totalAbsent)) * 10000) / 100 : 0;

    sendResponse(res, 200, {
      data: {
        totalDays,
        averageAttendance,
        attendanceByDate: attendanceArray
      }
    });
  } catch (error) {
    sendError(res, 500, 'Error fetching attendance statistics', error);
  }
};

/**
 * Get student statistics
 */
const getStudentStats = async (req, res) => {
  try {
    const { schoolId, majorId } = req.query;
    
    // Determine target school
    let targetSchoolId = schoolId;
    if (req.user.role === 'school_admin') {
      targetSchoolId = req.user.schoolId;
    }

    // Build filter
    const filter = {};
    if (targetSchoolId) filter.schoolId = targetSchoolId;
    if (majorId) filter.majorId = majorId;

    // Get student counts
    const [totalStudents, activeStudents] = await Promise.all([
      Student.countDocuments(filter),
      Student.countDocuments({ ...filter, isActive: true })
    ]);

    // Get students by major
    const studentsByMajor = await Student.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'majors',
          localField: 'majorId',
          foreignField: '_id',
          as: 'major'
        }
      },
      {
        $group: {
          _id: '$majorId',
          count: { $sum: 1 },
          majorName: { $first: '$major.name' }
        }
      },
      {
        $project: {
          major: '$majorName',
          count: 1
        }
      }
    ]);

    // Get students by year
    const studentsByYear = await Student.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$enrollmentYear',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          year: '$_id',
          count: 1
        }
      },
      { $sort: { year: -1 } }
    ]);

    sendResponse(res, 200, {
      data: {
        totalStudents,
        activeStudents,
        studentsByMajor,
        studentsByYear
      }
    });
  } catch (error) {
    sendError(res, 500, 'Error fetching student statistics', error);
  }
};

/**
 * Get device statistics
 */
const getDeviceStats = async (req, res) => {
  try {
    const { schoolId } = req.query;
    
    // Determine target school
    let targetSchoolId = schoolId;
    if (req.user.role === 'school_admin') {
      targetSchoolId = req.user.schoolId;
    }

    // Build filter
    const filter = targetSchoolId ? { schoolId: targetSchoolId } : {};

    // Get device counts
    const [totalDevices, activeDevices] = await Promise.all([
      Device.countDocuments(filter),
      Device.countDocuments({ ...filter, isActive: true })
    ]);

    const offlineDevices = totalDevices - activeDevices;

    // Get devices by location
    const devicesByLocation = await Device.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$location',
          count: { $sum: 1 },
          active: {
            $sum: { $cond: ['$isActive', 1, 0] }
          }
        }
      },
      {
        $project: {
          location: '$_id',
          count: 1,
          active: 1
        }
      }
    ]);

    sendResponse(res, 200, {
      data: {
        totalDevices,
        activeDevices,
        offlineDevices,
        devicesByLocation
      }
    });
  } catch (error) {
    sendError(res, 500, 'Error fetching device statistics', error);
  }
};

/**
 * Get recent activity
 */
const getRecentActivity = async (req, res) => {
  try {
    const { schoolId, limit = 10 } = req.query;
    
    // Determine target school
    let targetSchoolId = schoolId;
    if (req.user.role === 'school_admin') {
      targetSchoolId = req.user.schoolId;
    }

    // Build filter
    const filter = targetSchoolId ? { schoolId: targetSchoolId } : {};

    // Get recent attendance records
    const recentAttendance = await Attendance.find(filter)
      .populate('studentId', 'firstName lastName studentId')
      .populate('deviceId', 'name location')
      .sort({ checkInTime: -1 })
      .limit(parseInt(limit));

    // Format activity data
    const activities = recentAttendance.map(record => ({
      type: 'check_in',
      message: `${record.studentId.firstName} ${record.studentId.lastName} checked in`,
      timestamp: record.checkInTime,
      details: {
        studentId: record.studentId.studentId,
        device: record.deviceId.name,
        location: record.deviceId.location
      }
    }));

    sendResponse(res, 200, {
      data: activities
    });
  } catch (error) {
    sendError(res, 500, 'Error fetching recent activity', error);
  }
};

/**
 * Generate attendance report
 */
const generateAttendanceReport = async (req, res) => {
  try {
    const { 
      schoolId, 
      startDate, 
      endDate, 
      majorId, 
      format = 'json' 
    } = req.query;
    
    // Determine target school
    let targetSchoolId = schoolId;
    if (req.user.role === 'school_admin') {
      targetSchoolId = req.user.schoolId;
    }

    // Build filter
    const filter = {};
    if (targetSchoolId) filter.schoolId = targetSchoolId;

    // Set date range
    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      // Default to current month
      const now = new Date();
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    // Get attendance data
    const attendanceData = await Attendance.find({
      ...filter,
      date: { $gte: start, $lte: end }
    })
    .populate('studentId', 'firstName lastName studentId majorId')
    .populate('majorId', 'name')
    .sort({ date: -1 });

    // Filter by major if specified
    let filteredData = attendanceData;
    if (majorId) {
      filteredData = attendanceData.filter(record => 
        record.studentId.majorId.toString() === majorId
      );
    }

    // Calculate summary
    const totalRecords = filteredData.length;
    const presentCount = filteredData.filter(record => record.status === 'present').length;
    const absentCount = filteredData.filter(record => record.status === 'absent').length;
    const attendanceRate = totalRecords > 0 ? (presentCount / totalRecords) * 100 : 0;

    const summary = {
      totalRecords,
      presentCount,
      absentCount,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      dateRange: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      }
    };

    // Format details
    const details = filteredData.map(record => ({
      date: record.date.toISOString().split('T')[0],
      studentName: `${record.studentId.firstName} ${record.studentId.lastName}`,
      studentId: record.studentId.studentId,
      major: record.studentId.majorId?.name || 'N/A',
      status: record.status,
      checkInTime: record.checkInTime,
      checkOutTime: record.checkOutTime
    }));

    sendResponse(res, 200, {
      data: {
        summary,
        details
      }
    });
  } catch (error) {
    sendError(res, 500, 'Error generating attendance report', error);
  }
};

/**
 * Export data in various formats
 */
const exportData = async (req, res) => {
  try {
    const { dataType, format, filters = {} } = req.body;
    
    // Determine target school
    let targetSchoolId = filters.schoolId;
    if (req.user.role === 'school_admin') {
      targetSchoolId = req.user.schoolId;
    }

    // Build filter
    const filter = {};
    if (targetSchoolId) filter.schoolId = targetSchoolId;

    let data;
    let filename;

    switch (dataType) {
      case 'students':
        data = await Student.find(filter)
          .populate('majorId', 'name')
          .populate('schoolId', 'name');
        filename = `students_${new Date().toISOString().split('T')[0]}.${format}`;
        break;
        
      case 'teachers':
        data = await Teacher.find(filter)
          .populate('schoolId', 'name');
        filename = `teachers_${new Date().toISOString().split('T')[0]}.${format}`;
        break;
        
      case 'attendance':
        data = await Attendance.find(filter)
          .populate('studentId', 'firstName lastName studentId')
          .populate('deviceId', 'name location');
        filename = `attendance_${new Date().toISOString().split('T')[0]}.${format}`;
        break;
        
      case 'courses':
        data = await Course.find(filter)
          .populate('teacherId', 'firstName lastName')
          .populate('majorId', 'name');
        filename = `courses_${new Date().toISOString().split('T')[0]}.${format}`;
        break;
        
      default:
        return sendError(res, 400, 'Invalid data type');
    }

    // For now, return the data as JSON
    // In a real implementation, you would generate CSV, PDF, or Excel files
    sendResponse(res, 200, {
      data: {
        downloadUrl: `/api/dashboard/download/${filename}`,
        filename,
        recordCount: data.length
      }
    });
  } catch (error) {
    sendError(res, 500, 'Error exporting data', error);
  }
};

module.exports = {
  getOverview,
  getAttendanceStats,
  getStudentStats,
  getDeviceStats,
  getRecentActivity,
  generateAttendanceReport,
  exportData
}; 
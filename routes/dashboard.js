const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard');
const { authorize } = require('../middlewares/auth');

/**
 * @swagger
 * /api/dashboard/overview:
 *   get:
 *     summary: Get dashboard overview statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: schoolId
 *         schema:
 *           type: string
 *         description: School ID (optional, defaults to user's school)
 *       - in: query
 *         name: dateRange
 *         schema:
 *           type: string
 *           enum: [today, week, month, year]
 *           default: today
 *         description: Date range for statistics
 *     responses:
 *       200:
 *         description: Dashboard overview data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalStudents:
 *                       type: integer
 *                     totalTeachers:
 *                       type: integer
 *                     totalCourses:
 *                       type: integer
 *                     totalDevices:
 *                       type: integer
 *                     attendanceRate:
 *                       type: number
 *                     todayAttendance:
 *                       type: integer
 *                     activeDevices:
 *                       type: integer
 */
router.get('/overview', authorize(['super_admin', 'school_admin']), dashboardController.getOverview);

/**
 * @swagger
 * /api/dashboard/attendance-stats:
 *   get:
 *     summary: Get attendance statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: schoolId
 *         schema:
 *           type: string
 *         description: School ID (optional, defaults to user's school)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for statistics
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for statistics
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: day
 *         description: Group statistics by time period
 *     responses:
 *       200:
 *         description: Attendance statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalDays:
 *                       type: integer
 *                     averageAttendance:
 *                       type: number
 *                     attendanceByDate:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                           present:
 *                             type: integer
 *                           absent:
 *                             type: integer
 *                           total:
 *                             type: integer
 *                           rate:
 *                             type: number
 */
router.get('/attendance-stats', authorize(['super_admin', 'school_admin']), dashboardController.getAttendanceStats);

/**
 * @swagger
 * /api/dashboard/student-stats:
 *   get:
 *     summary: Get student statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: schoolId
 *         schema:
 *           type: string
 *         description: School ID (optional, defaults to user's school)
 *       - in: query
 *         name: majorId
 *         schema:
 *           type: string
 *         description: Filter by major ID
 *     responses:
 *       200:
 *         description: Student statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalStudents:
 *                       type: integer
 *                     activeStudents:
 *                       type: integer
 *                     studentsByMajor:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           major:
 *                             type: string
 *                           count:
 *                             type: integer
 *                     studentsByYear:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           year:
 *                             type: integer
 *                           count:
 *                             type: integer
 */
router.get('/student-stats', authorize(['super_admin', 'school_admin']), dashboardController.getStudentStats);

/**
 * @swagger
 * /api/dashboard/device-stats:
 *   get:
 *     summary: Get device statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: schoolId
 *         schema:
 *           type: string
 *         description: School ID (optional, defaults to user's school)
 *     responses:
 *       200:
 *         description: Device statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalDevices:
 *                       type: integer
 *                     activeDevices:
 *                       type: integer
 *                     offlineDevices:
 *                       type: integer
 *                     devicesByLocation:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           location:
 *                             type: string
 *                           count:
 *                             type: integer
 *                           active:
 *                             type: integer
 */
router.get('/device-stats', authorize(['super_admin', 'school_admin']), dashboardController.getDeviceStats);

/**
 * @swagger
 * /api/dashboard/recent-activity:
 *   get:
 *     summary: Get recent activity
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: schoolId
 *         schema:
 *           type: string
 *         description: School ID (optional, defaults to user's school)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of recent activities to return
 *     responses:
 *       200:
 *         description: Recent activity data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         enum: [check_in, device_offline, new_student, new_teacher]
 *                       message:
 *                         type: string
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                       details:
 *                         type: object
 */
router.get('/recent-activity', authorize(['super_admin', 'school_admin']), dashboardController.getRecentActivity);

/**
 * @swagger
 * /api/dashboard/attendance-report:
 *   get:
 *     summary: Generate attendance report
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: schoolId
 *         schema:
 *           type: string
 *         description: School ID (optional, defaults to user's school)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for report
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for report
 *       - in: query
 *         name: majorId
 *         schema:
 *           type: string
 *         description: Filter by major ID
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv, pdf]
 *           default: json
 *         description: Report format
 *     responses:
 *       200:
 *         description: Attendance report
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                     details:
 *                       type: array
 *                       items:
 *                         type: object
 */
router.get('/attendance-report', authorize(['super_admin', 'school_admin']), dashboardController.generateAttendanceReport);

/**
 * @swagger
 * /api/dashboard/export-data:
 *   post:
 *     summary: Export data in various formats
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dataType
 *               - format
 *             properties:
 *               dataType:
 *                 type: string
 *                 enum: [students, teachers, attendance, courses]
 *               format:
 *                 type: string
 *                 enum: [csv, pdf, excel]
 *               filters:
 *                 type: object
 *                 description: Optional filters for the data
 *     responses:
 *       200:
 *         description: Data exported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     downloadUrl:
 *                       type: string
 *                     filename:
 *                       type: string
 */
router.post('/export-data', authorize(['super_admin', 'school_admin']), dashboardController.exportData);

module.exports = router; 
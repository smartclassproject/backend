const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance');
const { authenticateToken, authorizeRoles, authorizeResourceAccess } = require('../middlewares/auth');
const { validateRequest } = require('../middlewares/validation');
const { body } = require('express-validator');
const Attendance = require('../models/Attendance');

/**
 * @swagger
 * /api/attendance:
 *   get:
 *     summary: Get all attendance records with pagination and filters
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - in: query
 *         name: studentId
 *         schema:
 *           type: string
 *         description: Filter by student ID
 *       - in: query
 *         name: courseId
 *         schema:
 *           type: string
 *         description: Filter by course ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Present, Absent, Late]
 *         description: Filter by attendance status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering
 *     responses:
 *       200:
 *         description: Attendance records retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Attendance records retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     attendance:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Attendance'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         total:
 *                           type: integer
 *                           example: 100
 *                         pages:
 *                           type: integer
 *                           example: 10
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticateToken, attendanceController.getAllAttendance);

/**
 * @swagger
 * /api/attendance/{id}:
 *   get:
 *     summary: Get attendance record by ID
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Attendance ID
 *     responses:
 *       200:
 *         description: Attendance record retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Attendance record retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Attendance'
 *       400:
 *         description: Bad request - Invalid attendance ID
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Attendance record not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', authenticateToken, authorizeResourceAccess(Attendance), attendanceController.getAttendanceById);

/**
 * @swagger
 * /api/attendance/check-in:
 *   post:
 *     summary: RFID check-in for attendance
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cardId
 *               - deviceId
 *               - classroom
 *             properties:
 *               cardId:
 *                 type: string
 *                 description: RFID card ID of the student
 *                 example: "RFID123456"
 *               deviceId:
 *                 type: string
 *                 description: Device ID that processed the check-in
 *                 example: "DEVICE001"
 *               classroom:
 *                 type: string
 *                 description: Classroom where check-in occurred
 *                 example: "Room 101"
 *     responses:
 *       200:
 *         description: Check-in processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Check-in processed successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Attendance'
 *       400:
 *         description: Bad request - Invalid input data
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: Student or device not found
 *       409:
 *         description: Conflict - Student already checked in for this session
 *       500:
 *         description: Internal server error
 */
router.post('/check-in', 
  authenticateToken, 
  [
    body('cardId').notEmpty().withMessage('Card ID is required'),
    body('deviceId').notEmpty().withMessage('Device ID is required'),
    body('classroom').notEmpty().withMessage('Classroom is required')
      .isLength({ max: 50 }).withMessage('Classroom cannot exceed 50 characters')
  ],
  validateRequest,
  attendanceController.processCheckIn
);

/**
 * @swagger
 * /api/attendance:
 *   post:
 *     summary: Create attendance record manually
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Attendance'
 *     responses:
 *       201:
 *         description: Attendance record created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Attendance record created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Attendance'
 *       400:
 *         description: Bad request - Invalid input data
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Student, course, or schedule not found
 *       409:
 *         description: Conflict - Attendance record already exists
 *       500:
 *         description: Internal server error
 */
router.post('/', 
  authenticateToken, 
  authorizeRoles('school_admin'),
  [
    body('studentId').notEmpty().withMessage('Student ID is required')
      .isMongoId().withMessage('Invalid student ID'),
    body('courseId').notEmpty().withMessage('Course ID is required')
      .isMongoId().withMessage('Invalid course ID'),
    body('scheduleId').notEmpty().withMessage('Schedule ID is required')
      .isMongoId().withMessage('Invalid schedule ID'),
    body('deviceId').notEmpty().withMessage('Device ID is required'),
    body('classroom').notEmpty().withMessage('Classroom is required')
      .isLength({ max: 50 }).withMessage('Classroom cannot exceed 50 characters'),
    body('status').optional().isIn(['Present', 'Absent', 'Late']).withMessage('Invalid status'),
    body('notes').optional().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
  ],
  validateRequest,
  attendanceController.createAttendance
);

/**
 * @swagger
 * /api/attendance/{id}:
 *   put:
 *     summary: Update attendance record
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Attendance ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Present, Absent, Late]
 *                 description: Attendance status
 *                 example: "Present"
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *                 description: Additional notes
 *                 example: "Student arrived late due to traffic"
 *     responses:
 *       200:
 *         description: Attendance record updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Attendance record updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Attendance'
 *       400:
 *         description: Bad request - Invalid input data
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Attendance record not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', 
  authenticateToken, 
  authorizeRoles('school_admin'),
  authorizeResourceAccess(Attendance),
  [
    body('status').optional().isIn(['Present', 'Absent', 'Late']).withMessage('Invalid status'),
    body('notes').optional().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
  ],
  validateRequest,
  attendanceController.updateAttendance
);

/**
 * @swagger
 * /api/attendance/{id}:
 *   delete:
 *     summary: Delete attendance record
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Attendance ID
 *     responses:
 *       200:
 *         description: Attendance record deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Attendance record deleted successfully"
 *       400:
 *         description: Bad request - Invalid attendance ID
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Attendance record not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', 
  authenticateToken, 
  authorizeRoles('school_admin'),
  authorizeResourceAccess(Attendance),
  attendanceController.deleteAttendance
);

/**
 * @swagger
 * /api/attendance/export/pdf:
 *   get:
 *     summary: Export attendance records to PDF
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: studentId
 *         schema:
 *           type: string
 *         description: Filter by student ID
 *       - in: query
 *         name: courseId
 *         schema:
 *           type: string
 *         description: Filter by course ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Present, Absent, Late]
 *         description: Filter by status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date
 *     responses:
 *       200:
 *         description: PDF report generated successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *             example: "PDF file content"
 *       400:
 *         description: Bad request - Invalid filter parameters
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: No attendance records found for the specified filters
 *       500:
 *         description: Internal server error
 */
router.get('/export/pdf', authenticateToken, attendanceController.generateReport);

/**
 * @swagger
 * /api/attendance/statistics:
 *   get:
 *     summary: Get attendance statistics
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         name: courseId
 *         schema:
 *           type: string
 *         description: Filter by course ID
 *     responses:
 *       200:
 *         description: Attendance statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Attendance statistics retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalRecords:
 *                       type: integer
 *                       example: 150
 *                     presentCount:
 *                       type: integer
 *                       example: 120
 *                     absentCount:
 *                       type: integer
 *                       example: 20
 *                     lateCount:
 *                       type: integer
 *                       example: 10
 *                     attendanceRate:
 *                       type: number
 *                       format: float
 *                       example: 80.0
 *                     averageAttendance:
 *                       type: number
 *                       format: float
 *                       example: 85.5
 *       400:
 *         description: Bad request - Invalid date parameters
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: No attendance records found for the specified period
 *       500:
 *         description: Internal server error
 */
router.get('/statistics', authenticateToken, attendanceController.getAttendanceStats);

/**
 * @swagger
 * /api/attendance/school/attendance:
 *   get:
 *     summary: Get all attendance records in a school (school admin only)
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by student name, student ID, or course name
 *       - in: query
 *         name: majorId
 *         schema:
 *           type: string
 *         description: Filter by major ID
 *       - in: query
 *         name: courseId
 *         schema:
 *           type: string
 *         description: Filter by course ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Present, Absent, Late]
 *         description: Filter by attendance status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering (YYYY-MM-DD)
 *       - in: query
 *         name: classroom
 *         schema:
 *           type: string
 *         description: Filter by classroom
 *       - in: query
 *         name: deviceId
 *         schema:
 *           type: string
 *         description: Filter by device ID
 *     responses:
 *       200:
 *         description: Successfully retrieved school attendance records
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Attendance'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     total:
 *                       type: integer
 *                       example: 100
 *                     pages:
 *                       type: integer
 *                       example: 10
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Access denied. No token provided."
 *       403:
 *         description: Forbidden - Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Access denied. School admin role required."
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 */
router.get('/school/attendance', authenticateToken, authorizeRoles('school_admin'), attendanceController.getSchoolAttendance);

module.exports = router; 
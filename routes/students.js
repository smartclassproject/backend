const express = require('express');
const router = express.Router();
const studentController = require('../controllers/students');
const { authorizeRoles, authorizeResourceAccess } = require('../middlewares/auth');
const { validateRequest } = require('../middlewares/validation');
const { body } = require('express-validator');
const Student = require('../models/Student');



/**
 * @swagger
 * /api/students/school/students:
 *   get:
 *     summary: Get all students across all schools with pagination, search and filters (Super Admin Only)
 *     tags: [Students]
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or student ID
 *       - in: query
 *         name: majorId
 *         schema:
 *           type: string
 *         description: Filter by major ID
 *       - in: query
 *         name: class
 *         schema:
 *           type: string
 *         description: Filter by class
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filter by status
 *       - in: query
 *         name: schoolId
 *         schema:
 *           type: string
 *         description: Filter by specific school ID
 *     responses:
 *       200:
 *         description: Students across all schools retrieved successfully
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
 *                   example: Students across all schools retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Student'
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
 *                       example: 150
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Only super admins can view all students
 *       500:
 *         description: Internal server error
 */
router.get('/school/students', authorizeRoles('super_admin'), studentController.getAllStudentsAcrossSchools);

/**
 * @swagger
 * /api/students/school/{schoolId}/students:
 *   get:
 *     summary: Get all students in a specific school (Super Admin Only)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: schoolId
 *         required: true
 *         schema:
 *           type: string
 *         description: School ID
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or student ID
 *       - in: query
 *         name: majorId
 *         schema:
 *           type: string
 *         description: Filter by major ID
 *       - in: query
 *         name: class
 *         schema:
 *           type: string
 *         description: Filter by class
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: School students retrieved successfully
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
 *                   example: School students retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Student'
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
 *                       example: 45
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Only admins can access this endpoint
 *       404:
 *         description: School not found
 *       500:
 *         description: Internal server error
 */
router.get('/school/:schoolId/students', authorizeRoles('admin'), studentController.getStudentsBySchool);

/**
 * @swagger
 * /api/students/students:
 *   get:
 *     summary: Get all students in current user's school (School Admin Only)
 *     tags: [Students]
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or student ID
 *       - in: query
 *         name: majorId
 *         schema:
 *           type: string
 *         description: Filter by major ID
 *       - in: query
 *         name: class
 *         schema:
 *           type: string
 *         description: Filter by class
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: School students retrieved successfully
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
 *                   example: School students retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Student'
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
 *                       example: 45
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Only school admins can access this endpoint
 *       500:
 *         description: Internal server error
 */
router.get('/students', authorizeRoles('school_admin'), studentController.getMySchoolStudents);



/**
 * @swagger
 * /api/students/students/{id}:
 *   get:
 *     summary: Get student by ID (School Admin & Super Admin)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Student ID
 *     responses:
 *       200:
 *         description: Student retrieved successfully
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
 *                   example: Student retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/Student'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Student not found
 *       500:
 *         description: Internal server error
 */
router.get('/students/:id', authorizeRoles('school_admin', 'super_admin'), studentController.getStudentById);

/**
 * @swagger
 * /api/students/students:
 *   post:
 *     summary: Create a new student
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Student'
 *     responses:
 *       201:
 *         description: Student created successfully
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
 *                   example: Student created successfully
 *                 data:
 *                   $ref: '#/components/schemas/Student'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Only school admins can create students
 *       409:
 *         description: Student ID or RFID card ID already exists
 *       500:
 *         description: Internal server error
 */
router.post('/students', authorizeRoles('school_admin'),
  [
    body('name').notEmpty().withMessage('Student name is required')
      .isLength({ max: 100 }).withMessage('Student name cannot exceed 100 characters'),
    body('studentId').notEmpty().withMessage('Student ID is required')
      .isLength({ max: 20 }).withMessage('Student ID cannot exceed 20 characters'),
    body('cardId').notEmpty().withMessage('RFID card ID is required')
      .isLength({ max: 50 }).withMessage('Card ID cannot exceed 50 characters'),
    body('majorId').notEmpty().withMessage('Major ID is required')
      .isMongoId().withMessage('Invalid major ID'),
    body('class').notEmpty().withMessage('Class is required')
      .isLength({ max: 10 }).withMessage('Class cannot exceed 10 characters'),
    body('dateOfBirth').notEmpty().withMessage('Date of birth is required')
      .isDate().withMessage('Invalid date of birth'),
    body('email').optional().isEmail().withMessage('Please enter a valid email'),
    body('phone').optional().isLength({ max: 20 }).withMessage('Phone number cannot exceed 20 characters')
  ],
  validateRequest,
  studentController.createStudent
);

/**
 * @swagger
 * /api/students/students/{id}:
 *   put:
 *     summary: Update student
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Student ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               studentId:
 *                 type: string
 *                 maxLength: 20
 *               cardId:
 *                 type: string
 *                 maxLength: 50
 *               class:
 *                 type: string
 *                 maxLength: 10
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *                 maxLength: 20
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Student updated successfully
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
 *                   example: Student updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/Student'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Student not found
 *       409:
 *         description: Student ID or RFID card ID already exists
 *       500:
 *         description: Internal server error
 */
router.put('/students/:id',

  authorizeRoles('school_admin'),
  [
    body('name').optional().isLength({ max: 100 }).withMessage('Student name cannot exceed 100 characters'),
    body('studentId').optional().isLength({ max: 20 }).withMessage('Student ID cannot exceed 20 characters'),
    body('cardId').optional().isLength({ max: 50 }).withMessage('Card ID cannot exceed 50 characters'),
    body('class').optional().isLength({ max: 10 }).withMessage('Class cannot exceed 10 characters'),
    body('dateOfBirth').optional().isDate().withMessage('Invalid date of birth'),
    body('email').optional().isEmail().withMessage('Please enter a valid email'),
    body('phone').optional().isLength({ max: 20 }).withMessage('Phone number cannot exceed 20 characters')
  ],
  validateRequest,
  studentController.updateStudent
);

/**
 * @swagger
 * /api/students/students/{id}:
 *   delete:
 *     summary: Delete student
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Student ID
 *     responses:
 *       200:
 *         description: Student deleted successfully
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
 *                   example: Student deleted successfully
 *       400:
 *         description: Cannot delete student with attendance records
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Student not found
 *       500:
 *         description: Internal server error
 */
router.delete('/students/:id',
  authorizeRoles('school_admin'),
  studentController.deleteStudent
);

/**
 * @swagger
 * /api/students/students/export/pdf:
 *   get:
 *     summary: Export students to PDF
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or student ID
 *       - in: query
 *         name: majorId
 *         schema:
 *           type: string
 *         description: Filter by major ID
 *       - in: query
 *         name: class
 *         schema:
 *           type: string
 *         description: Filter by class
 *     responses:
 *       200:
 *         description: PDF file generated successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/students/students/export/pdf', studentController.exportStudentsToPDF);

/**
 * @swagger
 * /api/students/students/check-card/{cardId}:
 *   get:
 *     summary: Check if RFID card is available
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cardId
 *         required: true
 *         schema:
 *           type: string
 *         description: RFID card ID
 *     responses:
 *       200:
 *         description: Card availability checked successfully
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
 *                   example: Card is available
 *                 data:
 *                   type: object
 *                   properties:
 *                     available:
 *                       type: boolean
 *                       example: true
 *                     student:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                           example: John Doe
 *                         studentId:
 *                           type: string
 *                           example: STU001
 *                       description: Student info if card is not available
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/students/check-card/:cardId', studentController.checkCardAvailability);

module.exports = router; 
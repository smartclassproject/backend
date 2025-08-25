const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teachers');
const { authenticateToken, authorizeResourceAccess, authorize } = require('../middlewares/auth');
const { validateRequest } = require('../middlewares/validation');
const { body } = require('express-validator');
const Teacher = require('../models/Teacher');

/**
 * @swagger
 * /api/teachers/school/teachers:
 *   get:
 *     summary: Get all teachers across all schools (Super Admin Only)
 *     tags: [Teachers]
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
 *         description: Search by name or email
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter by department
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: All teachers retrieved successfully
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
 *                     $ref: '#/components/schemas/Teacher'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     total:
 *                       type: integer
 *                       example: 25
 *                     pages:
 *                       type: integer
 *                       example: 3
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Only super admins can view all teachers
 *       500:
 *         description: Internal server error
 */
router.get('/school/teachers', authenticateToken, authorize('super_admin'), teacherController.getAllTeachersAcrossSchools);

/**
 * @swagger
 * /api/teachers/teachers:
 *   get:
 *     summary: Get all teachers in current user's school (School Admin Only)
 *     tags: [Teachers]
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
 *         description: Search by name or email
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter by department
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: School teachers retrieved successfully
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
 *                     $ref: '#/components/schemas/Teacher'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     total:
 *                       type: integer
 *                       example: 15
 *                     pages:
 *                       type: integer
 *                       example: 2
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Only school admins can access this endpoint
 *       500:
 *         description: Internal server error
 */
router.get('/teachers', authenticateToken, authorize('school_admin'), teacherController.getMySchoolTeachers);

/**
 * @swagger
 * /api/teachers/teachers/{id}:
 *   get:
 *     summary: Get teacher by ID
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Teacher ID
 *     responses:
 *       200:
 *         description: Teacher retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Teacher'
 *       400:
 *         description: Invalid teacher ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Teacher not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', authenticateToken, authorize('school_admin', 'super_admin'), teacherController.getTeacherById);

/**
 * @swagger
 * /api/teachers/teachers:
 *   post:
 *     summary: Create a new teacher
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - phone
 *             properties:
 *               name:
 *                 type: string
 *                 description: Teacher's full name
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Teacher's email address
 *                 example: "john.doe@school.com"
 *               phone:
 *                 type: string
 *                 description: Teacher's phone number
 *                 example: "+1234567890"
 *               department:
 *                 type: string
 *                 description: Teacher's department
 *                 example: "Computer Science"
 *               specialization:
 *                 type: string
 *                 description: Teacher's area of specialization
 *                 example: "Software Engineering"
 *     responses:
 *       201:
 *         description: Teacher created successfully
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
 *                   example: "Teacher created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Teacher'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Only school admins can create teachers
 *       409:
 *         description: Teacher with this email already exists
 *       500:
 *         description: Internal server error
 */
router.post('/teachers', 
  authenticateToken, 
  authorize('school_admin'),
  [
    body('name').notEmpty().withMessage('Teacher name is required')
      .isLength({ max: 100 }).withMessage('Teacher name cannot exceed 100 characters'),
    body('email').notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please enter a valid email'),
    body('phone').notEmpty().withMessage('Phone number is required')
      .isLength({ max: 20 }).withMessage('Phone number cannot exceed 20 characters'),
    body('department').optional().isLength({ max: 100 }).withMessage('Department cannot exceed 100 characters'),
    body('specialization').optional().isLength({ max: 200 }).withMessage('Specialization cannot exceed 200 characters')
  ],
  validateRequest,
  teacherController.createTeacher
);

/**
 * @swagger
 * /api/teachers/teachers/{id}:
 *   put:
 *     summary: Update teacher
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Teacher ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Teacher's full name
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Teacher's email address
 *                 example: "john.doe@school.com"
 *               phone:
 *                 type: string
 *                 description: Teacher's phone number
 *                 example: "+1234567890"
 *               department:
 *                 type: string
 *                 description: Teacher's department
 *                 example: "Computer Science"
 *               specialization:
 *                 type: string
 *                 description: Teacher's area of specialization
 *                 example: "Software Engineering"
 *     responses:
 *       200:
 *         description: Teacher updated successfully
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
 *                   example: "Teacher updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Teacher'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Teacher not found
 *       409:
 *         description: Teacher with this email already exists
 *       500:
 *         description: Internal server error
 */
router.put('/teachers/:id', 
  authenticateToken, 
  authorize('school_admin'),
  [
    body('name').optional().isLength({ max: 100 }).withMessage('Teacher name cannot exceed 100 characters'),
    body('email').optional().isEmail().withMessage('Please enter a valid email'),
    body('phone').optional().isLength({ max: 20 }).withMessage('Phone number cannot exceed 20 characters'),
    body('department').optional().isLength({ max: 100 }).withMessage('Department cannot exceed 100 characters'),
    body('specialization').optional().isLength({ max: 200 }).withMessage('Specialization cannot exceed 200 characters')
  ],
  validateRequest,
  teacherController.updateTeacher
);

/**
 * @swagger
 * /api/teachers/teachers/{id}:
 *   delete:
 *     summary: Delete teacher
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Teacher ID
 *     responses:
 *       200:
 *         description: Teacher deleted successfully
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
 *                   example: "Teacher deleted successfully"
 *       400:
 *         description: Cannot delete teacher with associated courses or students
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Teacher not found
 *       500:
 *         description: Internal server error
 */
router.delete('/teachers/:id', 
  authenticateToken, 
  authorize('school_admin'),
  teacherController.deleteTeacher
);

/**
 * @swagger
 * /api/teachers/export/pdf:
 *   get:
 *     summary: Export teachers to PDF
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter by department
 *     responses:
 *       200:
 *         description: PDF exported successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *               description: PDF file containing teachers data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/export/pdf', authenticateToken, teacherController.exportTeachersToPDF);

module.exports = router; 
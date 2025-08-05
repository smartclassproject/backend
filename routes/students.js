const express = require('express');
const router = express.Router();
const studentController = require('../controllers/students');
const { authenticateToken, authorizeRoles, authorizeResourceAccess } = require('../middlewares/auth');
const { validateRequest } = require('../middlewares/validation');
const { body } = require('express-validator');
const Student = require('../models/Student');

/**
 * @swagger
 * /api/students:
 *   get:
 *     summary: Get all students with pagination, search and filters
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
 */
router.get('/', authenticateToken, studentController.getAllStudents);

/**
 * @swagger
 * /api/students/{id}:
 *   get:
 *     summary: Get student by ID
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
 */
router.get('/:id', authenticateToken, authorizeResourceAccess(Student), studentController.getStudentById);

/**
 * @swagger
 * /api/students:
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
 */
router.post('/', 
  authenticateToken, 
  authorizeRoles('school_admin'),
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
    body('age').isInt({ min: 16, max: 100 }).withMessage('Age must be between 16 and 100'),
    body('email').optional().isEmail().withMessage('Please enter a valid email'),
    body('phone').optional().isLength({ max: 20 }).withMessage('Phone number cannot exceed 20 characters')
  ],
  validateRequest,
  studentController.createStudent
);

/**
 * @swagger
 * /api/students/{id}:
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
 */
router.put('/:id', 
  authenticateToken, 
  authorizeRoles('school_admin'),
  authorizeResourceAccess(Student),
  [
    body('name').optional().isLength({ max: 100 }).withMessage('Student name cannot exceed 100 characters'),
    body('studentId').optional().isLength({ max: 20 }).withMessage('Student ID cannot exceed 20 characters'),
    body('cardId').optional().isLength({ max: 50 }).withMessage('Card ID cannot exceed 50 characters'),
    body('class').optional().isLength({ max: 10 }).withMessage('Class cannot exceed 10 characters'),
    body('age').optional().isInt({ min: 16, max: 100 }).withMessage('Age must be between 16 and 100'),
    body('email').optional().isEmail().withMessage('Please enter a valid email'),
    body('phone').optional().isLength({ max: 20 }).withMessage('Phone number cannot exceed 20 characters')
  ],
  validateRequest,
  studentController.updateStudent
);

/**
 * @swagger
 * /api/students/{id}:
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
 */
router.delete('/:id', 
  authenticateToken, 
  authorizeRoles('school_admin'),
  authorizeResourceAccess(Student),
  studentController.deleteStudent
);

/**
 * @swagger
 * /api/students/export/pdf:
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
 */
router.get('/export/pdf', authenticateToken, studentController.exportStudentsToPDF);

/**
 * @swagger
 * /api/students/check-card/{cardId}:
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
 */
router.get('/check-card/:cardId', authenticateToken, studentController.checkCardAvailability);

module.exports = router; 
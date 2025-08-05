const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teachers');
const { authenticateToken, authorizeRoles, authorizeResourceAccess } = require('../middlewares/auth');
const { validateRequest } = require('../middlewares/validation');
const { body } = require('express-validator');
const Teacher = require('../models/Teacher');

/**
 * @swagger
 * /api/teachers:
 *   get:
 *     summary: Get all teachers with pagination, search and filters
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
 */
router.get('/', authenticateToken, teacherController.getAllTeachers);

/**
 * @swagger
 * /api/teachers/{id}:
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
 */
router.get('/:id', authenticateToken, authorizeResourceAccess(Teacher), teacherController.getTeacherById);

/**
 * @swagger
 * /api/teachers:
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
 *             $ref: '#/components/schemas/Teacher'
 */
router.post('/', 
  authenticateToken, 
  authorizeRoles('school_admin'),
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
 * /api/teachers/{id}:
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
 */
router.put('/:id', 
  authenticateToken, 
  authorizeRoles('school_admin'),
  authorizeResourceAccess(Teacher),
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
 * /api/teachers/{id}:
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
 */
router.delete('/:id', 
  authenticateToken, 
  authorizeRoles('school_admin'),
  authorizeResourceAccess(Teacher),
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
 */
router.get('/export/pdf', authenticateToken, teacherController.exportTeachersToPDF);

module.exports = router; 
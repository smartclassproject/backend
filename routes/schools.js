const express = require('express');
const router = express.Router();
const schoolController = require('../controllers/schools');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');
const { validateRequest } = require('../middlewares/validation');
const { body } = require('express-validator');

/**
 * @swagger
 * /api/schools:
 *   get:
 *     summary: Get all schools
 *     tags: [Schools]
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
 *         description: Search by school name
 *     responses:
 *       200:
 *         description: List of schools
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/School'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticateToken, schoolController.getAllSchools);

/**
 * @swagger
 * /api/schools/{id}:
 *   get:
 *     summary: Get school by ID
 *     tags: [Schools]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: School ID
 *     responses:
 *       200:
 *         description: School details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/School'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: School not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', authenticateToken, schoolController.getSchoolById);

/**
 * @swagger
 * /api/schools:
 *   post:
 *     summary: Create a new school
 *     tags: [Schools]
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
 *               - location
 *             properties:
 *               name:
 *                 type: string
 *               location:
 *                 type: string
 *     responses:
 *       201:
 *         description: School created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/School'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
router.post('/', 
  authenticateToken, 
  authorizeRoles('super_admin'),
  [
    body('name').notEmpty().withMessage('School name is required')
      .isLength({ max: 100 }).withMessage('School name cannot exceed 100 characters'),
    body('location').notEmpty().withMessage('School location is required')
      .isLength({ max: 200 }).withMessage('Location cannot exceed 200 characters')
  ],
  validateRequest,
  schoolController.createSchool
);

/**
 * @swagger
 * /api/schools/{id}:
 *   put:
 *     summary: Update school
 *     tags: [Schools]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: School ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: New name of the school
 *               location:
 *                 type: string
 *                 description: New location of the school
 *     responses:
 *       200:
 *         description: School updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/School'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: School not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', 
  authenticateToken, 
  authorizeRoles('super_admin'),
  [
    body('name').optional().isLength({ max: 100 }).withMessage('School name cannot exceed 100 characters'),
    body('location').optional().isLength({ max: 200 }).withMessage('Location cannot exceed 200 characters')
  ],
  validateRequest,
  schoolController.updateSchool
);

/**
 * @swagger
 * /api/schools/{id}:
 *   delete:
 *     summary: Delete school
 *     tags: [Schools]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: School ID
 *     responses:
 *       200:
 *         description: School deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: School deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: School not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', 
  authenticateToken, 
  authorizeRoles('super_admin'),
  schoolController.deleteSchool
);

module.exports = router; 
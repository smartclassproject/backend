const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admins');
const { validateAdmin, validateAdminUpdate } = require('../middlewares/validation');
const { authorize } = require('../middlewares/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     AdminUser:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - role
 *         - schoolId
 *       properties:
 *         username:
 *           type: string
 *           description: Admin username
 *         email:
 *           type: string
 *           format: email
 *           description: Admin email address
 *         password:
 *           type: string
 *           description: Admin password
 *         role:
 *           type: string
 *           enum: [super_admin, school_admin]
 *           description: Admin role
 *         schoolId:
 *           type: string
 *           description: Associated school ID
 *         firstName:
 *           type: string
 *           description: Admin first name
 *         lastName:
 *           type: string
 *           description: Admin last name
 *         phone:
 *           type: string
 *           description: Admin phone number
 *         isActive:
 *           type: boolean
 *           default: true
 *           description: Admin account status
 */

/**
 * @swagger
 * /api/admins:
 *   get:
 *     summary: Get all admin users with pagination and filtering
 *     tags: [Admins]
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
 *         description: Search by username, email, or name
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [super_admin, school_admin]
 *         description: Filter by role
 *       - in: query
 *         name: schoolId
 *         schema:
 *           type: string
 *         description: Filter by school ID
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of admin users
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
 *                     $ref: '#/components/schemas/AdminUser'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 */
router.get('/', authorize('super_admin'), adminController.getAllAdmins);

/**
 * @swagger
 * /api/admins/{id}:
 *   get:
 *     summary: Get admin user by ID
 *     tags: [Admins]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Admin user ID
 *     responses:
 *       200:
 *         description: Admin user details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AdminUser'
 *       404:
 *         description: Admin user not found
 */
router.get('/:id', authorize('super_admin', 'school_admin'), adminController.getAdminById);

/**
 * @swagger
 * /api/admins:
 *   post:
 *     summary: Create a new admin user
 *     tags: [Admins]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Admin email address
 *                 example: "admin@school.edu"
 *               password:
 *                 type: string
 *                 description: Admin password (min 6 characters)
 *                 example: "SecurePass123!"
 *               role:
 *                 type: string
 *                 enum: [super_admin, school_admin]
 *                 description: Admin role
 *                 example: "school_admin"
 *               schoolId:
 *                 type: string
 *                 description: School ID (REQUIRED for school_admin role)
 *                 example: "507f1f77bcf86cd799439011"
 *               firstName:
 *                 type: string
 *                 description: Admin first name
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 description: Admin last name
 *                 example: "Doe"
 *               phone:
 *                 type: string
 *                 description: Admin phone number
 *                 example: "+1234567890"
 *     responses:
 *       201:
 *         description: Admin user created successfully
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
 *                   example: "Admin user created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                     schoolId:
 *                       type: string
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     isActive:
 *                       type: boolean
 *       400:
 *         description: Validation error
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
 *                   example: "School ID is required for school admin"
 */
router.post('/', authorize('super_admin'), validateAdmin, adminController.createAdmin);

/**
 * @swagger
 * /api/admins/{id}:
 *   put:
 *     summary: Update admin user
 *     tags: [Admins]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Admin user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [super_admin, school_admin]
 *               schoolId:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Admin user updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AdminUser'
 *       404:
 *         description: Admin user not found
 */
router.put('/:id', authorize('super_admin'), validateAdminUpdate, adminController.updateAdmin);

/**
 * @swagger
 * /api/admins/{id}:
 *   delete:
 *     summary: Delete admin user
 *     tags: [Admins]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Admin user ID
 *     responses:
 *       200:
 *         description: Admin user deleted successfully
 *       404:
 *         description: Admin user not found
 */
router.delete('/:id', authorize('super_admin'), adminController.deleteAdmin);

/**
 * @swagger
 * /api/admins/{id}/toggle-status:
 *   patch:
 *     summary: Toggle admin user active status
 *     tags: [Admins]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Admin user ID
 *     responses:
 *       200:
 *         description: Admin user status updated successfully
 *       404:
 *         description: Admin user not found
 */
router.patch('/:id/toggle-status', authorize('super_admin'), adminController.toggleAdminStatus);

/**
 * @swagger
 * /api/admins/{id}/change-password:
 *   patch:
 *     summary: Change admin user password
 *     tags: [Admins]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Admin user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid current password
 *       404:
 *         description: Admin user not found
 */
router.patch('/:id/change-password', authorize('super_admin', 'school_admin'), adminController.changePassword);

/**
 * @swagger
 * /api/admins/profile:
 *   get:
 *     summary: Get current admin profile
 *     tags: [Admins]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current admin profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AdminUser'
 */
/**
 * @swagger
 * /api/admins/schools:
 *   get:
 *     summary: Get available schools for admin creation
 *     tags: [Admins]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of available schools
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
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: School ID
 *                       name:
 *                         type: string
 *                         description: School name
 *                       location:
 *                         type: string
 *                         description: School location
 */
router.get('/schools', authorize('super_admin'), adminController.getAvailableSchools);

router.get('/profile/me', authorize('super_admin', 'school_admin'), adminController.getMyProfile);

/**
 * @swagger
 * /api/admins/profile:
 *   put:
 *     summary: Update current admin profile
 *     tags: [Admins]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 */
router.put('/profile/me', authorize('super_admin', 'school_admin'), adminController.updateMyProfile);

module.exports = router; 
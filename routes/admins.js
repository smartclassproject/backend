const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admins');
const { validateAdmin, validateAdminUpdate, validateObjectId } = require('../middlewares/validation');
const { authorize } = require('../middlewares/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     AdminUser:
 *       type: object
 *       required:
 *         - email
 *         - role
 *         - schoolId
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: Admin email address
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
 *         passwordSetup:
 *           type: boolean
 *           default: false
 *           description: Whether password has been set up
 */

/**
 * Get all admin users with pagination and filtering
 */
router.get('/', authorize('super_admin'), adminController.getAllAdmins);

/**
 * Get admin user by ID
 */
router.get('/:id', authorize('super_admin', 'school_admin'), validateObjectId(), adminController.getAdminById);

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
router.put('/:id', authorize('super_admin'), validateObjectId(), validateAdminUpdate, adminController.updateAdmin);

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
router.delete('/:id', authorize('super_admin'), validateObjectId(), adminController.deleteAdmin);

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
router.patch('/:id/toggle-status', authorize('super_admin'), validateObjectId(), adminController.toggleAdminStatus);

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
router.patch('/:id/change-password', authorize('super_admin', 'school_admin'), validateObjectId(), adminController.changePassword);

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


/**
 * @swagger
 * /api/admins/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Admins]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Admin email address
 *     responses:
 *       200:
 *         description: Password reset email sent
 *       404:
 *         description: Email not found
 */
router.post('/forgot-password', adminController.forgotPassword);

/**
 * @swagger
 * /api/admins/resend-password-setup:
 *   post:
 *     summary: Resend password setup email
 *     tags: [Admins]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Admin email address
 *     responses:
 *       200:
 *         description: Password setup email resent successfully
 *       400:
 *         description: Admin already has password set up
 *       404:
 *         description: Admin not found
 */
router.post('/resend-password-setup', adminController.resendPasswordSetupEmail);

/**
 * @swagger
 * /api/admins/create-password-manually:
 *   post:
 *     summary: Create password manually (super admin only)
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
 *               - adminId
 *               - password
 *             properties:
 *               adminId:
 *                 type: string
 *                 description: ID of the admin user
 *               password:
 *                 type: string
 *                 description: New password
 *                 minLength: 4
 *     responses:
 *       200:
 *         description: Password created successfully
 *       400:
 *         description: Invalid input or admin already has password
 *       403:
 *         description: Only super admins can perform this action
 *       404:
 *         description: Admin not found
 */
router.post('/create-password-manually', authorize('super_admin'), adminController.createPasswordManually);

module.exports = router; 
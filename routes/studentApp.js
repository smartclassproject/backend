const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validateRequest } = require('../middlewares/validation');
const { authorizeRoles } = require('../middlewares/auth');
const controller = require('../controllers/studentApp');

router.get('/me', authorizeRoles('student'), controller.getMe);
router.get('/timetable', authorizeRoles('student'), controller.getTimetable);
router.get('/report-cards', authorizeRoles('student'), controller.getReports);
router.get('/report-cards/:id/download', authorizeRoles('student'), controller.downloadReport);
router.get('/fees', authorizeRoles('student'), controller.getFees);
router.post('/fees/submissions', authorizeRoles('student'), [
  body('amountSubmitted').isNumeric().withMessage('amountSubmitted must be numeric'),
  body('paymentMethod').notEmpty().withMessage('paymentMethod is required'),
  body('proofAssetId').optional().isMongoId().withMessage('proofAssetId must be a valid id'),
  body('proofUrl').optional().isString(),
], validateRequest, controller.submitFeeProof);
router.get('/materials', authorizeRoles('student'), controller.getMaterials);
router.get('/lessons', authorizeRoles('student'), controller.getLessons);
router.get('/announcements', authorizeRoles('student'), controller.getAnnouncements);
router.post('/inquiries', authorizeRoles('student'), [
  body('subject').notEmpty().withMessage('subject is required'),
  body('message').notEmpty().withMessage('message is required')
], validateRequest, controller.createInquiry);
router.get('/inquiries', authorizeRoles('student'), controller.getInquiries);
router.post('/inquiries/:id/reply', authorizeRoles('student'), controller.replyInquiry);
router.get('/privacy-policy', authorizeRoles('student'), controller.getPrivacyPolicy);
router.post('/change-password', authorizeRoles('student'), [
  body('currentPassword').notEmpty().withMessage('currentPassword is required'),
  body('newPassword').isLength({ min: 4 }).withMessage('newPassword must be at least 4 characters'),
  body('confirmPassword').optional().isLength({ min: 4 }).withMessage('confirmPassword must be at least 4 characters'),
], validateRequest, controller.changePassword);

module.exports = router;

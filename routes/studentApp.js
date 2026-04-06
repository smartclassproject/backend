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
  body('paymentMethod').notEmpty().withMessage('paymentMethod is required')
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

module.exports = router;

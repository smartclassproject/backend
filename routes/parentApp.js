const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validateRequest } = require('../middlewares/validation');
const { authorizeRoles } = require('../middlewares/auth');
const controller = require('../controllers/parentApp');

router.get('/dashboard', authorizeRoles('parent'), controller.getDashboard);
router.get('/report-cards', authorizeRoles('parent'), controller.getReports);
router.get('/report-cards/:id/download', authorizeRoles('parent'), controller.downloadReport);
router.get('/fees', authorizeRoles('parent'), controller.getFees);
router.post('/fees/submissions', authorizeRoles('parent'), [
  body('amountSubmitted').isNumeric().withMessage('amountSubmitted must be numeric'),
  body('paymentMethod').notEmpty().withMessage('paymentMethod is required')
], validateRequest, controller.submitFeeProof);
router.get('/announcements', authorizeRoles('parent'), controller.getAnnouncements);
router.post('/inquiries', authorizeRoles('parent'), [
  body('subject').notEmpty().withMessage('subject is required'),
  body('message').notEmpty().withMessage('message is required')
], validateRequest, controller.createInquiry);
router.get('/inquiries', authorizeRoles('parent'), controller.getInquiries);
router.post('/inquiries/:id/reply', authorizeRoles('parent'), controller.replyInquiry);

module.exports = router;

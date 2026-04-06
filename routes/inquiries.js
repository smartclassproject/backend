const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validateRequest } = require('../middlewares/validation');
const { authorizeRoles } = require('../middlewares/auth');
const controller = require('../controllers/inquiries');

router.post('/', authorizeRoles('student', 'parent'), [
  body('subject').notEmpty().withMessage('Subject is required'),
  body('message').notEmpty().withMessage('Message is required')
], validateRequest, controller.createInquiry);

router.get('/my', authorizeRoles('student', 'parent'), controller.getMyInquiries);
router.post('/:id/reply', authorizeRoles('student', 'parent', 'school_admin'), controller.replyToInquiry);

router.get('/', authorizeRoles('school_admin'), controller.getSchoolInquiries);
router.put('/:id/status', authorizeRoles('school_admin'), controller.updateInquiryStatus);

module.exports = router;

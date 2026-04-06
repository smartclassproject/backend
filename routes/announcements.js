const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validateRequest } = require('../middlewares/validation');
const { authorizeRoles } = require('../middlewares/auth');
const controller = require('../controllers/announcements');

router.get('/', authorizeRoles('school_admin', 'teacher', 'student', 'parent'), controller.getAnnouncements);

router.post('/', authorizeRoles('school_admin'), [
  body('title').notEmpty().withMessage('Title is required'),
  body('content').notEmpty().withMessage('Content is required')
], validateRequest, controller.createAnnouncement);

router.put('/:id', authorizeRoles('school_admin'), controller.updateAnnouncement);
router.delete('/:id', authorizeRoles('school_admin'), controller.deleteAnnouncement);

module.exports = router;

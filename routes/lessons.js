const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lessons');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');
const { validateRequest } = require('../middlewares/validation');
const { body } = require('express-validator');

const LESSON_MATERIAL_TYPES = ['pdf', 'ppt', 'pptx', 'video', 'image', 'document', 'other', 'link'];
const isAbsoluteHttpUrl = (value) => /^https?:\/\/.+/i.test(String(value || '').trim());
const isUploadsPath = (value) => /^\/uploads\/.+/i.test(String(value || '').trim());
const isAllowedLessonMaterialUrl = (value, materialType) => {
  const v = String(value || '').trim();
  if (!v) return false;
  if (String(materialType || '').toLowerCase() === 'link') return isAbsoluteHttpUrl(v);
  return isAbsoluteHttpUrl(v) || isUploadsPath(v);
};

const validateLessonMaterialsBody = (items) => {
  if (items === undefined || items === null) return true;
  if (!Array.isArray(items)) throw new Error('Materials must be an array');
  for (const m of items) {
    if (!m || typeof m !== 'object') throw new Error('Each material must be an object');
    const name = String(m.name || '').trim();
    if (!name) throw new Error('Material name is required');
    const url = String(m.url || '').trim();
    if (!url) throw new Error('Material URL is required');
    if (!isAllowedLessonMaterialUrl(url, m.type)) {
      throw new Error('Material URL must be http(s) or /uploads/... (links require http(s))');
    }
    if (m.type != null && m.type !== '' && !LESSON_MATERIAL_TYPES.includes(String(m.type))) {
      throw new Error('Invalid material type');
    }
    if (m.fileName != null && String(m.fileName).length > 255) {
      throw new Error('File name cannot exceed 255 characters');
    }
    if (m.fileSize != null && (typeof m.fileSize !== 'number' || m.fileSize < 0 || !Number.isFinite(m.fileSize))) {
      throw new Error('File size must be a non-negative number');
    }
  }
  return true;
};

// GET /api/lessons - Get all lessons
router.get('/', 
  authenticateToken,
  lessonController.getAllLessons
);

// GET /api/lessons/:id - Get lesson by ID
router.get('/:id',
  authenticateToken,
  lessonController.getLessonById
);

// POST /api/lessons - Create new lesson (teachers and school admins; scheduleId optional for chapters)
router.post('/',
  authenticateToken,
  authorizeRoles('teacher', 'school_admin', 'super_admin'),
  [
    body('courseId').notEmpty().withMessage('Course ID is required')
      .isMongoId().withMessage('Invalid course ID'),
    body('scheduleId').optional().isMongoId().withMessage('Invalid schedule ID'),
    body('title').notEmpty().withMessage('Title is required')
      .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
    body('lessonDate').notEmpty().withMessage('Lesson date is required')
      .isISO8601().withMessage('Invalid date format'),
    body('description').optional().isLength({ max: 5000 }).withMessage('Description cannot exceed 5000 characters'),
    body('materials').optional().isArray().withMessage('Materials must be an array')
      .custom((items) => validateLessonMaterialsBody(items)),
    body('isPublished').optional().isBoolean().withMessage('isPublished must be a boolean')
  ],
  validateRequest,
  lessonController.createLesson
);

// PUT /api/lessons/:id - Update lesson
router.put('/:id',
  authenticateToken,
  authorizeRoles('teacher', 'school_admin', 'super_admin'),
  [
    body('title').optional().isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
    body('lessonDate').optional().isISO8601().withMessage('Invalid date format'),
    body('description').optional().isLength({ max: 5000 }).withMessage('Description cannot exceed 5000 characters'),
    body('materials').optional().isArray().withMessage('Materials must be an array')
      .custom((items) => validateLessonMaterialsBody(items)),
    body('isPublished').optional().isBoolean().withMessage('isPublished must be a boolean')
  ],
  validateRequest,
  lessonController.updateLesson
);

// DELETE /api/lessons/:id - Delete lesson
router.delete('/:id',
  authenticateToken,
  authorizeRoles('teacher', 'school_admin', 'super_admin'),
  lessonController.deleteLesson
);

module.exports = router;

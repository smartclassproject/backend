const express = require('express');
const router = express.Router();
const materialController = require('../controllers/materials');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');
const { validateRequest } = require('../middlewares/validation');
const { body } = require('express-validator');

const isAbsoluteHttpUrl = (value) => /^https?:\/\/.+/i.test(String(value || '').trim());
const isUploadsPath = (value) => /^\/uploads\/.+/i.test(String(value || '').trim());
const isAllowedMaterialUrl = (value, fileType) => {
  const v = String(value || '').trim();
  if (!v) return false;
  if (String(fileType || '').toLowerCase() === 'link') return isAbsoluteHttpUrl(v);
  return isAbsoluteHttpUrl(v) || isUploadsPath(v);
};

// GET /api/materials - Get all materials
router.get('/',
  authenticateToken,
  materialController.getAllMaterials
);

// GET /api/materials/:id - Get material by ID
router.get('/:id',
  authenticateToken,
  materialController.getMaterialById
);

// POST /api/materials - Create new material
router.post('/',
  authenticateToken,
  authorizeRoles('teacher', 'school_admin', 'super_admin'),
  [
    body('courseId').notEmpty().withMessage('Course ID is required')
      .isMongoId().withMessage('Invalid course ID'),
    body('title').notEmpty().withMessage('Title is required')
      .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
    body('fileType').notEmpty().withMessage('File type is required')
      .isIn(['pdf', 'ppt', 'pptx', 'video', 'image', 'document', 'other', 'link']).withMessage('Invalid file type'),
    body('fileUrl').notEmpty().withMessage('File URL is required')
      .custom((value, { req }) => {
        if (!isAllowedMaterialUrl(value, req.body.fileType)) {
          throw new Error('File URL must be an absolute http(s) URL or /uploads path (links require http(s))');
        }
        return true;
      }),
    body('fileName').optional().isLength({ max: 255 }).withMessage('File name cannot exceed 255 characters'),
    body('fileSize').optional().isInt({ min: 0 }).withMessage('File size must be a non-negative integer'),
    body('isPublished').optional().isBoolean().withMessage('isPublished must be a boolean')
  ],
  validateRequest,
  materialController.createMaterial
);

// PUT /api/materials/:id - Update material
router.put('/:id',
  authenticateToken,
  authorizeRoles('teacher', 'school_admin', 'super_admin'),
  [
    body('title').optional().isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
    body('fileType').optional().isIn(['pdf', 'ppt', 'pptx', 'video', 'image', 'document', 'other', 'link']).withMessage('Invalid file type'),
    body('fileUrl').optional().custom((value, { req }) => {
      const effectiveFileType = req.body.fileType || 'other';
      if (!isAllowedMaterialUrl(value, effectiveFileType)) {
        throw new Error('File URL must be an absolute http(s) URL or /uploads path (links require http(s))');
      }
      return true;
    }),
    body('isPublished').optional().isBoolean().withMessage('isPublished must be a boolean')
  ],
  validateRequest,
  materialController.updateMaterial
);

// DELETE /api/materials/:id - Delete material
router.delete('/:id',
  authenticateToken,
  authorizeRoles('teacher', 'school_admin', 'super_admin'),
  materialController.deleteMaterial
);

module.exports = router;

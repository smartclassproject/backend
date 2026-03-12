const express = require('express');
const router = express.Router();
const reportCardsController = require('../controllers/reportCards');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');
const { body } = require('express-validator');
const { validateRequest } = require('../middlewares/validation');

// GET /api/report-cards/terms-config - Get school's number of terms (school_admin, teacher)
router.get('/terms-config',
  authenticateToken,
  authorizeRoles('school_admin', 'teacher'),
  reportCardsController.getTermsConfig
);

// ----- Teacher routes -----

// GET /api/report-cards/students-for-term - List students for a course/term to enter marks (teacher)
router.get('/students-for-term',
  authenticateToken,
  authorizeRoles('teacher'),
  reportCardsController.getStudentsForTerm
);

// POST /api/report-cards/term-results - Submit term results (teacher)
router.post('/term-results',
  authenticateToken,
  authorizeRoles('teacher'),
  [
    body('academicYear').notEmpty().withMessage('Academic year is required').isInt({ min: 2000, max: 2100 }),
    body('term').notEmpty().withMessage('Term is required').isInt({ min: 1, max: 6 }),
    body('courseId').notEmpty().withMessage('Course ID is required').isMongoId(),
    body('results').isArray().withMessage('Results must be an array'),
    body('results.*.studentId').notEmpty().withMessage('Student ID required').isMongoId(),
    body('results.*.examMarks').notEmpty().withMessage('Exam marks required'),
    body('results.*.disciplineMarks').notEmpty().withMessage('Discipline marks required'),
    body('results.*.remarks').optional().isString().isLength({ max: 500 })
  ],
  validateRequest,
  reportCardsController.submitTermResults
);

// GET /api/report-cards/my-results - Teacher's submitted term results
router.get('/my-results',
  authenticateToken,
  authorizeRoles('teacher'),
  reportCardsController.getMyTermResults
);

// ----- School admin routes -----

// GET /api/report-cards - List all report card entries (school_admin)
router.get('/',
  authenticateToken,
  authorizeRoles('school_admin'),
  reportCardsController.getReportCards
);

// GET /api/report-cards/student/:studentId - Full report card for one student (school_admin)
router.get('/student/:studentId',
  authenticateToken,
  authorizeRoles('school_admin'),
  reportCardsController.getReportCardByStudent
);

module.exports = router;

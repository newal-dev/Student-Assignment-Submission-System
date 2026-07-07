// All routes related to submissions with proper authorization

const express = require('express');
const router = express.Router();
const submissionController = require('../controllers/submissionController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateSubmission } = require('../utils/validation');

// All submission routes require authentication
router.use(authenticate);

// Student routes
router.post('/',
    authorize('student'), // Only students can submit
    validateSubmission,
    submissionController.createSubmission
);

router.get('/me',
    authorize('student'), // Only students can view their own submissions
    submissionController.getMySubmissions
);

// Teacher routes for grading
router.put('/:id/grade',
    authorize('teacher'), // Only teachers can grade
    submissionController.gradeSubmission
);

module.exports = router;
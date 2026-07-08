// All routes related to submissions with proper authorization

const express = require('express');
const router = express.Router();
const submissionController = require('../controllers/submissionController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateSubmission } = require('../utils/validation');
const upload = require('../config/upload');

// All submission routes require authentication
router.use(authenticate);

// Student routes
router.post('/',
    authorize('student'),
    upload.single('file'), // Handle file upload
    validateSubmission,
    submissionController.createSubmission
);

router.get('/me',
    authorize('student'),
    submissionController.getMySubmissions
);

router.get('/me/stats',
    authorize('student'),
    submissionController.getMySubmissionStats
);

router.get('/:id',
    submissionController.getSubmissionById
);

router.put('/:id',
    upload.single('file'),
    validateSubmission,
    submissionController.updateSubmission
);

router.delete('/:id',
    submissionController.deleteSubmission
);

// Teacher routes for grading
router.put('/:id/grade',
    authorize('teacher'),
    submissionController.gradeSubmission
);

module.exports = router;
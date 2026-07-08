const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const submissionController = require('../controllers/submissionController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, validateRequest } = require('../middleware/validate');

// All routes require authentication
router.use(authenticate);

// Assignment CRUD with validation
router.get('/',
    validate.pagination,
    validate.filters,
    validateRequest,
    assignmentController.getAllAssignments
);

router.get('/statistics',
    authorize('teacher'),
    assignmentController.getAssignmentStatistics
);

router.get('/:id',
    validate.idParam,
    validateRequest,
    assignmentController.getAssignmentById
);

router.post('/',
    authorize('teacher'),
    validate.createAssignment,
    validateRequest,
    assignmentController.createAssignment
);

router.put('/:id',
    authorize('teacher'),
    validate.idParam,
    validate.updateAssignment,
    validateRequest,
    assignmentController.updateAssignment
);

router.delete('/:id',
    authorize('teacher'),
    validate.idParam,
    validateRequest,
    assignmentController.deleteAssignment
);

router.delete('/:id/force',
    authorize('teacher'),
    validate.idParam,
    validateRequest,
    assignmentController.forceDeleteAssignment
);

// Submissions for assignment
router.get('/:id/submissions',
    authorize('teacher'),
    validate.idParam,
    validateRequest,
    submissionController.getAssignmentSubmissions
);

module.exports = router;
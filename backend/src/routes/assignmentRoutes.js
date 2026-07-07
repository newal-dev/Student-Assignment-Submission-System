// All routes related to assignments with authorization

const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const submissionController = require('../controllers/submissionController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateAssignment } = require('../utils/validation');

// All assignment routes require authentication
router.use(authenticate);

// Assignment CRUD operations
router.get('/', assignmentController.getAllAssignments);
router.get('/:id', assignmentController.getAssignmentById);

// Teacher-only routes
router.post('/', 
    authorize('teacher'), // Only teachers can create
    validateAssignment,
    assignmentController.createAssignment
);

router.put('/:id',
    authorize('teacher'), // Only teachers can update
    validateAssignment,
    assignmentController.updateAssignment
);

router.delete('/:id',
    authorize('teacher'), // Only teachers can delete
    assignmentController.deleteAssignment
);

// Nested routes for submissions
router.get('/:id/submissions',
    authorize('teacher'), // Only teachers can view all submissions
    submissionController.getAssignmentSubmissions
);

module.exports = router;
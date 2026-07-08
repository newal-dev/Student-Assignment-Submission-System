// All routes related to teacher grading and analytics

const express = require('express');
const router = express.Router();
const gradingController = require('../controllers/gradingController');
const { authenticate, authorize } = require('../middleware/auth');

// All grading routes require authentication and teacher role
router.use(authenticate);
router.use(authorize('teacher'));

// Grading operations
router.put('/submissions/:id', gradingController.gradeSubmission);
router.post('/batch', gradingController.batchGradeSubmissions);

// Dashboard and analytics
router.get('/dashboard', gradingController.getGradingDashboard);
router.get('/assignments/:id/analytics', gradingController.getAssignmentAnalytics);
router.get('/assignments/:id/export', gradingController.exportGradesCSV);

// Student performance
router.get('/students/:id/performance', gradingController.getStudentPerformance);

// Reminders
router.get('/reminders', gradingController.getGradingReminders);

module.exports = router;
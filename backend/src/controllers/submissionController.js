// Handles submissions with proper authorization

const { Submission, Assignment } = require('../models');

/**
 * Create a new submission
 * POST /api/submissions
 * Authorization: Student only
 */
const createSubmission = async (req, res, next) => {
    try {
        const { assignment_id, content, file_url } = req.body;
        
        // Only students can submit assignments
        if (req.user.role !== 'student') {
            return res.status(403).json({
                error: 'Permission denied',
                message: 'Only students can submit assignments'
            });
        }

        // Check if assignment exists
        const assignment = await Assignment.findById(assignment_id);
        if (!assignment) {
            return res.status(404).json({
                error: 'Assignment not found',
                message: 'The assignment you are trying to submit to does not exist'
            });
        }

        // Check if assignment is past due date
        const now = new Date();
        const dueDate = new Date(assignment.due_date);
        if (now > dueDate) {
            return res.status(400).json({
                error: 'Past deadline',
                message: 'This assignment is past its due date',
                due_date: assignment.due_date
            });
        }

        const submission = await Submission.create({
            assignment_id,
            student_id: req.user.id, // Automatically set to current user
            content,
            file_url
        });

        res.status(201).json({
            message: 'Submission created successfully',
            submission
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get student's own submissions
 * GET /api/submissions/me
 * Authorization: Student only
 */
const getMySubmissions = async (req, res, next) => {
    try {
        // Students can only see only their own submissions
        if (req.user.role !== 'student') {
            return res.status(403).json({
                error: 'Permission denied',
                message: 'Only students can view their own submissions'
            });
        }

        const submissions = await Submission.findByStudent(req.user.id);

        res.status(200).json({
            count: submissions.length,
            submissions
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get submissions for an assignment
 * GET /api/assignments/:id/submissions
 * Authorization: Teacher only
 */
const getAssignmentSubmissions = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Only teachers can view all submissions for an assignment
        if (req.user.role !== 'teacher') {
            return res.status(403).json({
                error: 'Permission denied',
                message: 'Only teachers can view all submissions for an assignment'
            });
        }

        // Check if assignment exists
        const assignment = await Assignment.findById(id);
        if (!assignment) {
            return res.status(404).json({
                error: 'Assignment not found',
                message: 'The assignment does not exist'
            });
        }

        // Teacher can only see submissions for their own assignments
        if (assignment.teacher_id !== req.user.id) {
            return res.status(403).json({
                error: 'Permission denied',
                message: 'You can only view submissions for assignments you created'
            });
        }

        const submissions = await Submission.findByAssignment(id);

        res.status(200).json({
            count: submissions.length,
            assignment: assignment.title,
            submissions
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Grade a submission
 * PUT /api/submissions/:id/grade
 * Authorization: Teacher only
 */
const gradeSubmission = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { grade, feedback } = req.body;
        
        // Only teachers can grade
        if (req.user.role !== 'teacher') {
            return res.status(403).json({
                error: 'Permission denied',
                message: 'Only teachers can grade submissions'
            });
        }

        // Validate grade
        if (grade !== undefined && (grade < 0 || grade > 100)) {
            return res.status(400).json({
                error: 'Invalid grade',
                message: 'Grade must be between 0 and 100'
            });
        }

        // Get submission with assignment info
        const submission = await Submission.findById(id);
        if (!submission) {
            return res.status(404).json({
                error: 'Submission not found',
                message: 'The submission does not exist'
            });
        }

        // Check if teacher owns the assignment
        const assignment = await Assignment.findById(submission.assignment_id);
        if (assignment.teacher_id !== req.user.id) {
            return res.status(403).json({
                error: 'Permission denied',
                message: 'You can only grade submissions for assignments you created'
            });
        }

        const updatedSubmission = await Submission.update(id, { grade, feedback });

        res.status(200).json({
            message: 'Submission graded successfully',
            submission: updatedSubmission
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createSubmission,
    getMySubmissions,
    getAssignmentSubmissions,
    gradeSubmission
};
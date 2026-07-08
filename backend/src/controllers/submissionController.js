// Handles submissions with proper authorization


const { Submission, Assignment } = require('../models');
const { validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');

/**
 * Create a new submission
 * POST /api/submissions
 * Authorization: Student only
 */
const createSubmission = async (req, res, next) => {
    try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { assignment_id, content } = req.body;
        const file = req.file; // From multer middleware
        
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
                due_date: assignment.due_date,
                current_date: now.toISOString().split('T')[0]
            });
        }

        // Check if student already submitted
        const existingSubmissions = await Submission.findByStudentAndAssignment(
            req.user.id, 
            assignment_id
        );
        
        if (existingSubmissions.length > 0) {
            return res.status(400).json({
                error: 'Already submitted',
                message: 'You have already submitted this assignment',
                existing_submission_id: existingSubmissions[0].id
            });
        }

        // Prepare submission data
        const submissionData = {
            assignment_id,
            student_id: req.user.id,
            content: content || null,
            file_url: file ? `/uploads/${file.filename}` : null
        };

        // Validate at least content or file is provided
        if (!submissionData.content && !submissionData.file_url) {
            return res.status(400).json({
                error: 'Missing content',
                message: 'Please provide either content or upload a file'
            });
        }

        const submission = await Submission.create(submissionData);

        // Log the submission
        console.log(`📤 Submission created by student ${req.user.username} for assignment ${assignment_id}`);

        res.status(201).json({
            success: true,
            message: 'Assignment submitted successfully',
            submission: {
                ...submission,
                file_url: submission.file_url ? `${req.protocol}://${req.get('host')}${submission.file_url}` : null
            }
        });
    } catch (error) {
        // Delete uploaded file if submission fails
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting file:', err);
            });
        }
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
        // Students can only see their own submissions
        if (req.user.role !== 'student') {
            return res.status(403).json({
                error: 'Permission denied',
                message: 'Only students can view their own submissions'
            });
        }

        // Parse query parameters for filtering
        const { status, assignment_id } = req.query;
        let filter = { student_id: req.user.id };
        
        if (assignment_id) {
            filter.assignment_id = parseInt(assignment_id);
        }

        let submissions = await Submission.findByStudent(req.user.id, filter);

        // Filter by status (graded/ungraded)
        if (status === 'graded') {
            submissions = submissions.filter(s => s.grade !== null);
        } else if (status === 'ungraded') {
            submissions = submissions.filter(s => s.grade === null);
        }

        // Get additional details for each submission
        const submissionsWithDetails = await Promise.all(
            submissions.map(async (submission) => {
                const assignment = await Assignment.findById(submission.assignment_id);
                const now = new Date();
                const dueDate = new Date(assignment.due_date);
                
                return {
                    ...submission,
                    assignment_title: assignment.title,
                    assignment_due_date: assignment.due_date,
                    is_late: now > dueDate,
                    can_update: now <= dueDate && submission.grade === null,
                    can_delete: now <= dueDate && submission.grade === null
                };
            })
        );

        res.status(200).json({
            success: true,
            count: submissionsWithDetails.length,
            submissions: submissionsWithDetails
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get a specific submission by ID
 * GET /api/submissions/:id
 * Authorization: Owner or teacher
 */
const getSubmissionById = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Validate ID
        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({
                error: 'Invalid ID',
                message: 'Submission ID must be a valid number'
            });
        }

        const submission = await Submission.findById(id);
        
        if (!submission) {
            return res.status(404).json({
                error: 'Submission not found',
                message: `Submission with id ${id} does not exist`
            });
        }

        // Authorization: Student can only see their own submissions
        // Teacher can see any submission (for their assignments)
        if (req.user.role === 'student' && submission.student_id !== req.user.id) {
            return res.status(403).json({
                error: 'Permission denied',
                message: 'You can only view your own submissions'
            });
        }

        // If teacher, verify they own the assignment
        if (req.user.role === 'teacher') {
            const assignment = await Assignment.findById(submission.assignment_id);
            if (assignment.teacher_id !== req.user.id) {
                return res.status(403).json({
                    error: 'Permission denied',
                    message: 'You can only view submissions for your own assignments'
                });
            }
        }

        // Get assignment details
        const assignment = await Assignment.findById(submission.assignment_id);

        // Add file URL
        const fileUrl = submission.file_url ? 
            `${req.protocol}://${req.get('host')}${submission.file_url}` : 
            null;

        res.status(200).json({
            success: true,
            submission: {
                ...submission,
                file_url: fileUrl,
                assignment_title: assignment.title,
                assignment_due_date: assignment.due_date,
                teacher_name: assignment.teacher_name
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update a submission
 * PUT /api/submissions/:id
 * Authorization: Student who created it (before deadline)
 */
const updateSubmission = async (req, res, next) => {
    try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { id } = req.params;
        const { content } = req.body;
        const file = req.file;

        // Validate ID
        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({
                error: 'Invalid ID',
                message: 'Submission ID must be a valid number'
            });
        }

        // Check if submission exists
        const submission = await Submission.findById(id);
        if (!submission) {
            return res.status(404).json({
                error: 'Submission not found',
                message: `Submission with id ${id} does not exist`
            });
        }

        // Authorization: Only the student who created it can update
        if (submission.student_id !== req.user.id) {
            return res.status(403).json({
                error: 'Permission denied',
                message: 'You can only update your own submissions'
            });
        }

        // Check if assignment is past due
        const assignment = await Assignment.findById(submission.assignment_id);
        const now = new Date();
        const dueDate = new Date(assignment.due_date);
        
        if (now > dueDate) {
            return res.status(400).json({
                error: 'Past deadline',
                message: 'This assignment is past its due date and cannot be updated',
                due_date: assignment.due_date
            });
        }

        // Check if submission is already graded
        if (submission.grade !== null) {
            return res.status(400).json({
                error: 'Already graded',
                message: 'This submission has already been graded and cannot be updated'
            });
        }

        // Prepare update data
        const updates = {};
        if (content !== undefined) updates.content = content;
        if (file) {
            // Delete old file if exists
            if (submission.file_url) {
                const oldFilePath = path.join(__dirname, '../../public', submission.file_url);
                if (fs.existsSync(oldFilePath)) {
                    fs.unlinkSync(oldFilePath);
                }
            }
            updates.file_url = `/uploads/${file.filename}`;
        }

        // Validate at least content or file is provided
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                error: 'No updates',
                message: 'Please provide content or file to update'
            });
        }

        const updatedSubmission = await Submission.update(id, updates);

        // Log the update
        console.log(`📝 Submission ${id} updated by student ${req.user.username}`);

        res.status(200).json({
            success: true,
            message: 'Submission updated successfully',
            submission: {
                ...updatedSubmission,
                file_url: updatedSubmission.file_url ? 
                    `${req.protocol}://${req.get('host')}${updatedSubmission.file_url}` : 
                    null
            }
        });
    } catch (error) {
        // Delete uploaded file if update fails
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting file:', err);
            });
        }
        next(error);
    }
};

/**
 * Delete a submission
 * DELETE /api/submissions/:id
 * Authorization: Student who created it (before deadline)
 */
const deleteSubmission = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Validate ID
        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({
                error: 'Invalid ID',
                message: 'Submission ID must be a valid number'
            });
        }

        // Check if submission exists
        const submission = await Submission.findById(id);
        if (!submission) {
            return res.status(404).json({
                error: 'Submission not found',
                message: `Submission with id ${id} does not exist`
            });
        }

        // Authorization: Only the student who created it can delete
        if (submission.student_id !== req.user.id) {
            return res.status(403).json({
                error: 'Permission denied',
                message: 'You can only delete your own submissions'
            });
        }

        // Check if assignment is past due
        const assignment = await Assignment.findById(submission.assignment_id);
        const now = new Date();
        const dueDate = new Date(assignment.due_date);
        
        if (now > dueDate) {
            return res.status(400).json({
                error: 'Past deadline',
                message: 'This assignment is past its due date and cannot be deleted'
            });
        }

        // Check if submission is already graded
        if (submission.grade !== null) {
            return res.status(400).json({
                error: 'Already graded',
                message: 'This submission has already been graded and cannot be deleted'
            });
        }

        // Delete file if exists
        if (submission.file_url) {
            const filePath = path.join(__dirname, '../../public', submission.file_url);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await Submission.delete(id);

        // Log the deletion
        console.log(`🗑️ Submission ${id} deleted by student ${req.user.username}`);

        res.status(200).json({
            success: true,
            message: 'Submission deleted successfully',
            submission_id: parseInt(id)
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get submissions for an assignment (teacher view)
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

        // Validate ID
        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({
                error: 'Invalid ID',
                message: 'Assignment ID must be a valid number'
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

        // Parse query parameters
        const { graded, student_id } = req.query;
        
        let submissions = await Submission.findByAssignment(id);

        // Filter by grade status
        if (graded === 'true') {
            submissions = submissions.filter(s => s.grade !== null);
        } else if (graded === 'false') {
            submissions = submissions.filter(s => s.grade === null);
        }

        // Filter by student
        if (student_id) {
            submissions = submissions.filter(s => s.student_id === parseInt(student_id));
        }

        // Add file URLs
        const submissionsWithUrls = submissions.map(s => ({
            ...s,
            file_url: s.file_url ? `${req.protocol}://${req.get('host')}${s.file_url}` : null
        }));

        // Calculate statistics
        const stats = {
            total: submissions.length,
            graded: submissions.filter(s => s.grade !== null).length,
            ungraded: submissions.filter(s => s.grade === null).length,
            average_grade: submissions.length > 0 
                ? submissions.reduce((acc, s) => acc + (s.grade || 0), 0) / submissions.length
                : 0,
            max_grade: submissions.length > 0 
                ? Math.max(...submissions.map(s => s.grade || 0))
                : 0,
            min_grade: submissions.length > 0 
                ? Math.min(...submissions.map(s => s.grade || 100))
                : 0
        };

        res.status(200).json({
            success: true,
            assignment: {
                id: assignment.id,
                title: assignment.title,
                due_date: assignment.due_date
            },
            statistics: stats,
            count: submissionsWithUrls.length,
            submissions: submissionsWithUrls
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Grade a submission (teacher only)
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

        // Validate ID
        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({
                error: 'Invalid ID',
                message: 'Submission ID must be a valid number'
            });
        }

        // Validate grade
        if (grade !== undefined) {
            if (isNaN(grade) || grade < 0 || grade > 100) {
                return res.status(400).json({
                    error: 'Invalid grade',
                    message: 'Grade must be between 0 and 100'
                });
            }
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

        // Prepare update data
        const updates = {};
        if (grade !== undefined) updates.grade = parseFloat(grade);
        if (feedback !== undefined) updates.feedback = feedback;

        const updatedSubmission = await Submission.update(id, updates);

        // Log the grading
        console.log(`✅ Submission ${id} graded by teacher ${req.user.username} (Grade: ${grade})`);

        res.status(200).json({
            success: true,
            message: 'Submission graded successfully',
            submission: {
                ...updatedSubmission,
                file_url: updatedSubmission.file_url ? 
                    `${req.protocol}://${req.get('host')}${updatedSubmission.file_url}` : 
                    null
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get submission statistics for a student
 * GET /api/submissions/me/stats
 * Authorization: Student only
 */
const getMySubmissionStats = async (req, res, next) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({
                error: 'Permission denied',
                message: 'Only students can view their submission statistics'
            });
        }

        const submissions = await Submission.findByStudent(req.user.id);
        
        const stats = {
            total_submissions: submissions.length,
            graded: submissions.filter(s => s.grade !== null).length,
            ungraded: submissions.filter(s => s.grade === null).length,
            average_grade: 0,
            best_grade: 0,
            worst_grade: 0,
            submissions_by_status: {
                pending: 0,
                graded: 0,
                late: 0
            }
        };

        const gradedSubmissions = submissions.filter(s => s.grade !== null);
        
        if (gradedSubmissions.length > 0) {
            const grades = gradedSubmissions.map(s => s.grade);
            stats.average_grade = grades.reduce((acc, g) => acc + g, 0) / grades.length;
            stats.best_grade = Math.max(...grades);
            stats.worst_grade = Math.min(...grades);
        }

        // Categorize submissions
        for (const submission of submissions) {
            const assignment = await Assignment.findById(submission.assignment_id);
            const now = new Date();
            const dueDate = new Date(assignment.due_date);
            
            if (submission.grade !== null) {
                stats.submissions_by_status.graded++;
            } else if (now > dueDate) {
                stats.submissions_by_status.late++;
            } else {
                stats.submissions_by_status.pending++;
            }
        }

        res.status(200).json({
            success: true,
            statistics: stats
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createSubmission,
    getMySubmissions,
    getSubmissionById,
    updateSubmission,
    deleteSubmission,
    getAssignmentSubmissions,
    gradeSubmission,
    getMySubmissionStats
};
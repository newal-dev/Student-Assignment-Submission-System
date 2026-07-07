/**
 * Handles all assignment operations with proper authorization
 * and includes filtering, pagination, and search functionality
 */

const { Assignment, Submission } = require('../models');
const { validationResult } = require('express-validator');

/**
 * Create a new assignment
 * POST /api/assignments
 * Authorization: Teacher only
 */
const createAssignment = async (req, res, next) => {
    try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { title, description, due_date } = req.body;
        
        // Double-check role (in case middleware was bypassed)
        if (req.user.role !== 'teacher') {
            return res.status(403).json({
                error: 'Permission denied',
                message: 'Only teachers can create assignments'
            });
        }

        // Validate due date is in the future
        const dueDateObj = new Date(due_date);
        const now = new Date();
        if (dueDateObj <= now) {
            return res.status(400).json({
                error: 'Invalid due date',
                message: 'Due date must be in the future'
            });
        }

        const assignment = await Assignment.create({
            title,
            description,
            due_date,
            teacher_id: req.user.id
        });

        // Log the creation for monitoring
        console.log(`📝 Assignment created by teacher ${req.user.username}: ${title}`);

        res.status(201).json({
            success: true,
            message: 'Assignment created successfully',
            assignment
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all assignments with filtering and search
 * GET /api/assignments
 * Authorization: Any authenticated user
 */
const getAllAssignments = async (req, res, next) => {
    try {
        // Parse query parameters for filtering
        const { 
            page = 1, 
            limit = 10, 
            search, 
            status, 
            teacher_id,
            sort_by = 'due_date',
            sort_order = 'ASC'
        } = req.query;

        // Build filter conditions
        const filters = {};
        
        // Search by title or description
        if (search) {
            filters.search = search;
        }
        
        // Filter by status (upcoming, past, all)
        if (status) {
            const now = new Date().toISOString().split('T')[0];
            if (status === 'upcoming') {
                filters.due_date_after = now;
            } else if (status === 'past') {
                filters.due_date_before = now;
            }
        }
        
        // Filter by specific teacher
        if (teacher_id) {
            filters.teacher_id = parseInt(teacher_id);
        }

        // Get assignments with filters
        const assignments = await Assignment.findAll(filters);

        // Apply sorting (in-memory for simplicity)
        // In production, you'd do this in the database
        const sortedAssignments = assignments.sort((a, b) => {
            if (sort_order.toUpperCase() === 'DESC') {
                return b[sort_by] > a[sort_by] ? 1 : -1;
            } else {
                return a[sort_by] > b[sort_by] ? 1 : -1;
            }
        });

        // Paginate results
        const startIndex = (parseInt(page) - 1) * parseInt(limit);
        const endIndex = startIndex + parseInt(limit);
        const paginatedResults = sortedAssignments.slice(startIndex, endIndex);

        // Get submission counts for each assignment (for teacher view)
        let assignmentsWithStats = paginatedResults;
        if (req.user.role === 'teacher') {
            // Teachers see submission counts
            assignmentsWithStats = await Promise.all(
                paginatedResults.map(async (assignment) => {
                    const submissions = await Submission.findByAssignment(assignment.id);
                    return {
                        ...assignment,
                        submission_count: submissions.length,
                        graded_count: submissions.filter(s => s.grade !== null).length
                    };
                })
            );
        } else {
            // Students see if they've submitted
            assignmentsWithStats = await Promise.all(
                paginatedResults.map(async (assignment) => {
                    const submissions = await Submission.findByAssignment(assignment.id);
                    const userSubmission = submissions.find(
                        s => s.student_id === req.user.id
                    );
                    return {
                        ...assignment,
                        submitted: !!userSubmission,
                        submission_id: userSubmission ? userSubmission.id : null,
                        grade: userSubmission ? userSubmission.grade : null
                    };
                })
            );
        }

        res.status(200).json({
            success: true,
            count: assignments.length,
            page: parseInt(page),
            limit: parseInt(limit),
            total_pages: Math.ceil(assignments.length / parseInt(limit)),
            assignments: assignmentsWithStats
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get assignment by ID with full details
 * GET /api/assignments/:id
 * Authorization: Any authenticated user
 */
const getAssignmentById = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Validate ID
        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({
                error: 'Invalid ID',
                message: 'Assignment ID must be a valid number'
            });
        }

        const assignment = await Assignment.findById(id);
        
        if (!assignment) {
            return res.status(404).json({
                error: 'Assignment not found',
                message: `Assignment with id ${id} does not exist`
            });
        }

        // Add role-specific data
        let additionalData = {};
        
        if (req.user.role === 'teacher') {
            // Teachers get submission statistics
            const submissions = await Submission.findByAssignment(id);
            additionalData = {
                submissions: submissions,
                submission_count: submissions.length,
                graded_count: submissions.filter(s => s.grade !== null).length,
                average_grade: submissions.length > 0 
                    ? submissions.reduce((acc, s) => acc + (s.grade || 0), 0) / submissions.length
                    : null
            };
        } else if (req.user.role === 'student') {
            // Students get their own submission status
            const submissions = await Submission.findByAssignment(id);
            const userSubmission = submissions.find(
                s => s.student_id === req.user.id
            );
            additionalData = {
                submitted: !!userSubmission,
                submission: userSubmission || null,
                can_submit: new Date(assignment.due_date) >= new Date()
            };
        }

        res.status(200).json({
            success: true,
            assignment: {
                ...assignment,
                ...additionalData
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update an assignment
 * PUT /api/assignments/:id
 * Authorization: Teacher who created it
 */
const updateAssignment = async (req, res, next) => {
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
        const { title, description, due_date } = req.body;

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
                message: `Assignment with id ${id} does not exist`
            });
        }

        // Authorization check: Only the teacher who created it can update
        if (assignment.teacher_id !== req.user.id) {
            return res.status(403).json({
                error: 'Permission denied',
                message: 'You can only update assignments you created',
                required_teacher_id: assignment.teacher_id,
                your_id: req.user.id
            });
        }

        // Validate due date if provided
        if (due_date) {
            const dueDateObj = new Date(due_date);
            const now = new Date();
            if (dueDateObj <= now) {
                return res.status(400).json({
                    error: 'Invalid due date',
                    message: 'Due date must be in the future'
                });
            }
        }

        // Prepare update data
        const updates = {};
        if (title !== undefined) updates.title = title;
        if (description !== undefined) updates.description = description;
        if (due_date !== undefined) updates.due_date = due_date;

        const updatedAssignment = await Assignment.update(id, updates);

        // Log the update
        console.log(`📝 Assignment ${id} updated by teacher ${req.user.username}`);

        res.status(200).json({
            success: true,
            message: 'Assignment updated successfully',
            assignment: updatedAssignment
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete an assignment
 * DELETE /api/assignments/:id
 * Authorization: Teacher who created it
 */
const deleteAssignment = async (req, res, next) => {
    try {
        const { id } = req.params;

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
                message: `Assignment with id ${id} does not exist`
            });
        }

        // Authorization check: Only the teacher who created it can delete
        if (assignment.teacher_id !== req.user.id) {
            return res.status(403).json({
                error: 'Permission denied',
                message: 'You can only delete assignments you created',
                required_teacher_id: assignment.teacher_id,
                your_id: req.user.id
            });
        }

        // Check if there are submissions before deleting
        const submissions = await Submission.findByAssignment(id);
        if (submissions.length > 0) {
            return res.status(400).json({
                error: 'Cannot delete assignment',
                message: `This assignment has ${submissions.length} submission(s). Delete them first or use force delete.`,
                submission_count: submissions.length
            });
        }

        await Assignment.delete(id);

        // Log the deletion
        console.log(`🗑️ Assignment ${id} deleted by teacher ${req.user.username}`);

        res.status(200).json({
            success: true,
            message: 'Assignment deleted successfully',
            assignment_id: parseInt(id)
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Force delete an assignment (with all submissions)
 * DELETE /api/assignments/:id/force
 * Authorization: Teacher who created it
 */
const forceDeleteAssignment = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Check if assignment exists
        const assignment = await Assignment.findById(id);
        if (!assignment) {
            return res.status(404).json({
                error: 'Assignment not found',
                message: `Assignment with id ${id} does not exist`
            });
        }

        // Authorization check
        if (assignment.teacher_id !== req.user.id) {
            return res.status(403).json({
                error: 'Permission denied',
                message: 'You can only delete assignments you created'
            });
        }

        // Get submissions count before deletion (for logging)
        const submissions = await Submission.findByAssignment(id);
        const submissionCount = submissions.length;

        // Delete assignment (submissions will be cascade deleted)
        await Assignment.delete(id);

        // Log the force deletion
        console.log(`🗑️ Assignment ${id} force deleted by teacher ${req.user.username} (${submissionCount} submissions removed)`);

        res.status(200).json({
            success: true,
            message: 'Assignment and all submissions deleted successfully',
            assignment_id: parseInt(id),
            submissions_deleted: submissionCount
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get assignment statistics (for teachers)
 * GET /api/assignments/statistics
 * Authorization: Teacher only
 */
const getAssignmentStatistics = async (req, res, next) => {
    try {
        // Only teachers can access statistics
        if (req.user.role !== 'teacher') {
            return res.status(403).json({
                error: 'Permission denied',
                message: 'Only teachers can view statistics'
            });
        }

        // Get all assignments for this teacher
        const assignments = await Assignment.findByTeacher(req.user.id);
        
        // Calculate statistics
        const stats = {
            total_assignments: assignments.length,
            completed_assignments: assignments.filter(a => new Date(a.due_date) < new Date()).length,
            upcoming_assignments: assignments.filter(a => new Date(a.due_date) >= new Date()).length,
            assignments_by_month: {},
            submissions_stats: {
                total: 0,
                graded: 0,
                average_grade: 0,
                by_assignment: []
            }
        };

        // Get submission stats for each assignment
        let totalGrade = 0;
        let gradedCount = 0;

        for (const assignment of assignments) {
            const submissions = await Submission.findByAssignment(assignment.id);
            
            // Month grouping
            const month = new Date(assignment.created_at).toLocaleString('default', { month: 'long' });
            stats.assignments_by_month[month] = (stats.assignments_by_month[month] || 0) + 1;

            // Submission stats
            const graded = submissions.filter(s => s.grade !== null);
            const avgGrade = graded.length > 0 
                ? graded.reduce((acc, s) => acc + s.grade, 0) / graded.length
                : 0;

            stats.submissions_stats.total += submissions.length;
            stats.submissions_stats.graded += graded.length;
            
            if (graded.length > 0) {
                totalGrade += avgGrade * graded.length;
                gradedCount += graded.length;
            }

            stats.submissions_stats.by_assignment.push({
                assignment_id: assignment.id,
                title: assignment.title,
                total_submissions: submissions.length,
                graded_count: graded.length,
                average_grade: avgGrade,
                due_date: assignment.due_date
            });
        }

        stats.submissions_stats.average_grade = gradedCount > 0 ? totalGrade / gradedCount : 0;

        res.status(200).json({
            success: true,
            statistics: stats
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createAssignment,
    getAllAssignments,
    getAssignmentById,
    updateAssignment,
    deleteAssignment,
    forceDeleteAssignment,
    getAssignmentStatistics
};
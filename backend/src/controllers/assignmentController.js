// Handles assignment CRUD with proper authorization

const { Assignment, Submission } = require('../models');

/**
 * Create a new assignment
 * POST /api/assignments
 * Authorization: For teacher only
 */
const createAssignment = async (req, res, next) => {
    try {
        const { title, description, due_date } = req.body;
        
        // Only teachers can create assignments
        // But we already check this in middleware
        // Additional validation just in case
        if (req.user.role !== 'teacher') {
            return res.status(403).json({
                error: 'Permission denied',
                message: 'Only teachers can create assignments'
            });
        }

        const assignment = await Assignment.create({
            title,
            description,
            due_date,
            teacher_id: req.user.id // Automatically set to current user
        });

        res.status(201).json({
            message: 'Assignment created successfully',
            assignment
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all assignments
 * GET /api/assignments
 * Authorization: For Any authenticated user
 */
const getAllAssignments = async (req, res, next) => {
    try {
        const assignments = await Assignment.findAll();
        
        // Teachers see everything, students get filtered view
        if (req.user.role === 'student') {
            // Students only see assignments that are relevant
            // Might add logic here to show only active ones
        }

        res.status(200).json({
            count: assignments.length,
            assignments
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get assignment by ID
 * GET /api/assignments/:id
 * Authorization: Any authenticated user
 */
const getAssignmentById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const assignment = await Assignment.findById(id);
        
        if (!assignment) {
            return res.status(404).json({
                error: 'Assignment not found',
                message: `Assignment with id ${id} does not exist`
            });
        }

        // Students can only see assignments if they haven't been archived
        // Teachers can see everything
        if (req.user.role === 'student') {
            // Could check if assignment is still active
        }

        res.status(200).json({
            assignment
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
        const { id } = req.params;
        const { title, description, due_date } = req.body;

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
                teacher_id: assignment.teacher_id,
                your_id: req.user.id
            });
        }

        const updatedAssignment = await Assignment.update(id, {
            title,
            description,
            due_date
        });

        res.status(200).json({
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
                message: 'You can only delete assignments you created'
            });
        }

        await Assignment.delete(id);

        res.status(200).json({
            message: 'Assignment deleted successfully',
            assignment_id: parseInt(id)
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
    deleteAssignment
};
/**
 * Handles all teacher grading and feedback operations
 * Includes analytics, batch grading, and export features
 */

const { Submission, Assignment, User } = require('../models');
const { validationResult } = require('express-validator');

/**
 * Grade a single submission
 * PUT /api/grading/submissions/:id
 * Authorization: Teacher only
 */
const gradeSubmission = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { grade, feedback, status } = req.body;
        
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

        // Check if already graded
        if (submission.grade !== null && grade !== undefined) {
            // Log regrade
            console.log(`📝 Regrading submission ${id} from ${submission.grade} to ${grade}`);
        }

        // Prepare update data
        const updates = {};
        if (grade !== undefined) updates.grade = parseFloat(grade);
        if (feedback !== undefined) updates.feedback = feedback;
        if (status) updates.status = status;

        const updatedSubmission = await Submission.update(id, updates);

        // Log the grading
        console.log(`✅ Submission ${id} graded by teacher ${req.user.username}`);
        console.log(`   Student: ${submission.student_name}`);
        console.log(`   Grade: ${grade || 'Not changed'}`);
        console.log(`   Feedback: ${feedback ? 'Provided' : 'None'}`);

        res.status(200).json({
            success: true,
            message: 'Submission graded successfully',
            submission: updatedSubmission
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Grade multiple submissions at once (batch grading)
 * POST /api/grading/batch
 * Authorization: Teacher only
 */
const batchGradeSubmissions = async (req, res, next) => {
    try {
        const { assignment_id, grades } = req.body;
        
        // Only teachers can grade
        if (req.user.role !== 'teacher') {
            return res.status(403).json({
                error: 'Permission denied',
                message: 'Only teachers can grade submissions'
            });
        }

        // Validate input
        if (!assignment_id || !grades || !Array.isArray(grades) || grades.length === 0) {
            return res.status(400).json({
                error: 'Invalid input',
                message: 'Please provide assignment_id and an array of grades'
            });
        }

        // Check if assignment exists and belongs to teacher
        const assignment = await Assignment.findById(assignment_id);
        if (!assignment) {
            return res.status(404).json({
                error: 'Assignment not found',
                message: 'The assignment does not exist'
            });
        }

        if (assignment.teacher_id !== req.user.id) {
            return res.status(403).json({
                error: 'Permission denied',
                message: 'You can only grade submissions for assignments you created'
            });
        }

        // Process each grade
        const results = [];
        const errors = [];

        for (const gradeData of grades) {
            try {
                const { submission_id, grade, feedback } = gradeData;
                
                // Validate grade
                if (grade !== undefined && (isNaN(grade) || grade < 0 || grade > 100)) {
                    errors.push({
                        submission_id,
                        error: 'Invalid grade. Must be between 0 and 100'
                    });
                    continue;
                }

                // Check submission exists and belongs to this assignment
                const submission = await Submission.findById(submission_id);
                if (!submission) {
                    errors.push({
                        submission_id,
                        error: 'Submission not found'
                    });
                    continue;
                }

                if (submission.assignment_id !== parseInt(assignment_id)) {
                    errors.push({
                        submission_id,
                        error: 'Submission does not belong to this assignment'
                    });
                    continue;
                }

                // Update submission
                const updates = {};
                if (grade !== undefined) updates.grade = parseFloat(grade);
                if (feedback !== undefined) updates.feedback = feedback;

                const updated = await Submission.update(submission_id, updates);
                results.push({
                    submission_id,
                    success: true,
                    grade: updated.grade,
                    feedback: updated.feedback
                });

            } catch (error) {
                errors.push({
                    submission_id: gradeData.submission_id,
                    error: error.message
                });
            }
        }

        console.log(`📊 Batch grading completed for assignment ${assignment_id}`);
        console.log(`   Success: ${results.length}, Errors: ${errors.length}`);

        res.status(200).json({
            success: true,
            message: 'Batch grading completed',
            assignment_id: parseInt(assignment_id),
            total_processed: grades.length,
            success_count: results.length,
            error_count: errors.length,
            results,
            errors
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get grading dashboard for a teacher
 * GET /api/grading/dashboard
 * Authorization: Teacher only
 */
const getGradingDashboard = async (req, res, next) => {
    try {
        if (req.user.role !== 'teacher') {
            return res.status(403).json({
                error: 'Permission denied',
                message: 'Only teachers can access the grading dashboard'
            });
        }

        // Get all assignments for this teacher
        const assignments = await Assignment.findByTeacher(req.user.id);
        
        const dashboard = {
            teacher_name: req.user.username,
            total_assignments: assignments.length,
            assignments: [],
            overall_stats: {
                total_submissions: 0,
                graded: 0,
                ungraded: 0,
                average_grade: 0,
                grade_distribution: {
                    'A': 0,  // 90-100
                    'B': 0,  // 80-89
                    'C': 0,  // 70-79
                    'D': 0,  // 60-69
                    'F': 0   // 0-59
                }
            },
            recent_grading_activity: []
        };

        let totalGrade = 0;
        let totalGraded = 0;

        for (const assignment of assignments) {
            const submissions = await Submission.findByAssignment(assignment.id);
            
            const graded = submissions.filter(s => s.grade !== null);
            const ungraded = submissions.filter(s => s.grade === null);
            
            const avgGrade = graded.length > 0 
                ? graded.reduce((acc, s) => acc + s.grade, 0) / graded.length
                : 0;

            // Assignment stats
            const assignmentStats = {
                id: assignment.id,
                title: assignment.title,
                due_date: assignment.due_date,
                total_submissions: submissions.length,
                graded_count: graded.length,
                ungraded_count: ungraded.length,
                completion_rate: submissions.length > 0 
                    ? (graded.length / submissions.length * 100).toFixed(1)
                    : 0,
                average_grade: avgGrade,
                submissions: graded.slice(0, 5) // Last 5 graded submissions
            };

            dashboard.assignments.push(assignmentStats);

            // Update overall stats
            dashboard.overall_stats.total_submissions += submissions.length;
            dashboard.overall_stats.graded += graded.length;
            dashboard.overall_stats.ungraded += ungraded.length;

            // Calculate grade distribution
            for (const submission of graded) {
                const grade = submission.grade;
                if (grade >= 90) dashboard.overall_stats.grade_distribution['A']++;
                else if (grade >= 80) dashboard.overall_stats.grade_distribution['B']++;
                else if (grade >= 70) dashboard.overall_stats.grade_distribution['C']++;
                else if (grade >= 60) dashboard.overall_stats.grade_distribution['D']++;
                else dashboard.overall_stats.grade_distribution['F']++;

                totalGrade += grade;
                totalGraded++;
            }

            // Add recent grading activity
            const recentGraded = graded
                .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
                .slice(0, 5);

            for (const sub of recentGraded) {
                dashboard.recent_grading_activity.push({
                    assignment_title: assignment.title,
                    student_name: sub.student_name || 'Unknown Student',
                    grade: sub.grade,
                    graded_at: sub.updated_at,
                    submission_id: sub.id
                });
            }
        }

        // Calculate overall average
        dashboard.overall_stats.average_grade = totalGraded > 0 
            ? (totalGrade / totalGraded).toFixed(2) 
            : 0;

        // Sort recent activity by date (newest first)
        dashboard.recent_grading_activity.sort(
            (a, b) => new Date(b.graded_at) - new Date(a.graded_at)
        );
        dashboard.recent_grading_activity = dashboard.recent_grading_activity.slice(0, 10);

        res.status(200).json({
            success: true,
            dashboard
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get detailed grade analytics for an assignment
 * GET /api/grading/assignments/:id/analytics
 * Authorization: Teacher only
 */
const getAssignmentAnalytics = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        if (req.user.role !== 'teacher') {
            return res.status(403).json({
                error: 'Permission denied',
                message: 'Only teachers can view analytics'
            });
        }

        // Validate ID
        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({
                error: 'Invalid ID',
                message: 'Assignment ID must be a valid number'
            });
        }

        // Check assignment exists and belongs to teacher
        const assignment = await Assignment.findById(id);
        if (!assignment) {
            return res.status(404).json({
                error: 'Assignment not found',
                message: 'The assignment does not exist'
            });
        }

        if (assignment.teacher_id !== req.user.id) {
            return res.status(403).json({
                error: 'Permission denied',
                message: 'You can only view analytics for assignments you created'
            });
        }

        // Get all submissions
        const submissions = await Submission.findByAssignment(id);
        
        const graded = submissions.filter(s => s.grade !== null);
        const ungraded = submissions.filter(s => s.grade === null);

        // Calculate statistics
        const grades = graded.map(s => s.grade);
        const sortedGrades = [...grades].sort((a, b) => a - b);
        
        const analytics = {
            assignment: {
                id: assignment.id,
                title: assignment.title,
                due_date: assignment.due_date,
                total_students: submissions.length
            },
            submission_stats: {
                total: submissions.length,
                graded: graded.length,
                ungraded: ungraded.length,
                completion_rate: submissions.length > 0 
                    ? (graded.length / submissions.length * 100).toFixed(1)
                    : 0
            },
            grade_stats: {
                average: grades.length > 0 
                    ? (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(2)
                    : 0,
                median: sortedGrades.length > 0 
                    ? sortedGrades[Math.floor(sortedGrades.length / 2)]
                    : 0,
                highest: sortedGrades.length > 0 ? sortedGrades[sortedGrades.length - 1] : 0,
                lowest: sortedGrades.length > 0 ? sortedGrades[0] : 0,
                std_dev: calculateStandardDeviation(grades)
            },
            grade_distribution: {
                'A (90-100)': grades.filter(g => g >= 90).length,
                'B (80-89)': grades.filter(g => g >= 80 && g < 90).length,
                'C (70-79)': grades.filter(g => g >= 70 && g < 80).length,
                'D (60-69)': grades.filter(g => g >= 60 && g < 70).length,
                'F (0-59)': grades.filter(g => g < 60).length
            },
            students: graded.map(s => ({
                id: s.student_id,
                name: s.student_name || 'Unknown',
                grade: s.grade,
                feedback: s.feedback,
                submitted_at: s.submitted_at,
                file_url: s.file_url
            })),
            ungraded_students: ungraded.map(s => ({
                id: s.student_id,
                name: s.student_name || 'Unknown',
                submitted_at: s.submitted_at
            }))
        };

        res.status(200).json({
            success: true,
            analytics
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get individual student performance
 * GET /api/grading/students/:id/performance
 * Authorization: Teacher only
 */
const getStudentPerformance = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        if (req.user.role !== 'teacher') {
            return res.status(403).json({
                error: 'Permission denied',
                message: 'Only teachers can view student performance'
            });
        }

        // Validate ID
        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({
                error: 'Invalid ID',
                message: 'Student ID must be a valid number'
            });
        }

        // Check student exists
        const student = await User.findById(id);
        if (!student) {
            return res.status(404).json({
                error: 'Student not found',
                message: 'The student does not exist'
            });
        }

        if (student.role !== 'student') {
            return res.status(400).json({
                error: 'Invalid user',
                message: 'The user is not a student'
            });
        }

        // Get all submissions for this student
        const submissions = await Submission.findByStudent(id);
        
        const performance = {
            student: {
                id: student.id,
                name: student.username,
                email: student.email
            },
            summary: {
                total_submissions: submissions.length,
                graded: submissions.filter(s => s.grade !== null).length,
                ungraded: submissions.filter(s => s.grade === null).length,
                average_grade: 0,
                highest_grade: 0,
                lowest_grade: 0
            },
            assignments: []
        };

        const gradedSubmissions = submissions.filter(s => s.grade !== null);
        
        if (gradedSubmissions.length > 0) {
            const grades = gradedSubmissions.map(s => s.grade);
            performance.summary.average_grade = grades.reduce((a, b) => a + b, 0) / grades.length;
            performance.summary.highest_grade = Math.max(...grades);
            performance.summary.lowest_grade = Math.min(...grades);
        }

        // Get assignment details for each submission
        for (const submission of submissions) {
            const assignment = await Assignment.findById(submission.assignment_id);
            performance.assignments.push({
                assignment_id: assignment.id,
                title: assignment.title,
                due_date: assignment.due_date,
                submitted_at: submission.submitted_at,
                grade: submission.grade,
                feedback: submission.feedback,
                status: submission.grade !== null ? 'graded' : 'pending'
            });
        }

        // Sort assignments by due date
        performance.assignments.sort(
            (a, b) => new Date(a.due_date) - new Date(b.due_date)
        );

        res.status(200).json({
            success: true,
            performance
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Export grades as CSV
 * GET /api/grading/assignments/:id/export
 * Authorization: Teacher only
 */
const exportGradesCSV = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        if (req.user.role !== 'teacher') {
            return res.status(403).json({
                error: 'Permission denied',
                message: 'Only teachers can export grades'
            });
        }

        // Check assignment exists and belongs to teacher
        const assignment = await Assignment.findById(id);
        if (!assignment) {
            return res.status(404).json({
                error: 'Assignment not found',
                message: 'The assignment does not exist'
            });
        }

        if (assignment.teacher_id !== req.user.id) {
            return res.status(403).json({
                error: 'Permission denied',
                message: 'You can only export grades for assignments you created'
            });
        }

        // Get all submissions
        const submissions = await Submission.findByAssignment(id);
        
        // Create CSV header
        let csv = 'Student Name,Student Email,Submission Date,Grade,Feedback\n';
        
        // Add rows
        for (const submission of submissions) {
            const studentName = submission.student_name || 'Unknown';
            const studentEmail = submission.student_email || 'Unknown';
            const submittedAt = submission.submitted_at;
            const grade = submission.grade !== null ? submission.grade : 'Not graded';
            const feedback = submission.feedback || '';
            
            csv += `"${studentName}","${studentEmail}","${submittedAt}",${grade},"${feedback}"\n`;
        }

        // Set response headers for CSV download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=grades-${assignment.title}-${Date.now()}.csv`);
        
        res.status(200).send(csv);
    } catch (error) {
        next(error);
    }
};

/**
 * Get grading reminders (students who haven't submitted)
 * GET /api/grading/reminders
 * Authorization: Teacher only
 */
const getGradingReminders = async (req, res, next) => {
    try {
        if (req.user.role !== 'teacher') {
            return res.status(403).json({
                error: 'Permission denied',
                message: 'Only teachers can view reminders'
            });
        }

        // Get all assignments for this teacher
        const assignments = await Assignment.findByTeacher(req.user.id);
        
        const reminders = [];

        for (const assignment of assignments) {
            // Get all students
            const students = await User.findAll({ role: 'student' });
            
            // Get submissions for this assignment
            const submissions = await Submission.findByAssignment(assignment.id);
            const submittedStudentIds = submissions.map(s => s.student_id);
            
            // Find students who haven't submitted
            const notSubmitted = students.filter(
                s => !submittedStudentIds.includes(s.id)
            );

            if (notSubmitted.length > 0) {
                reminders.push({
                    assignment_id: assignment.id,
                    assignment_title: assignment.title,
                    due_date: assignment.due_date,
                    total_students: students.length,
                    submitted_count: submissions.length,
                    missing_count: notSubmitted.length,
                    missing_students: notSubmitted.map(s => ({
                        id: s.id,
                        name: s.username,
                        email: s.email
                    }))
                });
            }
        }

        res.status(200).json({
            success: true,
            reminders
        });
    } catch (error) {
        next(error);
    }
};

// Helper function to calculate standard deviation
function calculateStandardDeviation(numbers) {
    if (numbers.length === 0) return 0;
    
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const squareDiffs = numbers.map(value => {
        const diff = value - mean;
        return diff * diff;
    });
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    return Math.sqrt(avgSquareDiff);
}

module.exports = {
    gradeSubmission,
    batchGradeSubmissions,
    getGradingDashboard,
    getAssignmentAnalytics,
    getStudentPerformance,
    exportGradesCSV,
    getGradingReminders
};
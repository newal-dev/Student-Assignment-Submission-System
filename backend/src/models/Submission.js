// Handles all database operations for student submissions

const pool = require('../config/database');

class Submission {
    // Create a new submission (but only role: students can submit)
    static async create({ assignment_id, student_id, content, file_url }) {
        try {
            // Check if student already submitted this assignment
            const existing = await pool.query(
                'SELECT id FROM submissions WHERE assignment_id = $1 AND student_id = $2',
                [assignment_id, student_id]
            );

            if (existing.rows.length > 0) {
                throw new Error('You have already submitted this assignment');
            }

            const result = await pool.query(
                `INSERT INTO submissions (assignment_id, student_id, content, file_url)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id, assignment_id, student_id, content, file_url, submitted_at, updated_at`,
                [assignment_id, student_id, content, file_url]
            );
            return result.rows[0];
        } catch (error) {
            throw new Error(`Error creating submission: ${error.message}`);
        }
    }

    /**
     * Update a submission
     * Students can update their submission before deadline
     * Teachers can add grades and feedback
     */
    static async update(id, updates) {
        try {
            const allowedUpdates = ['content', 'file_url', 'grade', 'feedback'];
            const updateFields = [];
            const values = [];
            let paramCount = 1;

            for (const [key, value] of Object.entries(updates)) {
                if (allowedUpdates.includes(key)) {
                    updateFields.push(`${key} = $${paramCount}`);
                    values.push(value);
                    paramCount++;
                }
            }

            if (updateFields.length === 0) {
                throw new Error('No valid fields to update');
            }

            values.push(id);
            const query = `
                UPDATE submissions 
                SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $${paramCount}
                RETURNING id, assignment_id, student_id, content, file_url, grade, feedback, submitted_at, updated_at
            `;

            const result = await pool.query(query, values);
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Error updating submission: ${error.message}`);
        }
    }

    /**
     * Get all submissions for a specific given assignment
     * Teachers use this to view and grade submissions
     */
    static async findByAssignment(assignmentId) {
        try {
            const result = await pool.query(
                `SELECT s.*, 
                        u.username as student_name,
                        u.email as student_email,
                        a.title as assignment_title
                 FROM submissions s
                 LEFT JOIN users u ON s.student_id = u.id
                 LEFT JOIN assignments a ON s.assignment_id = a.id
                 WHERE s.assignment_id = $1
                 ORDER BY s.submitted_at DESC`,
                [assignmentId]
            );
            return result.rows;
        } catch (error) {
            throw new Error(`Error fetching submissions for assignment: ${error.message}`);
        }
    }

    // Get a student's submissions and students can see their own submissions
    static async findByStudent(studentId) {
        try {
            const result = await pool.query(
                `SELECT s.*, 
                        a.title as assignment_title,
                        a.due_date as assignment_due_date,
                        a.teacher_id,
                        u.username as teacher_name
                 FROM submissions s
                 LEFT JOIN assignments a ON s.assignment_id = a.id
                 LEFT JOIN users u ON a.teacher_id = u.id
                 WHERE s.student_id = $1
                 ORDER BY s.submitted_at DESC`,
                [studentId]
            );
            return result.rows;
        } catch (error) {
            throw new Error(`Error fetching student's submissions: ${error.message}`);
        }
    }

    // Get a single submission by ID for viewing
    static async findById(id) {
        try {
            const result = await pool.query(
                `SELECT s.*, 
                        u.username as student_name,
                        u.email as student_email,
                        a.title as assignment_title,
                        a.due_date as assignment_due_date
                 FROM submissions s
                 LEFT JOIN users u ON s.student_id = u.id
                 LEFT JOIN assignments a ON s.assignment_id = a.id
                 WHERE s.id = $1`,
                [id]
            );
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Error finding submission: ${error.message}`);
        }
    }

    // Delete a submission but before the deadline
    static async delete(id) {
        try {
            const result = await pool.query(
                'DELETE FROM submissions WHERE id = $1 RETURNING id',
                [id]
            );
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Error deleting submission: ${error.message}`);
        }
    }
}

module.exports = Submission;
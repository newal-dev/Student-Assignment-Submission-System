// Handles all database operations for assignments

const pool = require('../config/database');

class Assignment {
    // Create a new assignment
    static async create({ title, description, due_date, teacher_id }) {
        try {
            const result = await pool.query(
                `INSERT INTO assignments (title, description, due_date, teacher_id)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id, title, description, due_date, teacher_id, created_at, updated_at`,
                [title, description, due_date, teacher_id]
            );
            return result.rows[0];
        } catch (error) {
            throw new Error(`Error creating assignment: ${error.message}`);
        }
    }

    // Get all assignments
    static async findAll() {
        try {
            const result = await pool.query(
                `SELECT a.*, 
                        u.username as teacher_name,
                        u.email as teacher_email
                 FROM assignments a
                 LEFT JOIN users u ON a.teacher_id = u.id
                 ORDER BY a.due_date ASC`
            );
            return result.rows;
        } catch (error) {
            throw new Error(`Error fetching assignments: ${error.message}`);
        }
    }

    // Find an assignment by ID
    static async findById(id) {
        try {
            const result = await pool.query(
                `SELECT a.*, 
                        u.username as teacher_name,
                        u.email as teacher_email
                 FROM assignments a
                 LEFT JOIN users u ON a.teacher_id = u.id
                 WHERE a.id = $1`,
                [id]
            );
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Error finding assignment: ${error.message}`);
        }
    }

    // Get all assignments created by a specific teacher
    static async findByTeacher(teacherId) {
        try {
            const result = await pool.query(
                `SELECT a.*, 
                        u.username as teacher_name,
                        u.email as teacher_email
                 FROM assignments a
                 LEFT JOIN users u ON a.teacher_id = u.id
                 WHERE a.teacher_id = $1
                 ORDER BY a.due_date ASC`,
                [teacherId]
            );
            return result.rows;
        } catch (error) {
            throw new Error(`Error fetching teacher's assignments: ${error.message}`);
        }
    }

    // Update an assignment but only the teacher who created it can update it
    static async update(id, updates) {
        try {
            const allowedUpdates = ['title', 'description', 'due_date'];
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
                UPDATE assignments 
                SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $${paramCount}
                RETURNING id, title, description, due_date, teacher_id, created_at, updated_at
            `;

            const result = await pool.query(query, values);
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Error updating assignment: ${error.message}`);
        }
    }

    // Delete an assignment on cascade
    static async delete(id) {
        try {
            const result = await pool.query(
                'DELETE FROM assignments WHERE id = $1 RETURNING id',
                [id]
            );
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Error deleting assignment: ${error.message}`);
        }
    }
}

module.exports = Assignment;
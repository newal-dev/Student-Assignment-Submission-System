//Handles all database operations for users

const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
    // for login and authentication by email
    static async findByEmail(email) {
        try {
            const result = await pool.query(
                'SELECT * FROM users WHERE email = $1',
                [email]
            );
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Error finding user by email: ${error.message}`);
        }
    }

    // for retrieving user details by ID
    static async findById(id) {
        try {
            const result = await pool.query(
                'SELECT id, username, email, role, created_at FROM users WHERE id = $1',
                [id]
            );
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Error finding user by id: ${error.message}`);
        }
    }

    // create new user and hash the password for privacy reasons
    static async create({ username, email, password, role = 'student' }) {
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            
            const result = await pool.query(
                `INSERT INTO users (username, email, password_hash, role)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id, username, email, role, created_at`,
                [username, email, hashedPassword, role]
            );
            
            return result.rows[0];
        } catch (error) {
            // duplicate key violations
            if (error.code === '23505') { // PostgreSQL unique violation code
                if (error.constraint === 'users_username_key') {
                    throw new Error('Username already exists');
                }
                // duplicate email
                if (error.constraint === 'users_email_key') {
                    throw new Error('Email already exists');
                }
            }
            throw new Error(`Error creating user: ${error.message}`);
        }
    }

    // compare entered plaian text password with the stored hash
    static async verifyPassword(plainPassword, hashedPassword) {
        try {
            return await bcrypt.compare(plainPassword, hashedPassword);
        } catch (error) {
            throw new Error(`Error verifying password: ${error.message}`);
        }
    }

    // update function
    static async update(id, updates) {
        try {
            const allowedUpdates = ['username', 'email'];
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
                UPDATE users 
                SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $${paramCount}
                RETURNING id, username, email, role, created_at, updated_at
            `;

            const result = await pool.query(query, values);
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Error updating user: ${error.message}`);
        }
    }

    // to change password
    static async changePassword(id, newPassword) {
        try {
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            
            const result = await pool.query(
                `UPDATE users 
                 SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2
                 RETURNING id, username, email, role`,
                [hashedPassword, id]
            );
            
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Error changing password: ${error.message}`);
        }
    }
}

module.exports = User;
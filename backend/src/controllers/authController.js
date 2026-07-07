// Authentication Controller to handles user registration, login, and profile management
const { User } = require('../models');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

// Generate JWT token for authenticated user containing the user ID and role
const generateToken = (user) => {
    return jwt.sign(
        { 
            id: user.id, 
            email: user.email, 
            role: user.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

/**
 * Register a new user
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
    try {
        // Validate request body
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { username, email, password, role = 'student' } = req.body;

        // Check if password meets minimum requirements
        if (password.length < 6) {
            return res.status(400).json({
                error: 'Validation failed',
                message: 'Password must be at least 6 characters long'
            });
        }

        // Create user (password gets hashed in our model)
        const newUser = await User.create({
            username,
            email,
            password,
            role
        });

        // Generate JWT token for immediate login
        const token = generateToken(newUser);

        // Return user info and token
        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role,
                created_at: newUser.created_at
            },
            token
        });
    } catch (error) {
        // Pass to global error handler
        next(error);
    }
};

/**
 * Login user
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
    try {
        // Validate request body
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { email, password } = req.body;

        // Find user by email
        const user = await User.findByEmail(email);
        
        if (!user) {
            return res.status(401).json({
                error: 'Invalid credentials',
                message: 'Email or password is incorrect'
            });
        }

        // Verify password
        const isValidPassword = await User.verifyPassword(password, user.password_hash);
        
        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Invalid credentials',
                message: 'Email or password is incorrect'
            });
        }

        // Generate JWT token
        const token = generateToken(user);

        // Don't send password_hash to client
        const { password_hash, ...userWithoutPassword } = user;

        res.status(200).json({
            message: 'Login successful',
            user: userWithoutPassword,
            token
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get current user profile
 * GET /api/auth/profile
 */
const getProfile = async (req, res, next) => {
    try {
        // User is already attached by authenticate middleware
        res.status(200).json({
            user: req.user
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update user profile
 * PUT /api/auth/profile
 */
const updateProfile = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { username, email } = req.body;
        const userId = req.user.id;

        // Only allow updating certain fields
        const updates = {};
        if (username) updates.username = username;
        if (email) updates.email = email;

        const updatedUser = await User.update(userId, updates);
        
        if (!updatedUser) {
            return res.status(404).json({
                error: 'User not found',
                message: 'Could not update profile'
            });
        }

        res.status(200).json({
            message: 'Profile updated successfully',
            user: updatedUser
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Change password
 * PUT /api/auth/change-password
 */
const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Validate input
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                error: 'Missing fields',
                message: 'Current password and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                error: 'Validation failed',
                message: 'New password must be at least 6 characters long'
            });
        }

        // Get user with password_hash
        const user = await User.findByEmail(req.user.email);
        
        // Verify current password
        const isValidPassword = await User.verifyPassword(currentPassword, user.password_hash);
        
        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Invalid password',
                message: 'Current password is incorrect'
            });
        }

        // Update password
        const updatedUser = await User.changePassword(req.user.id, newPassword);
        
        if (!updatedUser) {
            return res.status(404).json({
                error: 'User not found',
                message: 'Could not update password'
            });
        }

        res.status(200).json({
            message: 'Password updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Logout (client-side only) by removing token
 * It's stateless so server doesn't do anything
 * POST /api/auth/logout
 */
const logout = (req, res) => {
    res.status(200).json({
        message: 'Logout successful',
        instructions: 'Remove the token from client storage'
    });
};

module.exports = {
    register,
    login,
    getProfile,
    updateProfile,
    changePassword,
    logout
};
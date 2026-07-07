// Defines validation rules for all endpoints

const { body, param, query } = require('express-validator');

// Auth validation rules
const validateRegister = [
    body('username')
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage('Username must be between 3 and 50 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
    
    body('email')
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),
    
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
        .withMessage('Password must contain at least one letter and one number'),
    
    body('role')
        .optional()
        .isIn(['student', 'teacher'])
        .withMessage('Role must be either student or teacher')
];

const validateLogin = [
    body('email')
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),
    
    body('password')
        .notEmpty()
        .withMessage('Password is required')
];

// Assignment validation rules
const validateAssignment = [
    body('title')
        .trim()
        .isLength({ min: 3, max: 255 })
        .withMessage('Title must be between 3 and 255 characters'),
    
    body('description')
        .optional()
        .trim(),
    
    body('due_date')
        .isISO8601()
        .withMessage('Due date must be a valid date')
        .toDate()
];

// Submission validation rules
const validateSubmission = [
    body('content')
        .optional()
        .trim()
        .isLength({ min: 1, max: 10000 })
        .withMessage('Content must be between 1 and 10000 characters'),
    
    body('file_url')
        .optional()
        .isURL()
        .withMessage('File URL must be a valid URL')
];

module.exports = {
    validateRegister,
    validateLogin,
    validateAssignment,
    validateSubmission
};
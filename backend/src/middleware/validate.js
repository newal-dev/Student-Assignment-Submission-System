// Centralized validation with detailed error messages

const { validationResult, body, param, query } = require('express-validator');

// Check validation results and return formatted errors
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    
    if (errors.isEmpty()) {
        return next();
    }

    // Format errors for better readability
    const formattedErrors = errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
    }));

    // Log validation errors
    console.warn('Validation Error:', {
        path: req.path,
        method: req.method,
        errors: formattedErrors,
        body: req.body,
        query: req.query,
        params: req.params
    });

    return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: formattedErrors
    });
};

/**
 * Custom validation rules
 */
const validationRules = {
    // User validation
    username: body('username')
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage('Username must be between 3 and 50 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores')
        .escape(),

    email: body('email')
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail()
        .escape(),

    password: body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
        .withMessage('Password must contain at least one letter and one number'),

    // Assignment validation
    title: body('title')
        .trim()
        .isLength({ min: 3, max: 255 })
        .withMessage('Title must be between 3 and 255 characters')
        .escape(),

    description: body('description')
        .optional()
        .trim()
        .escape(),

    due_date: body('due_date')
        .isISO8601()
        .withMessage('Due date must be a valid date')
        .custom(value => {
            const date = new Date(value);
            const now = new Date();
            if (date <= now) {
                throw new Error('Due date must be in the future');
            }
            return true;
        }),

    // Submission validation
    content: body('content')
        .optional()
        .trim()
        .isLength({ min: 1, max: 10000 })
        .withMessage('Content must be between 1 and 10000 characters')
        .escape(),

    file_url: body('file_url')
        .optional()
        .isURL()
        .withMessage('File URL must be a valid URL'),

    // Grade validation
    grade: body('grade')
        .optional()
        .isFloat({ min: 0, max: 100 })
        .withMessage('Grade must be between 0 and 100'),
};

/**
 * Validation schemas for different endpoints
 */
const validate = {
    // Auth validations
    register: [
        validationRules.username,
        validationRules.email,
        validationRules.password,
        body('role')
            .optional()
            .isIn(['student', 'teacher'])
            .withMessage('Role must be either student or teacher')
    ],

    login: [
        validationRules.email,
        body('password')
            .notEmpty()
            .withMessage('Password is required')
    ],

    // Assignment validations
    createAssignment: [
        validationRules.title,
        validationRules.description,
        validationRules.due_date
    ],

    updateAssignment: [
        validationRules.title.optional(),
        validationRules.description.optional(),
        validationRules.due_date.optional()
    ],

    // Submission validations
    createSubmission: [
        body('assignment_id')
            .isInt({ min: 1 })
            .withMessage('Valid assignment ID is required'),
        validationRules.content,
        validationRules.file_url
    ],

    updateSubmission: [
        validationRules.content.optional(),
        validationRules.file_url.optional()
    ],

    // Grading validations
    gradeSubmission: [
        validationRules.grade,
        body('feedback')
            .optional()
            .trim()
            .isLength({ max: 1000 })
            .withMessage('Feedback must be less than 1000 characters')
            .escape()
    ],

    // ID parameter validation
    idParam: [
        param('id')
            .isInt({ min: 1 })
            .withMessage('Invalid ID format')
    ],

    // Pagination validation
    pagination: [
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Page must be a positive integer')
            .toInt(),
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Limit must be between 1 and 100')
            .toInt()
    ],

    // Filter validation
    filters: [
        query('status')
            .optional()
            .isIn(['upcoming', 'past', 'all', 'submitted', 'ungraded'])
            .withMessage('Invalid status filter'),
        query('search')
            .optional()
            .trim()
            .escape(),
        query('sort_by')
            .optional()
            .isIn(['title', 'due_date', 'created_at'])
            .withMessage('Invalid sort field'),
        query('sort_order')
            .optional()
            .isIn(['ASC', 'DESC'])
            .withMessage('Invalid sort order')
    ]
};

module.exports = {
    validate,
    validateRequest,
    validationRules
};
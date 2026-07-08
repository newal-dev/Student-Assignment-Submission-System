/**
 * Global Error Handler
 * Centralized error handling with logging and response formatting
 */

const logger = require('../utils/logger');

// Custom error classes
class AppError extends Error {
    constructor(message, statusCode = 500, details = null) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

// Specific error types
class ValidationError extends AppError {
    constructor(message, details = null) {
        super(message, 400, details);
        this.name = 'ValidationError';
    }
}

class AuthenticationError extends AppError {
    constructor(message = 'Authentication required') {
        super(message, 401);
        this.name = 'AuthenticationError';
    }
}

class AuthorizationError extends AppError {
    constructor(message = 'Insufficient permissions') {
        super(message, 403);
        this.name = 'AuthorizationError';
    }
}

class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404);
        this.name = 'NotFoundError';
    }
}

class ConflictError extends AppError {
    constructor(message = 'Resource already exists') {
        super(message, 409);
        this.name = 'ConflictError';
    }
}

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
    // Log the error
    logger.logError(err, {
        path: req.path,
        method: req.method,
        ip: req.ip,
        userId: req.user?.id,
        body: req.body,
        query: req.query,
        params: req.params
    });

    // Default error response
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    let details = err.details || null;

    // Handle specific error types
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation Error';
        details = err.details || err.message;
    } else if (err.code === '23505') { // PostgreSQL unique violation
        statusCode = 409;
        message = 'Duplicate entry';
        details = err.detail;
    } else if (err.code === '23503') { // PostgreSQL foreign key violation
        statusCode = 400;
        message = 'Referenced resource not found';
        details = err.detail;
    } else if (err.code === '22P02') { // PostgreSQL invalid input
        statusCode = 400;
        message = 'Invalid input format';
        details = err.detail;
    } else if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    } else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    }

    // Development vs Production error responses
    const errorResponse = {
        success: false,
        error: message,
        status: statusCode
    };

    // Add details in development
    if (process.env.NODE_ENV === 'development') {
        errorResponse.details = details;
        errorResponse.stack = err.stack;
        errorResponse.full_error = err.message;
    }

    // Add details for validation errors in production
    if (err.name === 'ValidationError' && details) {
        errorResponse.details = details;
    }

    res.status(statusCode).json(errorResponse);
};

/**
 * Async wrapper to catch errors in route handlers
 */
const catchAsync = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};

module.exports = {
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    errorHandler,
    catchAsync
};
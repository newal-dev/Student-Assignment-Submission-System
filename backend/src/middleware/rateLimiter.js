/**
 * Rate Limiting Middleware
 * Prevents abuse by limiting request frequency
 */

const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * Create rate limiter for different endpoints
 */
const createRateLimiter = (options = {}) => {
    const defaults = {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message: {
            success: false,
            error: 'Too many requests',
            message: 'Please try again later'
        },
        handler: (req, res, next, options) => {
            logger.logSecurity('rate_limit_exceeded', {
                ip: req.ip,
                path: req.path,
                method: req.method,
                userId: req.user?.id
            });
            
            res.status(429).json(options.message);
        }
    };

    const config = { ...defaults, ...options };
    return rateLimit(config);
};

// Different rate limiters for different endpoints
const rateLimiters = {
    // Strict limiter for auth endpoints
    auth: createRateLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1000, // 5 requests per 15 minutes
        message: {
            success: false,
            error: 'Too many authentication attempts',
            message: 'Please try again after 15 minutes'
        }
    }),

    // Moderate limiter for API endpoints
    api: createRateLimiter({
        windowMs: 60 * 1000, // 1 minute
        max: 60 // 60 requests per minute
    }),

    // Lenient limiter for read-only endpoints
    read: createRateLimiter({
        windowMs: 60 * 1000, // 1 minute
        max: 120 // 120 requests per minute
    }),

    // Strict limiter for file uploads
    upload: createRateLimiter({
        windowMs: 60 * 1000, // 1 minute
        max: 10, // 10 uploads per minute
        message: {
            success: false,
            error: 'Too many upload attempts',
            message: 'Please wait before uploading more files'
        }
    })
};

module.exports = rateLimiters;
/**
 * Input Sanitization Middleware
 * Cleans user input to prevent XSS and injection attacks
 */

const sanitize = require('sanitize-html');

/**
 * Sanitize HTML content
 */
const sanitizeHtml = (content) => {
    return sanitize(content, {
        allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br'],
        allowedAttributes: {},
        allowedSchemes: ['http', 'https']
    });
};

// Sanitize all string fields in an object
const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            // Don't sanitize passwords
            if (key.toLowerCase().includes('password')) {
                result[key] = value;
            } else {
                result[key] = sanitizeHtml(value);
            }
        } else if (typeof value === 'object' && value !== null) {
            result[key] = sanitizeObject(value);
        } else {
            result[key] = value;
        }
    }
    return result;
};

/**
 * Middleware to sanitize request body, query, and params
 */
const sanitizeInput = (req, res, next) => {
    // Sanitize body
    if (req.body) {
        req.body = sanitizeObject(req.body);
    }
    
    // Sanitize query
    if (req.query) {
        req.query = sanitizeObject(req.query);
    }
    
    // Sanitize params
    if (req.params) {
        req.params = sanitizeObject(req.params);
    }
    
    next();
};

module.exports = sanitizeInput;
/**
 * Request Logging Middleware
 * Logs all incoming requests with their respective performance metrics
 */

const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * Generate unique request ID
 */
const generateRequestId = () => {
    return crypto.randomBytes(16).toString('hex');
};

/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
    // Generate request ID
    const requestId = generateRequestId();
    req.requestId = requestId;
    
    // Add request ID to response headers
    res.setHeader('X-Request-Id', requestId);

    // Log request start
    const startTime = Date.now();
    logger.info(`[${requestId}] ${req.method} ${req.originalUrl} - Started`);

    // Log request details in debug mode
    if (process.env.NODE_ENV === 'development') {
        logger.debug(`[${requestId}] Request headers:`, req.headers);
        logger.debug(`[${requestId}] Request body:`, req.body);
        logger.debug(`[${requestId}] Request query:`, req.query);
        logger.debug(`[${requestId}] Request params:`, req.params);
    }

    // Capture response
    const originalSend = res.send;
    res.send = function(data) {
        const duration = Date.now() - startTime;
        
        // Log response
        logger.info(`[${requestId}] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
        
        // Log response details in debug mode
        if (process.env.NODE_ENV === 'development' && res.statusCode >= 400) {
            logger.debug(`[${requestId}] Response error:`, data);
        }

        // Log to access log
        logger.logRequest(req, res, duration);

        // Performance logging for slow requests
        if (duration > 1000) { // More than 1 second
            logger.logPerformance('slow_request', duration, {
                method: req.method,
                url: req.originalUrl,
                status: res.statusCode,
                requestId: req.requestId
            });
        }

        // Security logging for sensitive events
        if (res.statusCode === 401 || res.statusCode === 403) {
            logger.logSecurity('unauthorized_access', {
                method: req.method,
                url: req.originalUrl,
                status: res.statusCode,
                ip: req.ip,
                userId: req.user?.id,
                requestId: req.requestId
            });
        }

        return originalSend.call(this, data);
    };

    // Log errors
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        if (res.statusCode >= 500) {
            logger.error(`[${requestId}] Server Error: ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
        }
    });

    next();
};

module.exports = requestLogger;
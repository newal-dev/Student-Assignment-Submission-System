/**
 * Advanced Logging System
 * Structured logging with different levels and formats
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4
};

// Define colors for different levels
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue'
};

winston.addColors(colors);

// Format for console output (development)
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`
    )
);

// Format for file output (production)
const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    levels: levels,
    transports: [
        // Console transport (always on)
        new winston.transports.Console({
            format: consoleFormat
        }),
        
        // Error log file
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            format: fileFormat
        }),
        
        // Combined log file
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log'),
            format: fileFormat
        }),
        
        // Access log (HTTP requests)
        new winston.transports.File({
            filename: path.join(logDir, 'access.log'),
            level: 'http',
            format: fileFormat
        })
    ],
    // Don't exit on error
    exitOnError: false
});

// Add request logging convenience method
logger.logRequest = (req, res, duration) => {
    logger.http({
        message: `${req.method} ${req.originalUrl}`,
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration: duration,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        userId: req.user?.id || 'anonymous'
    });
};

// Add error logging with context
logger.logError = (error, context = {}) => {
    logger.error({
        message: error.message,
        stack: error.stack,
        ...context,
        timestamp: new Date().toISOString()
    });
};

// Add performance logging
logger.logPerformance = (operation, duration, details = {}) => {
    logger.info({
        type: 'performance',
        operation: operation,
        duration: duration,
        ...details,
        timestamp: new Date().toISOString()
    });
};

// Add security logging
logger.logSecurity = (event, details = {}) => {
    logger.warn({
        type: 'security',
        event: event,
        ...details,
        timestamp: new Date().toISOString()
    });
};

module.exports = logger;
/**
 * Express Application Configuration - Updated
 * Includes all middleware: validation, logging, error handling
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import middleware
const requestLogger = require('./middleware/requestLogger');
const sanitizeInput = require('./middleware/sanitize');
const rateLimiters = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();

/**
 * LOGGING SETUP
 */
const logDirectory = path.join(__dirname, '../logs');
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory, { recursive: true });
}

// Create Morgan stream for Winston
const morganStream = {
    write: (message) => {
        logger.http(message.trim());
    }
};

// Morgan middleware
app.use(morgan('combined', { stream: morganStream }));

/**
 * MIDDLEWARE SETUP
 */
// Enable CORS
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging with request ID
app.use(requestLogger);

// Rate limiting
app.use('/api/auth', rateLimiters.auth);
app.use('/api/upload', rateLimiters.upload);
app.use('/api', rateLimiters.api);

// Input sanitization
app.use(sanitizeInput);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

/**
 * ROUTES
 */
const apiRoutes = require('./routes');
app.use('/api', apiRoutes);

/**
 * HEALTH CHECK
 */
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        uptime: process.uptime()
    });
});

/**
 * 404 HANDLER
 */
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        message: `Cannot ${req.method} ${req.originalUrl}`
    });
});

/**
 * GLOBAL ERROR HANDLER
 */
app.use(errorHandler);

module.exports = app;
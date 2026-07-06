// Sets up middleware, routes, and error handling

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const app = express();

// Login Setup
const logDirectory = path.join(__dirname, '../logs');

// Create logs directory if it doesn't exist
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory);
}

// Create a write stream for log files
const accessLogStream = fs.createWriteStream(
    path.join(logDirectory, 'access.log'),
    { flags: 'a' } // 'a' to append
);

// Log to console in development
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev')); // 'dev' gives colorful, concise logs
}

// Log to file in all environments
app.use(morgan('combined', { stream: accessLogStream }));

// Our middleware

// CORS for frontend requests
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
}));

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded request bodies (from forms)
app.use(express.urlencoded({ extended: true }));

// ROUTES
const apiRoutes = require('./routes');

// Mount API routes
app.use('/api', apiRoutes);

// Check to see if API is running
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

// 404 Handling
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found',
        message: `Cannot ${req.method} ${req.originalUrl}`
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    console.error(err.stack);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

module.exports = app;
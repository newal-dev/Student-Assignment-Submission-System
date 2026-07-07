// Aggregates all route modules and exposes them

const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./authRoutes');
const assignmentRoutes = require('./assignmentRoutes');
const submissionRoutes = require('./submissionRoutes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/submissions', submissionRoutes);

// Health check (public)
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

module.exports = router;
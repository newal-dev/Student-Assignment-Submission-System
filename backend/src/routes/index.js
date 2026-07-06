// To Aggregates all route modules and exposes them

const express = require('express');
const router = express.Router();

// Import individual route modules
// I'll add these later
// const authRoutes = require('./authRoutes');
// const assignmentRoutes = require('./assignmentRoutes');
// const submissionRoutes = require('./submissionRoutes');

// Temporary routes for testing now
router.get('/test', (req, res) => {
    res.json({ message: 'API is working!' });
});

// Mount routes
// router.use('/auth', authRoutes);
// router.use('/assignments', assignmentRoutes);
// router.use('/submissions', submissionRoutes);

module.exports = router;
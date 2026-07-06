// starts the Express server and connects to the database

const app = require('./src/app');
const pool = require('./src/config/database');

require('dotenv').config();

const PORT = process.env.PORT || 5000;

// Test database connection before starting server
async function startServer() {
    try {
        // Test database connection
        await pool.query('SELECT NOW()');
        console.log('Database connected successfully');

        // Start the server
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV}`);
        });
    } catch (error) {
        console.error('Failed to connect to database:', error.message);
        console.error('Please check your database configuration in .env file');
        process.exit(1); // Exit with failure code
    }
}

startServer();
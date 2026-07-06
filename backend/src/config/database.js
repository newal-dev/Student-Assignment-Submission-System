// connection pool to postgres

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'assignment_system',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    max: 20, // Max connections
    idleTimeoutMillis: 30000, // 30 seconds
    connectionTimeoutMillis: 2000, // Fail fast if can't connect
});

// Test the connection
pool.on('connect', () => {
    console.log('Database connected');
});

pool.on('error', (err) => {
    console.error('Unexpected database error:', err.message);
});

module.exports = pool;
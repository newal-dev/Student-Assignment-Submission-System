/**
 * Authentication Middleware
 * Verifies JWT tokens and protects routes
 */

const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Extracts user from token and attaches to request
const authenticate = async (req, res, next) => { //next is needed here so we can pass all this to the controller
    try {
        // Get token from Authorization header
        // Format: "Bearer <token>"
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Authentication required',
                message: 'No valid token provided'
            });
        }

        // Extract the token (remove "Bearer " prefix)
        const token = authHeader.split(' ')[1];

        // Verify the token using our secret
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from database to ensure they still exist
        const user = await User.findById(decoded.id);
        
        if (!user) {
            return res.status(401).json({
                error: 'Authentication failed',
                message: 'User no longer exists'
            });
        }

        // Attach user to request for use in controllers
        req.user = user;
        req.userId = user.id;
        req.userRole = user.role;

        next(); // Proceed to next middleware or route handler
    } catch (error) {
        // Different types of JWT errors
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: 'Invalid token',
                message: 'The token provided is invalid'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Token expired',
                message: 'Please login again'
            });
        }

        // For the generic error
        return res.status(401).json({
            error: 'Authentication failed',
            message: error.message
        });
    }
};

/**
 * Middleware to check if user has required role used after the authenticate middleware
 * @param {...string} roles - Allowed roles (e.g., 'teacher', 'student') from our db
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        // Check if user exists on request (should, after authenticate)
        if (!req.user) {
            return res.status(401).json({
                error: 'Authentication required',
                message: 'Please login first'
            });
        }

        // Check if user's role is in the allowed roles
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Permission denied',
                message: `Role '${req.user.role}' cannot access this resource`,
                required_roles: roles
            });
        }

        next(); // Reached iff user has permission
    };
};

// Used when a user should access their own data
const isSelfOrAdmin = (req, res, next) => {
    const userId = parseInt(req.params.id || req.params.userId);
    
    // If user is admin, allow access
    if (req.user.role === 'admin') {
        return next();
    }
    
    // If user is accessing their own data, allow
    if (req.user.id === userId) {
        return next();
    }
    
    // Otherwise, deny
    return res.status(403).json({
        error: 'Permission denied',
        message: 'You can only access your own data'
    });
};

module.exports = {
    authenticate,
    authorize,
    isSelfOrAdmin
};
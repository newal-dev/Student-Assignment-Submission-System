/**
 * Authentication & Authorization Middleware
 * Verifies JWT tokens, protects routes, and checks permissions
 */

const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Middleware to verify JWT token
 * Extracts user from token and attaches to request
 */
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Authentication required',
                message: 'No valid token provided'
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const user = await User.findById(decoded.id);
        
        if (!user) {
            return res.status(401).json({
                error: 'Authentication failed',
                message: 'User no longer exists'
            });
        }

        // Attach user to request
        req.user = user;
        req.userId = user.id;
        req.userRole = user.role;

        next();
    } catch (error) {
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

        return res.status(401).json({
            error: 'Authentication failed',
            message: error.message
        });
    }
};

/**
 * Middleware to check if user has required role
 * Must be used after authenticate middleware
 * 
 * @param {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Authentication required',
                message: 'Please login first'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Permission denied',
                message: `Role '${req.user.role}' cannot access this resource`,
                required_roles: roles,
                // Log this for security monitoring
                timestamp: new Date().toISOString()
            });
        }

        next();
    };
};

/**
 * Middleware to check if user owns a resource
 * Used for protecting user-specific data
 * 
 * @param {Function} getResourceOwner - Function to get resource owner ID
 */
const isOwner = (getResourceOwner) => {
    return async (req, res, next) => {
        try {
            // Skip ownership check for teachers (they can see all)
            if (req.user.role === 'teacher') {
                return next();
            }

            const resourceId = parseInt(req.params.id);
            const ownerId = await getResourceOwner(resourceId);
            
            if (!ownerId) {
                return res.status(404).json({
                    error: 'Resource not found',
                    message: 'The requested resource does not exist'
                });
            }

            if (req.user.id !== ownerId) {
                return res.status(403).json({
                    error: 'Permission denied',
                    message: 'You do not own this resource'
                });
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Check if user is accessing their own data
 * Used for /profile/:id routes
 */
const isSelfOrAdmin = (req, res, next) => {
    const userId = parseInt(req.params.id || req.params.userId);
    
    // Admin can access any user
    if (req.user.role === 'teacher') {
        return next();
    }
    
    // User can only access themselves
    if (req.user.id === userId) {
        return next();
    }
    
    return res.status(403).json({
        error: 'Permission denied',
        message: 'You can only access your own data'
    });
};

module.exports = {
    authenticate,
    authorize,
    isOwner,
    isSelfOrAdmin
};
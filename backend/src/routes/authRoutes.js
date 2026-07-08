const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate, validateRequest } = require('../middleware/validate');

// Public routes with validation
router.post('/register', 
    validate.register,
    validateRequest,
    authController.register
);

router.post('/login',
    validate.login,
    validateRequest,
    authController.login
);

// Protected routes
router.get('/profile', 
    authenticate, 
    authController.getProfile
);

router.put('/profile',
    authenticate,
    validate.register,
    validateRequest,
    authController.updateProfile
);

router.put('/change-password',
    authenticate,
    authController.changePassword
);

router.post('/logout',
    authenticate,
    authController.logout
);

module.exports = router;
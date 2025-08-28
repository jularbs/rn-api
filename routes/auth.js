const express = require('express');
const { authenticate } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware');
const {
    register,
    login,
    getProfile,
    updateProfile,
    changePassword,
    logout,
    verifyTokenEndpoint
} = require('../controllers/authController');

const router = express.Router();

// Rate limiting for auth endpoints
const authRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 5 }); // 5 attempts per 15 minutes
const registerRateLimit = createRateLimiter({ windowMs: 60 * 60 * 1000, maxRequests: 3 }); // 3 registrations per hour

// POST /api/auth/register - Register new user
router.post('/register', registerRateLimit, register);

// POST /api/auth/login - Login user
router.post('/login', authRateLimit, login);

// GET /api/auth/me - Get current user profile
router.get('/me', authenticate, getProfile);

// PUT /api/auth/me - Update current user profile
router.put('/me', authenticate, updateProfile);

// PATCH /api/auth/change-password - Change user password
router.patch('/change-password', authenticate, changePassword);

// POST /api/auth/logout - Logout user
router.post('/logout', authenticate, logout);

// GET /api/auth/verify-token - Verify JWT token
router.get('/verify-token', authenticate, verifyTokenEndpoint);

module.exports = router;

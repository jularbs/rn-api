const express = require('express');
const User = require('../models/User');
const {
    generateToken,
    generateRefreshToken,
    verifyToken,
    authenticate,
} = require('../middleware/auth');
const { createRateLimiter } = require('../middleware');

const router = express.Router();

// Rate limiting for auth endpoints
const authRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 5 }); // 5 attempts per 15 minutes
const registerRateLimit = createRateLimiter({ windowMs: 60 * 60 * 1000, maxRequests: 3 }); // 3 registrations per hour

// POST /api/auth/register - Register new user
router.post('/register', registerRateLimit, async (req, res) => {
    try {
        const { firstName, lastName, email, password, phone, role } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Create new user
        const userData = {
            firstName,
            lastName,
            email,
            password,
            phone,
            role: role || 'user' // Default to user role
        };

        const user = new User(userData);
        await user.save();

        // Generate tokens
        const token = generateToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        // Return user data without sensitive information
        const userResponse = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            role: user.role,
            isActive: user.isActive,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt
        };

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: userResponse,
                token,
                refreshToken,
                expiresIn: process.env.JWT_EXPIRES_IN || '7d'
            }
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error registering user',
            error: error.message
        });
    }
});

// POST /api/auth/login - Login user
router.post('/login', authRateLimit, async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Find user and include password for comparison
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated. Please contact support.'
            });
        }

        // Check if user is soft deleted
        if (user.isDeleted) {
            return res.status(401).json({
                success: false,
                message: 'Account has been deleted. Please contact support.'
            });
        }

        // Check password
        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false });

        // Generate tokens
        const token = generateToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        // Return user data without sensitive information
        const userResponse = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            role: user.role,
            isActive: user.isActive,
            emailVerified: user.emailVerified,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt
        };

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: userResponse,
                token,
                refreshToken,
                expiresIn: process.env.JWT_EXPIRES_IN || '7d'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error during login',
            error: error.message
        });
    }
});

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token is required'
            });
        }

        // Verify refresh token
        const decoded = verifyToken(refreshToken);

        if (decoded.type !== 'refresh') {
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token'
            });
        }

        // Check if user still exists and is active
        const user = await User.findById(decoded.userId);

        if (!user || !user.isActive || user.isDeleted) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token is no longer valid'
            });
        }

        // Generate new tokens
        const newToken = generateToken(user._id);
        const newRefreshToken = generateRefreshToken(user._id);

        res.json({
            success: true,
            message: 'Token refreshed successfully',
            data: {
                token: newToken,
                refreshToken: newRefreshToken,
                expiresIn: process.env.JWT_EXPIRES_IN || '7d'
            }
        });
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired refresh token'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error refreshing token',
            error: error.message
        });
    }
});

// GET /api/auth/me - Get current user profile
router.get('/me', authenticate, async (req, res) => {
    try {
        const user = req.user;

        const userResponse = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            role: user.role,
            isActive: user.isActive,
            emailVerified: user.emailVerified,
            avatar: user.avatar,
            dateOfBirth: user.dateOfBirth,
            age: user.age,
            address: user.address,
            preferences: user.preferences,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };

        res.json({
            success: true,
            data: userResponse
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching user profile',
            error: error.message
        });
    }
});

// PUT /api/auth/me - Update current user profile
router.put('/me', authenticate, async (req, res) => {
    try {
        const userId = req.user._id;
        const updateData = req.body;

        // Remove sensitive fields that shouldn't be updated this way
        delete updateData.password;
        delete updateData.role; // Users can't change their own role
        delete updateData.isActive;
        delete updateData.emailVerified;
        delete updateData.emailVerificationToken;
        delete updateData.passwordResetToken;
        delete updateData.passwordResetExpires;
        delete updateData.isDeleted;
        delete updateData.deletedAt;
        delete updateData.deletedBy;

        // Check if email is being updated and if it already exists
        if (updateData.email) {
            const existingUser = await User.findOne({
                email: updateData.email,
                _id: { $ne: userId }
            });

            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'User with this email already exists'
                });
            }

            // If email is being changed, mark as unverified
            updateData.emailVerified = false;
        }

        const user = await User.findByIdAndUpdate(
            userId,
            updateData,
            {
                new: true,
                runValidators: true
            }
        ).select('-password -emailVerificationToken -passwordResetToken -passwordResetExpires');

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: user
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error updating profile',
            error: error.message
        });
    }
});

// PATCH /api/auth/change-password - Change password
router.patch('/change-password', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters long'
            });
        }

        // Get user with password
        const user = await User.findById(req.user._id).select('+password');

        // Check current password
        const isValidPassword = await user.comparePassword(currentPassword);
        if (!isValidPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error changing password',
            error: error.message
        });
    }
});

// POST /api/auth/logout - Logout user (client-side token invalidation)
router.post('/logout', authenticate, async (req, res) => {
    try {
        // In a stateless JWT system, logout is typically handled client-side
        // by removing the token from storage. However, we can log this event.

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error during logout',
            error: error.message
        });
    }
});

// GET /api/auth/verify-token - Verify if token is valid
router.get('/verify-token', authenticate, async (req, res) => {
    res.json({
        success: true,
        message: 'Token is valid',
        data: {
            userId: req.user._id,
            email: req.user.email,
            role: req.user.role
        }
    });
});

module.exports = router;

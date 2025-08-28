const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
};

// Generate refresh token
const generateRefreshToken = (userId) => {
    return jwt.sign({ userId, type: 'refresh' }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    });
};

// Verify JWT token
const verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};

// Authentication middleware
const authenticate = async (req, res, next) => {
    try {
        let token;

        // Check for token in Authorization header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        // Check for token in cookies (if you're using cookie-based auth)
        else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        // Verify token
        const decoded = verifyToken(token);

        // Check if user still exists and is active
        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Token is no longer valid. User not found.'
            });
        }

        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'User account is deactivated.'
            });
        }

        if (user.isDeleted) {
            return res.status(401).json({
                success: false,
                message: 'User account has been deleted.'
            });
        }

        // Update last login time
        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false });

        // Add user to request object
        req.user = user;
        next();

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token.'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token has expired.'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Authentication error.',
            error: error.message
        });
    }
};

// Authorization middleware - check user roles
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Required role: ${roles.join(' or ')}`
            });
        }

        next();
    };
};

// Optional authentication - authenticate if token is provided, but don't require it
const optionalAuth = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        if (token) {
            try {
                const decoded = verifyToken(token);
                const user = await User.findById(decoded.userId).select('-password');

                if (user && user.isActive && !user.isDeleted) {
                    req.user = user;
                    user.lastLogin = new Date();
                    await user.save({ validateBeforeSave: false });
                }
            } catch (error) {
                // Token is invalid but we don't return error for optional auth
                req.user = null;
            }
        }

        next();
    } catch (error) {
        // For optional auth, we continue even if there's an error
        req.user = null;
        next();
    }
};

// Check if user owns the resource or is admin
const ownerOrAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required.'
        });
    }

    const resourceUserId = req.params.id || req.params.userId;

    if (req.user.role === 'admin' || req.user._id.toString() === resourceUserId) {
        return next();
    }

    return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.'
    });
};

module.exports = {
    generateToken,
    generateRefreshToken,
    verifyToken,
    authenticate,
    authorize,
    optionalAuth,
    ownerOrAdmin,
};

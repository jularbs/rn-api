const rateLimit = require('express-rate-limit');

// Rate limiting middleware
const createRateLimiter = (windowMs = 1 * 60 * 1000, maxRequests = 50, message = "Too many requests. Please try again later.") => {
    return rateLimit({
        windowMs,
        max: maxRequests,
        message: {
            success: false,
            message: message,
            retryAfter: Math.ceil(windowMs / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false,
    });
};

// API key authentication middleware (optional)
const authenticateApiKey = (req, res, next) => {
    const apiKey = req.header('X-API-Key') || req.query.apikey;

    // Skip authentication in development
    if (process.env.NODE_ENV === 'development') {
        return next();
    }

    if (!apiKey) {
        return res.status(401).json({
            success: false,
            message: 'API key is required'
        });
    }

    // Validate API key (replace with your actual validation logic)
    const validApiKey = process.env.API_KEY;
    if (apiKey !== validApiKey) {
        return res.status(401).json({
            success: false,
            message: 'Invalid API key'
        });
    }

    next();
};

module.exports = {
    createRateLimiter,
    authenticateApiKey,
    ...require('./auth') // Include all auth middleware
};

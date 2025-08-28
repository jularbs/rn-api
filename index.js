const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import database connection
const connectDB = require('./config/database');

// Import routes and middleware
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const { createRateLimiter, corsConfig } = require('./middleware');
const morgan = require('morgan');

// Set max listeners to prevent memory leak warnings
process.setMaxListeners(15);

// Log current listeners in development
if (process.env.NODE_ENV === 'development') {
    console.log(`📊 Current process listeners - SIGINT: ${process.listenerCount('SIGINT')}, SIGTERM: ${process.listenerCount('SIGTERM')}`);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors(corsConfig()));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));
app.use(createRateLimiter()); // 100 requests per 15 minutes by default
// app.options("*", cors()); //Handle preflight requests

// Routes
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to Radyo Natin API',
        version: '0.0.1',
        status: 'running',
        endpoints: {
            health: '/api/health',
            auth: '/api/auth',
            users: '/api/users',
            documentation: '/api/docs'
        }
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: '0.0.1'
    });
});

// API documentation endpoint
app.get('/api/docs', createRateLimiter(1000 * 15 * 6, 3), (req, res) => {
    res.json({
        title: 'Radyo Natin API Documentation',
        version: '0.0.1',
        endpoints: {
            'GET /api/health': 'Health check endpoint',
            'POST /api/auth/register': 'Register a new user',
            'POST /api/auth/login': 'Login user',
            'GET /api/auth/me': 'Get current user profile',
            'PUT /api/auth/me': 'Update current user profile',
            'PATCH /api/auth/change-password': 'Change user password',
            'POST /api/auth/logout': 'Logout user',
            'GET /api/auth/verify-token': 'Verify JWT token',
            'GET /api/users': 'Get all users with pagination (requires auth)',
            'GET /api/users/:id': 'Get a specific user by ID (requires auth)',
            'POST /api/users': 'Create a new user (admin only)',
            'PUT /api/users/:id': 'Update an existing user (owner or admin)',
            'PATCH /api/users/:id/password': 'Update user password (admin only)',
            'PATCH /api/users/:id/status': 'Toggle user active status (admin only)',
            'DELETE /api/users/:id': 'Soft delete a user (admin only)',
            'GET /api/users/stats/overview': 'Get user statistics (admin only)'
        },
        sampleRequest: {
            authentication: {
                register: {
                    method: 'POST',
                    url: '/api/auth/register',
                    body: {
                        firstName: 'John',
                        lastName: 'Doe',
                        email: 'john@example.com',
                        password: 'password123',
                        phone: '+1234567890'
                    }
                },
                login: {
                    method: 'POST',
                    url: '/api/auth/login',
                    body: {
                        email: 'john@example.com',
                        password: 'password123'
                    }
                }
            }
        }
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`🚀 Radyo Natin API is running on port ${PORT}`);
});

// Graceful shutdown handling
const gracefulShutdown = () => {
    console.log('🔄 Received shutdown signal, shutting down gracefully...');
    server.close(() => {
        console.log('🔴 HTTP server closed');
    });
};

// Only add these listeners if they haven't been added already
if (!process.listenerCount('SIGTERM')) {
    process.on('SIGTERM', gracefulShutdown);
}
if (!process.listenerCount('SIGINT')) {
    process.on('SIGINT', gracefulShutdown);
}

module.exports = app;

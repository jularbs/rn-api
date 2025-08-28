const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import database connection
const connectDB = require('./config/database');

// Import routes and middleware
const { createRateLimiter } = require('./middleware');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
// connectDB();

// Middleware
app.use(cors());
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
            stations: '/api/stations',
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
            'POST /api/auth/refresh': 'Refresh access token',
            'GET /api/auth/me': 'Get current user profile',
            'PUT /api/auth/me': 'Update current user profile',
            'PATCH /api/auth/change-password': 'Change user password',
            'POST /api/auth/logout': 'Logout user',
            'GET /api/auth/verify-token': 'Verify JWT token',
            'GET /api/stations': 'Get all radio stations',
            'GET /api/stations/:id': 'Get a specific station by ID',
            'POST /api/stations': 'Create a new station',
            'PUT /api/stations/:id': 'Update an existing station',
            'DELETE /api/stations/:id': 'Delete a station',
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
            },
            station: {
                method: 'POST',
                url: '/api/stations',
                headers: {
                    'Authorization': 'Bearer YOUR_JWT_TOKEN'
                },
                body: {
                    name: 'Radyo Natin Sample',
                    frequency: '101.1 FM',
                    location: 'Sample City',
                    description: 'A sample radio station'
                }
            }
        }
    });
});

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
app.listen(PORT, () => {
    console.log(`Radyo Natin API is running on port ${PORT}`);
});

module.exports = app;

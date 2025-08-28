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

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', usersRoutes);

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

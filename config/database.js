const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            // Mongoose 6+ no longer needs these options as they are default
            // useNewUrlParser: true,
            // useUnifiedTopology: true,
        });

        // Handle connection events
        mongoose.connection.on('connected', () => {
            console.log('🟢 Mongoose connected to MongoDB');
        });

        mongoose.connection.on('error', (err) => {
            console.error('🔴 Mongoose connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('🟡 Mongoose disconnected from MongoDB');
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            console.log('🔴 MongoDB connection closed through app termination');
            process.exit(0);
        });

    } catch (error) {
        console.error('🔴 Database connection failed:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;

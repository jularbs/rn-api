import mongoose from 'mongoose';

let isConnected = false;
let hasEventListeners = false;

const connectDB = async (): Promise<void> => {
  // Avoid multiple connections
  if (isConnected) {
    console.log('📦 Using existing MongoDB connection');
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI as string, {});

    console.log(`🍃 MongoDB Connected: ${conn.connection.host}`);
    isConnected = true;

    // Set up event listeners only once
    if (!hasEventListeners) {
      // Handle connection events
      mongoose.connection.on('connected', () => {
        console.log('Mongoose connected to MongoDB');
        isConnected = true;
      });

      mongoose.connection.on('error', (err) => {
        console.error('Mongoose connection error:', err);
        isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.log('Mongoose disconnected from MongoDB');
        isConnected = false;
      });

      // Graceful shutdown - only set up once
      const gracefulShutdown = async (): Promise<void> => {
        if (isConnected) {
          await mongoose.connection.close();
          console.log('MongoDB connection closed through app termination');
          isConnected = false;
        }
        process.exit(0);
      };

      process.on('SIGINT', gracefulShutdown);
      process.on('SIGTERM', gracefulShutdown);

      hasEventListeners = true;
    }

  } catch (error) {
    console.error('🔴 Database connection failed:', (error as Error).message);
    isConnected = false;
    process.exit(1);
  }
};

export default connectDB;

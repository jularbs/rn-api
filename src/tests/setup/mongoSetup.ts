import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll } from "vitest";

// Configure MongoDB Memory Server environment variables for compatibility
process.env.MONGOMS_DISABLE_POSTINSTALL = '1';
process.env.MONGOMS_DOWNLOAD_TIMEOUT = '300000';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  try {
    // Use MongoDB 4.4.x which doesn't require AVX instructions
    mongo = await MongoMemoryServer.create({
      binary: {
        version: '4.4.29', // Specific version that doesn't require AVX
      },
      instance: {
        port: 0, // Use random available port
        dbName: 'test-db',
        storageEngine: 'wiredTiger',
      },
    });
    
    const uri = mongo.getUri();
    console.log('MongoDB URI:', uri);
    
    await mongoose.connect(uri, {
      bufferCommands: false,
    });
    
    console.log("✅ In-memory MongoDB 4.4 started for tests (AVX compatible)");
  } catch (error) {
    console.error('❌ Failed to start MongoDB Memory Server:', error);
    throw error;
  }
}, 120000); // 2 minute timeout for MongoDB setup

afterAll(async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongo) {
      await mongo.stop();
    }
    console.log("✅ MongoDB Memory Server stopped");
  } catch (error) {
    console.error('❌ Error stopping MongoDB Memory Server:', error);
  }
});

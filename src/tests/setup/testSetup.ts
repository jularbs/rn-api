import { beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';

// Setup that runs before each test
beforeEach(async () => {
  // Clear all collections before each test
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Cleanup that runs after each test
afterEach(async () => {
  // Additional cleanup if needed
  // This is useful for specific test cleanup
});
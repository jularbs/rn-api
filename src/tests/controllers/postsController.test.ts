import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Test using TypeScript aliases
import { PostModel } from '@/models/Post';
import { getPosts } from '@/controllers/postsController';

describe('Posts Controller', () => {
  let app: express.Application;
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    // Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Setup Express app
    app = express();
    app.use(express.json());
    app.get('/api/posts', getPosts);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  describe('GET /api/posts', () => {
    it('should return empty array when no posts exist', async () => {
      const response = await request(app)
        .get('/api/posts')
        .expect(200);

      expect(response.body.data).toEqual([]);
      expect(response.body.pagination.total).toBe(0);
    });

    it('should demonstrate TypeScript alias usage', async () => {
      // This test demonstrates that @/ aliases work in tests
      const postCount = await PostModel.countDocuments();
      expect(postCount).toBe(0);
    });
  });
});
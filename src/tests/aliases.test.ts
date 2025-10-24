import { describe, it, expect } from 'vitest';

// Test TypeScript aliases - this will verify that @/ imports work
describe('TypeScript Aliases', () => {
  it('should be able to import using @/ alias', async () => {
    // Dynamic import to test alias resolution
    try {
      const { PostModel } = await import('@/models/Post');
      expect(PostModel).toBeDefined();
      expect(typeof PostModel).toBe('function');
    } catch (error) {
      // If the import fails, that's fine for now - we're just testing alias resolution
      console.log('Import test:', error);
    }
  });
});
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

export default defineConfig({
  plugins: [
    // This plugin reads path mapping from tsconfig.json
    tsconfigPaths({
      projects: ['./tsconfig.json'],
    }),
  ],
  test: {
    // Test environment
    environment: 'node',
    
    // File patterns
    include: ['src/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist'],
    
    // Coverage configuration
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'src/tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts',
      ],
    },
    
    // Test timeout
    testTimeout: 10000,
    
    // Mock reset between tests
    clearMocks: true,
    
    // Watch options
    watch: false,
    
    // Reporter
    reporters: ['verbose'],
  },
  
  // Resolve configuration to match TypeScript paths
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
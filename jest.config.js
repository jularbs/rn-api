module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  roots: ['<rootDir>/src'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/controllers/(.*)$': '<rootDir>/src/controllers/$1',
    '^@/models/(.*)$': '<rootDir>/src/models/$1',
    '^@/middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^@/routes/(.*)$': '<rootDir>/src/routes/$1',
    '^@/config/(.*)$': '<rootDir>/src/config/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1'
  },
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },
  verbose: true,
};

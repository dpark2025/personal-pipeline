/**
 * Global test setup
 * Handles global configuration and mocking for all tests
 */

// Import shared mocks first (this must happen before any imports that use the mocked modules)
import './helpers/test-mocks';

// Set environment variables for tests
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests

// Mock Redis for all tests to avoid real Redis connections
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue('PONG'),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    expire: jest.fn().mockResolvedValue(1),
    flushall: jest.fn().mockResolvedValue('OK'),
    keys: jest.fn().mockResolvedValue([]),
    on: jest.fn(),
    off: jest.fn(),
    quit: jest.fn().mockResolvedValue('OK'),
    isReady: true,
    isOpen: true,
  })),
}));

jest.mock('ioredis', () => {
  const mockRedis = jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue('PONG'),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    expire: jest.fn().mockResolvedValue(1),
    flushall: jest.fn().mockResolvedValue('OK'),
    keys: jest.fn().mockResolvedValue([]),
    on: jest.fn(),
    off: jest.fn(),
    quit: jest.fn().mockResolvedValue('OK'),
    status: 'ready',
  }));
  return mockRedis;
});

// Mock the test data generator to avoid TypeScript issues
jest.mock('./helpers/test-data-generator', () => ({
  testDataGenerator: {
    generateRunbook: jest.fn().mockReturnValue({
      title: 'Test Runbook',
      triggers: ['test_trigger'],
      procedures: [],
      metadata: { confidence_score: 0.9, last_updated: new Date().toISOString() },
    }),
    generateProcedure: jest.fn().mockReturnValue({
      name: 'Test Procedure',
      steps: ['Step 1'],
      metadata: { complexity: 'medium' },
    }),
    generateCacheWarmupData: jest.fn().mockReturnValue([]),
    generateTestDataset: jest.fn().mockReturnValue({
      runbooks: [],
      procedures: [],
      decision_trees: [],
      knowledge_base: [],
    }),
    saveTestDataset: jest.fn().mockResolvedValue(undefined),
  },
}));

// Global test timeout
jest.setTimeout(10000);

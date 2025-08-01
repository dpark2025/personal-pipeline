/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.(test|spec).ts'],
  testPathIgnorePatterns: ['<rootDir>/tests/node-test-runner/'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      lines: 80,
      statements: 80,
      functions: 80,
      branches: 75
    }
  },
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'ES2020',
        target: 'ES2020'
      }
    }]
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@modelcontextprotocol/sdk/(.*)$': '<rootDir>/node_modules/@modelcontextprotocol/sdk/dist/$1',
    '^got$': '<rootDir>/tests/__mocks__/got.js',
    '^normalize-url$': '<rootDir>/tests/__mocks__/normalize-url.js',
    '^robots-parser$': '<rootDir>/tests/__mocks__/robots-parser.js',
    '^p-limit$': '<rootDir>/tests/__mocks__/p-limit.js',
    '^node-cache$': '<rootDir>/tests/__mocks__/node-cache.js',
    '^file-type$': '<rootDir>/tests/__mocks__/file-type.js'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@modelcontextprotocol/sdk|got|normalize-url|robots-parser|p-limit|fuse\\.js|cheerio|file-type|turndown|@octokit|@xenova|node-cache|chokidar|ioredis|redis|glob|@octokit\/.*|universal-user-agent|before-after-hook)/)'
  ],
  testTimeout: 10000,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
};
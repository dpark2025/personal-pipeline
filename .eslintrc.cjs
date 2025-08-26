module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.eslint.json'
  },
  plugins: [
    '@typescript-eslint'
  ],
  extends: [
    'eslint:recommended',
    'prettier'
  ],
  env: {
    node: true,
    es2022: true
  },
  rules: {
    // Disable base ESLint rules that are handled by TypeScript equivalents
    'no-redeclare': 'off', // TypeScript handles this better
    '@typescript-eslint/no-redeclare': ['error', {
      'ignoreDeclarationMerge': true
    }],
    
    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    '@typescript-eslint/no-unsafe-member-access': 'warn',
    '@typescript-eslint/no-unsafe-call': 'warn',
    '@typescript-eslint/no-unsafe-return': 'warn',
    '@typescript-eslint/restrict-template-expressions': 'warn',
    '@typescript-eslint/prefer-nullish-coalescing': 'warn',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    
    // General rules
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-duplicate-imports': 'error',
    'no-unused-expressions': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-arrow-callback': 'error',
    'prefer-template': 'error',
    
    // Code quality
    'complexity': ['warn', 10],
    'max-depth': ['warn', 4],
    'max-lines-per-function': ['warn', 100],
    'max-params': ['warn', 5],
    
    // Node.js Test Runner - no specific linting rules needed
  },
  overrides: [
    // Core API files - strict security rules (but relaxed style rules)
    {
      files: ['src/api/**/*.ts', 'src/core/**/*.ts', 'src/tools/**/*.ts'],
      rules: {
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/no-misused-promises': ['error', {
          'checksVoidReturn': {
            'arguments': false, // Allow async Express route handlers
            'attributes': false
          }
        }],
        '@typescript-eslint/await-thenable': 'error',
        '@typescript-eslint/no-unsafe-assignment': 'warn',
        '@typescript-eslint/no-unsafe-call': 'warn', 
        '@typescript-eslint/no-unsafe-member-access': 'warn',
        '@typescript-eslint/no-unsafe-return': 'warn',
        '@typescript-eslint/prefer-nullish-coalescing': 'warn'
      }
    },
    // Test files - relaxed rules for testing flexibility
    {
      files: ['**/*.test.ts', '**/*.spec.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/no-floating-promises': 'off',
        '@typescript-eslint/no-misused-promises': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        'no-console': 'off',
        'max-lines-per-function': 'off',
        'complexity': 'off'
      }
    },
    // Adapter files - relaxed rules for external data handling
    {
      files: ['src/adapters/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unsafe-assignment': 'warn',
        '@typescript-eslint/no-unsafe-member-access': 'warn',
        '@typescript-eslint/no-unsafe-call': 'warn',
        '@typescript-eslint/no-unsafe-return': 'warn',
        '@typescript-eslint/prefer-nullish-coalescing': 'warn',
        '@typescript-eslint/no-floating-promises': 'warn',
        '@typescript-eslint/no-misused-promises': 'warn',
        '@typescript-eslint/restrict-template-expressions': 'off',
        'complexity': ['warn', 15],
        'max-depth': ['warn', 6],
        'max-lines-per-function': ['warn', 150],
        'no-useless-escape': 'warn'
      }
    },
    // Utility files - relaxed complexity and return type rules
    {
      files: ['src/utils/**/*.ts'],
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'warn',
        '@typescript-eslint/prefer-nullish-coalescing': 'warn',
        '@typescript-eslint/no-floating-promises': 'warn',
        '@typescript-eslint/no-misused-promises': 'warn',
        'no-undef': 'warn',
        'no-useless-catch': 'warn',
        'complexity': ['warn', 15],
        'max-depth': ['warn', 6],
        'max-lines-per-function': ['warn', 120],
        'no-console': 'warn'
      }
    },
    // Integration test files - relaxed for realistic test scenarios
    {
      files: ['tests/integration/**/*.ts', 'tests/search/integration.test.ts', 'tests/middleware.test.ts', 'tests/node-test-runner/**/*.ts'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'warn',
        'no-unused-vars': 'warn',
        'no-prototype-builtins': 'warn',
        '@typescript-eslint/explicit-function-return-type': 'off',
        'no-console': 'off'
      }
    },
    // Test utility files - very relaxed for test helpers
    {
      files: ['tests/utils/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/prefer-nullish-coalescing': 'warn',
        '@typescript-eslint/no-floating-promises': 'warn',
        'no-console': 'off',
        'no-unused-vars': 'warn',
        '@typescript-eslint/no-unused-vars': 'warn',
        'no-undef': 'off',
        'no-duplicate-imports': 'warn',
        'no-case-declarations': 'warn'
      }
    },
    // TypeScript type definition files - allow const/type pattern
    {
      files: ['src/types/**/*.ts'],
      rules: {
        '@typescript-eslint/no-redeclare': 'off'
      }
    },
    // JavaScript files
    {
      files: ['**/*.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off'
      }
    }
  ],
  ignorePatterns: [
    'dist/',
    'node_modules/',
    'coverage/',
    '*.js',
    '!.eslintrc.js'
  ]
};
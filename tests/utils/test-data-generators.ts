/**
 * Test Data Generators
 *
 * Utilities for generating consistent test data across different test suites.
 * Provides factory functions for creating realistic test scenarios.
 */

import { createCacheKey } from '../../src/utils/cache.js';
import type { CacheKey } from '../../src/utils/cache.js';

/**
 * Generate test runbook data
 */
export function generateRunbookData(id: string, overrides: Record<string, any> = {}) {
  return {
    id,
    title: `Test Runbook ${id}`,
    version: '1.0.0',
    severity: 'medium',
    systems: ['api', 'database'],
    procedures: [
      { step: 1, description: 'Check system status' },
      { step: 2, description: 'Review logs' },
      { step: 3, description: 'Apply fix' },
    ],
    confidence_score: 0.85,
    last_updated: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Generate test procedure data
 */
export function generateProcedureData(id: string, overrides: Record<string, any> = {}) {
  return {
    id,
    title: `Test Procedure ${id}`,
    steps: ['Initialize system', 'Run diagnostic', 'Execute procedure', 'Verify results'],
    estimated_time_minutes: 15,
    difficulty: 'medium',
    prerequisites: ['system_access', 'admin_rights'],
    ...overrides,
  };
}

/**
 * Generate test decision tree data
 */
export function generateDecisionTreeData(id: string, overrides: Record<string, any> = {}) {
  return {
    id,
    title: `Test Decision Tree ${id}`,
    root_condition: 'system_error',
    branches: [
      {
        condition: 'error_type === "connection"',
        action: 'restart_service',
        confidence: 0.9,
      },
      {
        condition: 'error_type === "memory"',
        action: 'increase_memory',
        confidence: 0.8,
      },
    ],
    default_action: 'escalate_to_admin',
    ...overrides,
  };
}

/**
 * Generate test knowledge base data
 */
export function generateKnowledgeBaseData(id: string, overrides: Record<string, any> = {}) {
  return {
    id,
    title: `Test Knowledge Article ${id}`,
    content: `This is test content for knowledge article ${id}`,
    tags: ['testing', 'automation', 'knowledge'],
    category: 'general',
    last_reviewed: new Date().toISOString(),
    author: 'test-user',
    ...overrides,
  };
}

/**
 * Generate cache key test data sets
 */
export function generateCacheKeyTestSet(count: number = 5) {
  const keys: Array<{ key: CacheKey; data: any }> = [];

  for (let i = 0; i < count; i++) {
    // Generate different types of cache keys
    const types = ['runbooks', 'procedures', 'decision_trees', 'knowledge_base'] as const;
    const type = types[i % types.length];
    const id = `test-${type}-${i + 1}`;

    let data;
    switch (type) {
      case 'runbooks':
        data = generateRunbookData(id);
        break;
      case 'procedures':
        data = generateProcedureData(id);
        break;
      case 'decision_trees':
        data = generateDecisionTreeData(id);
        break;
      case 'knowledge_base':
        data = generateKnowledgeBaseData(id);
        break;
    }

    keys.push({
      key: createCacheKey(type, id),
      data,
    });
  }

  return keys;
}

/**
 * Generate performance test data set with configurable size
 */
export function generatePerformanceTestData(
  options: {
    runbooks?: number;
    procedures?: number;
    decision_trees?: number;
    knowledge_base?: number;
  } = {}
) {
  const { runbooks = 10, procedures = 10, decision_trees = 5, knowledge_base = 15 } = options;

  const data: Array<{ key: CacheKey; data: any }> = [];

  // Generate runbooks
  for (let i = 1; i <= runbooks; i++) {
    data.push({
      key: createCacheKey('runbooks', `perf-runbook-${i}`),
      data: generateRunbookData(`perf-runbook-${i}`, {
        complexity: i % 3 === 0 ? 'high' : 'medium',
        systems: i % 2 === 0 ? ['api', 'database', 'cache'] : ['api'],
      }),
    });
  }

  // Generate procedures
  for (let i = 1; i <= procedures; i++) {
    data.push({
      key: createCacheKey('procedures', `perf-procedure-${i}`),
      data: generateProcedureData(`perf-procedure-${i}`, {
        estimated_time_minutes: Math.floor(Math.random() * 60) + 5,
        difficulty: i % 4 === 0 ? 'high' : 'medium',
      }),
    });
  }

  // Generate decision trees
  for (let i = 1; i <= decision_trees; i++) {
    data.push({
      key: createCacheKey('decision_trees', `perf-dt-${i}`),
      data: generateDecisionTreeData(`perf-dt-${i}`, {
        branches: Array.from({ length: Math.floor(Math.random() * 5) + 2 }, (_, j) => ({
          condition: `condition_${j + 1}`,
          action: `action_${j + 1}`,
          confidence: Math.random() * 0.3 + 0.7,
        })),
      }),
    });
  }

  // Generate knowledge base articles
  for (let i = 1; i <= knowledge_base; i++) {
    data.push({
      key: createCacheKey('knowledge_base', `perf-kb-${i}`),
      data: generateKnowledgeBaseData(`perf-kb-${i}`, {
        content: `Performance test knowledge article ${i} with longer content to simulate realistic data sizes. This includes multiple paragraphs and detailed information.`,
        tags: [`tag-${i}`, 'performance', 'testing'],
      }),
    });
  }

  return data;
}

/**
 * Generate error scenario test data
 */
export function generateErrorScenarioData() {
  return [
    {
      name: 'malformed_json',
      key: createCacheKey('runbooks', 'malformed-data'),
      data: '{"invalid": json}', // Intentionally malformed
    },
    {
      name: 'null_data',
      key: createCacheKey('procedures', 'null-data'),
      data: null,
    },
    {
      name: 'empty_object',
      key: createCacheKey('decision_trees', 'empty-data'),
      data: {},
    },
    {
      name: 'large_data',
      key: createCacheKey('knowledge_base', 'large-data'),
      data: {
        id: 'large-data',
        content: 'x'.repeat(10000), // Large string
        metadata: Array.from({ length: 1000 }, (_, i) => ({ index: i, data: `item-${i}` })),
      },
    },
  ];
}

/**
 * Generate concurrent operation test scenarios
 */
export function generateConcurrentTestScenarios(operationCount: number = 20) {
  const scenarios: Array<{
    operation: 'set' | 'get' | 'delete';
    key: CacheKey;
    data?: any;
    expectedResult?: any;
  }> = [];

  for (let i = 0; i < operationCount; i++) {
    const types = ['runbooks', 'procedures', 'decision_trees', 'knowledge_base'] as const;
    const operations = ['set', 'get', 'delete'] as const;

    const type = types[i % types.length];
    const operation = operations[i % operations.length];
    const id = `concurrent-${operation}-${i}`;
    const key = createCacheKey(type, id);

    if (operation === 'set') {
      let data;
      switch (type) {
        case 'runbooks':
          data = generateRunbookData(id);
          break;
        case 'procedures':
          data = generateProcedureData(id);
          break;
        case 'decision_trees':
          data = generateDecisionTreeData(id);
          break;
        case 'knowledge_base':
          data = generateKnowledgeBaseData(id);
          break;
      }
      scenarios.push({ operation, key, data, expectedResult: 'success' });
    } else if (operation === 'get') {
      scenarios.push({ operation, key, expectedResult: 'data_or_null' });
    } else {
      scenarios.push({ operation, key, expectedResult: 'success' });
    }
  }

  return scenarios;
}

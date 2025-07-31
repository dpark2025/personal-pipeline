/**
 * Demo Walkthrough Integration Tests
 *
 * Validates that all demo scenarios and API examples work correctly.
 * Prevents regression in demo walkthrough functionality.
 *
 * Authored by: Integration Specialist (Barry)
 * Date: 2025-07-31
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { spawn, ChildProcess } from 'child_process';
import { setTimeout } from 'timers/promises';

describe('Demo Walkthrough Integration Tests', () => {
  let serverProcess: ChildProcess;
  const SERVER_URL = 'http://localhost:3001'; // Use different port for tests
  const SERVER_PORT = 3001;

  beforeAll(async () => {
    // Start server for testing
    serverProcess = spawn('npm', ['run', 'dev'], {
      env: { ...process.env, PORT: SERVER_PORT.toString() },
      stdio: 'pipe',
    });

    // Wait for server to start
    await setTimeout(3000);

    // Verify server is running
    try {
      const response = await fetch(`${SERVER_URL}/health`);
      if (!response.ok) {
        throw new Error(`Server not healthy: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to start test server:', error);
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      await setTimeout(1000);
    }
  });

  describe('API Parameter Validation', () => {
    test('General search endpoint accepts max_results parameter', async () => {
      const response = await fetch(`${SERVER_URL}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'test query',
          max_results: 5,
        }),
      });

      expect(response.ok).toBe(true);
      const data = (await response.json()) as any;
      expect(data.success).toBe(true);
    });

    test('General search endpoint accepts categories parameter', async () => {
      const response = await fetch(`${SERVER_URL}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'test query',
          categories: ['runbooks'],
          max_results: 3,
        }),
      });

      expect(response.ok).toBe(true);
      const data = (await response.json()) as any;
      expect(data.success).toBe(true);
    });

    test('Specialized runbook search endpoint works correctly', async () => {
      const response = await fetch(`${SERVER_URL}/api/runbooks/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert_type: 'disk_space_critical',
          severity: 'critical',
          affected_systems: ['filesystem'],
        }),
      });

      expect(response.ok).toBe(true);
      const data = (await response.json()) as any;
      expect(data.success).toBe(true);
    });

    test('Rejects old parameter format (type/limit)', async () => {
      const response = await fetch(`${SERVER_URL}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'test query',
          type: 'runbooks', // Old parameter name
          limit: 5, // Old parameter name
        }),
      });

      // Should return 400 for validation error
      expect(response.status).toBe(400);
    });
  });

  describe('Demo Script Functions', () => {
    test('Health check endpoint is accessible', async () => {
      const response = await fetch(`${SERVER_URL}/health`);
      expect(response.ok).toBe(true);

      const data = (await response.json()) as any;
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('uptime');
    });

    test('Detailed health endpoint provides comprehensive data', async () => {
      const response = await fetch(`${SERVER_URL}/health/detailed`);
      expect(response.ok).toBe(true);

      const data = (await response.json()) as any;
      expect(data).toHaveProperty('server');
      expect(data).toHaveProperty('cache');
      expect(data).toHaveProperty('sources');
    });

    test('Performance metrics endpoint works', async () => {
      const response = await fetch(`${SERVER_URL}/performance`);
      expect(response.ok).toBe(true);

      const data = (await response.json()) as any;
      expect(data).toHaveProperty('response_times');
      expect(data).toHaveProperty('throughput');
    });

    test('Cache health endpoint is accessible', async () => {
      const response = await fetch(`${SERVER_URL}/health/cache`);
      expect(response.ok).toBe(true);

      const data = (await response.json()) as any;
      expect(data).toHaveProperty('memory_cache');
      expect(data).toHaveProperty('overall_healthy');
    });
  });

  describe('Performance Validation', () => {
    test('Search response time meets targets', async () => {
      const startTime = Date.now();

      const response = await fetch(`${SERVER_URL}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'test performance',
          max_results: 5,
        }),
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.ok).toBe(true);
      // Should be under 500ms for general searches
      expect(responseTime).toBeLessThan(500);
    });

    test('Repeated queries benefit from caching', async () => {
      const query = 'cache performance test';

      // First query (likely cache miss)
      const startTime1 = Date.now();
      const response1 = await fetch(`${SERVER_URL}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          max_results: 3,
        }),
      });
      const endTime1 = Date.now();
      const firstResponseTime = endTime1 - startTime1;

      expect(response1.ok).toBe(true);

      // Second query (should be cache hit)
      const startTime2 = Date.now();
      const response2 = await fetch(`${SERVER_URL}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          max_results: 3,
        }),
      });
      const endTime2 = Date.now();
      const secondResponseTime = endTime2 - startTime2;

      expect(response2.ok).toBe(true);

      // Second query should be faster or similar (accounting for variability)
      // Allow for some variation but expect improvement trend
      console.log(`Cache test: ${firstResponseTime}ms -> ${secondResponseTime}ms`);
      expect(secondResponseTime).toBeLessThan(firstResponseTime + 50); // Allow some tolerance
    });
  });

  describe('Error Handling Validation', () => {
    test('Invalid endpoint returns proper error', async () => {
      const response = await fetch(`${SERVER_URL}/api/nonexistent`);
      expect(response.status).toBe(404);
    });

    test('Invalid JSON body returns validation error', async () => {
      const response = await fetch(`${SERVER_URL}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"invalid": json}',
      });

      expect(response.status).toBe(400);
    });

    test('Missing required parameters returns validation error', async () => {
      const response = await fetch(`${SERVER_URL}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Missing required 'query' parameter
          max_results: 5,
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Demo Scenarios Validation', () => {
    test('All health monitoring endpoints are accessible', async () => {
      const endpoints = ['/health', '/health/detailed', '/health/cache', '/health/performance'];

      for (const endpoint of endpoints) {
        const response = await fetch(`${SERVER_URL}${endpoint}`);
        expect(response.ok).toBe(true);
      }
    });

    test('Search comparison endpoints work for demo', async () => {
      // Test general search
      const generalSearch = await fetch(`${SERVER_URL}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'disk space critical',
          categories: ['runbooks'],
          max_results: 5,
        }),
      });

      expect(generalSearch.ok).toBe(true);

      // Test specialized runbook search
      const runbookSearch = await fetch(`${SERVER_URL}/api/runbooks/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert_type: 'disk_space_critical',
          severity: 'critical',
          affected_systems: ['filesystem'],
        }),
      });

      expect(runbookSearch.ok).toBe(true);
    });
  });

  describe('Documentation Examples Validation', () => {
    test('DEMO-GUIDE.md curl examples work', async () => {
      // Test the general search example from DEMO-GUIDE.md
      const response = await fetch(`${SERVER_URL}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'disk space critical',
          categories: ['runbooks'],
          max_results: 5,
        }),
      });

      expect(response.ok).toBe(true);
      const data = (await response.json()) as any;
      expect(data.success).toBe(true);
    });

    test('API.md examples work correctly', async () => {
      // Test the quick example from API.md
      const response = await fetch(`${SERVER_URL}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'memory pressure',
          max_results: 3,
        }),
      });

      expect(response.ok).toBe(true);
      const data = (await response.json()) as any;
      expect(data.success).toBe(true);
    });
  });
});

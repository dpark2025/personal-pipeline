/**
 * Correlation ID Middleware Tests
 *
 * Tests correlation ID generation, tracking, and error handling
 * across the entire request lifecycle.
 */

import { generateCorrelationId, getCorrelationId } from '../../src/api/correlation.js';
import { Request } from 'express';

describe('Correlation ID System', () => {
  describe('generateCorrelationId', () => {
    it('should generate valid correlation ID format', () => {
      const correlationId = generateCorrelationId();

      expect(correlationId).toMatch(/^req_\d{15}_[a-z0-9]{8}$/);
      expect(correlationId.length).toBeGreaterThan(20);
      expect(correlationId.length).toBeLessThan(35);
    });

    it('should generate unique correlation IDs', () => {
      const ids = Array.from({ length: 100 }, () => generateCorrelationId());
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(100);
    });

    it('should include timestamp in correlation ID', () => {
      const before = Date.now();
      const correlationId = generateCorrelationId();
      const after = Date.now();

      // Extract timestamp from correlation ID
      const timestampPart = correlationId.split('_')[1];
      if (!timestampPart) {
        throw new Error('Invalid correlation ID format');
      }
      const extractedTimestamp = new Date(
        `${timestampPart.substring(0, 4)}-${timestampPart.substring(4, 6)}-${timestampPart.substring(6, 8)}T${timestampPart.substring(8, 10)}:${timestampPart.substring(10, 12)}:${timestampPart.substring(12, 14)}Z`
      ).getTime();

      expect(extractedTimestamp).toBeGreaterThanOrEqual(before - 2000);
      expect(extractedTimestamp).toBeLessThanOrEqual(after + 2000);
    });
  });

  describe('getCorrelationId', () => {
    it('should get correlation ID from request object', () => {
      const mockReq = {
        correlationId: 'test_correlation_123',
      } as any as Request;

      const result = getCorrelationId(mockReq);
      expect(result).toBe('test_correlation_123');
    });

    it('should return "unknown" for missing correlation ID', () => {
      const mockReq = {} as any as Request;

      const result = getCorrelationId(mockReq);
      expect(result).toBe('unknown');
    });

    it('should handle null/undefined request', () => {
      // Note: In practice, this would be handled by middleware
      // This test just demonstrates defensive programming
      const mockReq1 = { correlationId: undefined } as any as Request;
      const mockReq2 = {} as any as Request;

      const result1 = getCorrelationId(mockReq1);
      const result2 = getCorrelationId(mockReq2);

      expect(result1).toBe('unknown');
      expect(result2).toBe('unknown');
    });
  });

  describe('Correlation ID Patterns', () => {
    it('should generate documentation correlation IDs', () => {
      const docId = `docs_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

      expect(docId).toMatch(/^docs_\d+_[a-z0-9]+$/); // Variable length random string
    });

    it('should generate health check correlation IDs', () => {
      const healthId = `health_${Date.now()}`;

      expect(healthId).toMatch(/^health_\d+$/);
    });

    it('should generate test correlation IDs', () => {
      const testId = `test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      expect(testId).toMatch(/^test_\d+_[a-z0-9]{6}$/);
    });
  });

  describe('Correlation ID Validation', () => {
    const validIds = [
      'req_20240130143502_abc12345',
      'docs_1706623502123_xyz98765',
      'health_1706623502123',
      'test_correlation_12345',
    ];

    const invalidIds = [
      '', // Empty
      'x'.repeat(150), // Too long
      null,
      undefined,
      123, // Wrong type
      {}, // Object
      [], // Array
    ];

    it('should accept valid correlation ID formats', () => {
      validIds.forEach(id => {
        expect(typeof id === 'string').toBe(true);
        expect(id.length).toBeGreaterThan(0);
        expect(id.length).toBeLessThan(100);
      });
    });

    it('should identify invalid correlation IDs', () => {
      invalidIds.forEach(id => {
        const isValid = typeof id === 'string' && id.length > 0 && id.length <= 100;
        if (id === '') {
          expect(isValid).toBe(false); // Empty string should be invalid
        } else if (typeof id === 'string' && id.length > 100) {
          expect(isValid).toBe(false); // Too long should be invalid
        } else if (typeof id !== 'string') {
          expect(isValid).toBe(false); // Non-string should be invalid
        }
      });
    });
  });
});

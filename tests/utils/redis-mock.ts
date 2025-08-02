/**
 * Redis Mock Utility for Testing
 * 
 * Provides a complete Redis mock that simulates Redis behavior without requiring
 * a real Redis instance. Supports all Redis operations used by the cache service.
 */

import { EventEmitter } from 'events';

export interface RedisMockOptions {
  simulateLatency?: boolean;
  latencyMs?: number;
  simulateErrors?: boolean;
  errorRate?: number;
}

export class RedisMock extends EventEmitter {
  private data: Map<string, { value: string; expiry?: number }> = new Map();
  private connected: boolean = false;
  private options: RedisMockOptions;
  public status: string = 'wait';

  constructor(url?: string, config?: any, options: RedisMockOptions = {}) {
    super();
    this.options = {
      simulateLatency: false,
      latencyMs: 10,
      simulateErrors: false,
      errorRate: 0.1,
      ...options,
    };
  }

  async connect(): Promise<void> {
    if (this.options.simulateLatency) {
      await new Promise(resolve => setTimeout(resolve, this.options.latencyMs));
    }

    if (this.options.simulateErrors && Math.random() < this.options.errorRate!) {
      const error = new Error('ECONNREFUSED: Connection refused');
      this.emit('error', error);
      throw error;
    }

    this.connected = true;
    this.status = 'ready';
    this.emit('connect');
    this.emit('ready');
    return Promise.resolve();
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.status = 'end';
    this.emit('end');
    this.emit('close');
  }

  async quit(): Promise<string> {
    await this.disconnect();
    return 'OK';
  }

  async ping(): Promise<string> {
    if (!this.connected) {
      throw new Error('Connection is closed');
    }
    return 'PONG';
  }

  async get(key: string): Promise<string | null> {
    if (!this.connected) {
      throw new Error('Connection is closed');
    }

    if (this.options.simulateLatency) {
      await new Promise(resolve => setTimeout(resolve, this.options.latencyMs));
    }

    const entry = this.data.get(key);
    if (!entry) {
      return null;
    }

    // Check expiry
    if (entry.expiry && Date.now() > entry.expiry) {
      this.data.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(key: string, value: string): Promise<string> {
    if (!this.connected) {
      throw new Error('Connection is closed');
    }

    if (this.options.simulateLatency) {
      await new Promise(resolve => setTimeout(resolve, this.options.latencyMs));
    }

    this.data.set(key, { value });
    return 'OK';
  }

  async setex(key: string, seconds: number, value: string): Promise<string> {
    if (!this.connected) {
      throw new Error('Connection is closed');
    }

    if (this.options.simulateLatency) {
      await new Promise(resolve => setTimeout(resolve, this.options.latencyMs));
    }

    const expiry = Date.now() + seconds * 1000;
    this.data.set(key, { value, expiry });
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    if (!this.connected) {
      throw new Error('Connection is closed');
    }

    if (this.options.simulateLatency) {
      await new Promise(resolve => setTimeout(resolve, this.options.latencyMs));
    }

    let deletedCount = 0;
    keys.forEach(key => {
      if (this.data.delete(key)) {
        deletedCount++;
      }
    });
    return deletedCount;
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.connected) {
      throw new Error('Connection is closed');
    }

    if (this.options.simulateLatency) {
      await new Promise(resolve => setTimeout(resolve, this.options.latencyMs));
    }

    // Simple pattern matching for tests (supports * wildcard)
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return Array.from(this.data.keys()).filter(key => regex.test(key));
  }

  async flushall(): Promise<string> {
    if (!this.connected) {
      throw new Error('Connection is closed');
    }

    if (this.options.simulateLatency) {
      await new Promise(resolve => setTimeout(resolve, this.options.latencyMs));
    }

    this.data.clear();
    return 'OK';
  }

  // Mock Redis event methods
  on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  once(event: string, listener: (...args: any[]) => void): this {
    return super.once(event, listener);
  }

  removeAllListeners(event?: string): this {
    return super.removeAllListeners(event);
  }

  // Utility methods for testing
  getMockData(): Map<string, { value: string; expiry?: number }> {
    return this.data;
  }

  setConnected(connected: boolean): void {
    this.connected = connected;
    this.status = connected ? 'ready' : 'end';
  }

  simulateError(error: Error): void {
    this.emit('error', error);
  }

  simulateReconnect(): void {
    this.emit('reconnecting');
    // Use Promise.resolve().then() for more deterministic timing in tests
    Promise.resolve().then(() => {
      this.connected = true;
      this.status = 'ready';
      this.emit('ready');
    });
  }

  getKeyCount(): number {
    return this.data.size;
  }

  hasKey(key: string): boolean {
    return this.data.has(key);
  }
}

/**
 * Mock Redis module for ioredis
 */
export function createRedisMock(options: RedisMockOptions = {}): typeof RedisMock {
  return class extends RedisMock {
    constructor(url?: string, config?: any) {
      super(url, config, options);
    }
  };
}

/**
 * Mock Redis connection factory for testing
 */
export function mockRedisConnection(options: RedisMockOptions = {}): RedisMock {
  return new RedisMock(undefined, undefined, options);
}

/**
 * Helper to mock ioredis module
 */
export function mockIoRedis(options: RedisMockOptions = {}) {
  const MockedRedis = createRedisMock(options);
  
  // Mock the default export of ioredis
  return MockedRedis;
}
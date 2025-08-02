// Mock for node-cache
class MockNodeCache {
  constructor(options) {
    this.cache = new Map();
    this.options = options || {};
    this.eventHandlers = new Map();
  }

  get(key) {
    return this.cache.get(key);
  }

  set(key, value, ttl) {
    this.cache.set(key, value);
    // Emit set event if handler exists
    const handlers = this.eventHandlers.get('set');
    if (handlers) {
      handlers.forEach(handler => handler(key, value));
    }
    return true;
  }

  keys() {
    return Array.from(this.cache.keys());
  }

  flushAll() {
    this.cache.clear();
  }

  del(key) {
    // Handle array of keys (used by clearByType)
    if (Array.isArray(key)) {
      let deletedCount = 0;
      for (const k of key) {
        if (this.cache.delete(k)) {
          deletedCount++;
          // Emit del event if handler exists
          const handlers = this.eventHandlers.get('del');
          if (handlers) {
            handlers.forEach(handler => handler(k));
          }
        }
      }
      return deletedCount;
    }
    
    // Handle single key
    const result = this.cache.delete(key);
    // Emit del event if handler exists
    const handlers = this.eventHandlers.get('del');
    if (handlers) {
      handlers.forEach(handler => handler(key));
    }
    return result ? 1 : 0;
  }

  // Additional node-cache methods
  getStats() {
    return {
      keys: this.cache.size,
      hits: 100,
      misses: 10,
      ksize: this.cache.size,
      vsize: this.cache.size * 100, // Mock value size
    };
  }

  has(key) {
    return this.cache.has(key);
  }

  ttl(key) {
    // Mock TTL - return some positive value for existing keys
    return this.cache.has(key) ? 300 : undefined;
  }

  getTtl(key) {
    // Mock TTL getter - return timestamp for existing keys
    return this.cache.has(key) ? Date.now() + 300000 : undefined;
  }

  // Clear by prefix (used for clearByType functionality)
  keys() {
    return Array.from(this.cache.keys());
  }

  // Event emitter methods
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  off(event, handler) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }
}

module.exports = MockNodeCache;
module.exports.default = MockNodeCache;
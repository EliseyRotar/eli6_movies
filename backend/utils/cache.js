const DEFAULT_TTL_MS = Number(process.env.CACHE_TTL_MS || 60 * 60 * 1000); // 1 h default

class MemoryCache {
    constructor(ttl = DEFAULT_TTL_MS) {
        this.ttl = ttl;
        this.store = new Map();
    }

    get(key) {
        const entry = this.store.get(key);
        if (!entry) return null;
        if (Date.now() - entry.timestamp < (entry.ttl ?? this.ttl)) return entry.value;
        this.store.delete(key);
        return null;
    }

    // ttl is optional — omit to use the instance default
    set(key, value, ttl) {
        this.store.set(key, { value, timestamp: Date.now(), ttl });
    }

    del(key) { this.store.delete(key); }
    flush() { this.store.clear(); }
}

module.exports = new MemoryCache();

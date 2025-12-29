const DEFAULT_TTL_MS = Number(process.env.CACHE_TTL_MS || 5 * 60 * 1000);

class MemoryCache {
    constructor(ttl = DEFAULT_TTL_MS) {
        this.ttl = ttl;
        this.store = new Map();
    }

    _isFresh(entry) {
        return entry && Date.now() - entry.timestamp < this.ttl;
    }

    get(key) {
        const entry = this.store.get(key);
        if (this._isFresh(entry)) return entry.value;
        this.store.delete(key);
        return null;
    }

    set(key, value) {
        this.store.set(key, { value, timestamp: Date.now() });
    }
}

module.exports = new MemoryCache();

const BUCKETS = {
    auth: {
        max: Number(process.env.RL_AUTH_MAX || 10),
        window: Number(process.env.RL_AUTH_WINDOW_MS || 15 * 60 * 1000),
    },
    api: {
        max: Number(process.env.RL_API_MAX || 200),
        window: Number(process.env.RL_API_WINDOW_MS || 15 * 60 * 1000),
    },
    admin: {
        max: Number(process.env.RL_ADMIN_MAX || 500),
        window: Number(process.env.RL_ADMIN_WINDOW_MS || 15 * 60 * 1000),
    },
};

const store = new Map();

const pickBucket = (path) => {
    if (path.startsWith('/api/admin')) return 'admin';
    if (path.startsWith('/api/register') || path.startsWith('/api/login')) return 'auth';
    return 'api';
};

function rateLimit(req, res, next) {
    const bucketKey = pickBucket(req.path);
    const bucket = BUCKETS[bucketKey] || BUCKETS.api;
    const now = Date.now();
    const clientIP = req.ip || req.socket.remoteAddress;
    const key = `${clientIP}:${bucketKey}`;

    const entry = store.get(key);
    if (!entry || now > entry.reset) {
        store.set(key, { count: 1, reset: now + bucket.window });
    } else if (entry.count >= bucket.max) {
        const retryAfter = Math.ceil((entry.reset - now) / 1000);
        res.setHeader('Retry-After', retryAfter);
        res.setHeader('X-RateLimit-Limit', bucket.max);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', new Date(entry.reset).toISOString());
        return res.status(429).json({ error: 'RATE_LIMITED', retryAfter });
    } else {
        entry.count += 1;
    }

    const current = store.get(key);
    res.setHeader('X-RateLimit-Limit', bucket.max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, bucket.max - current.count));
    res.setHeader('X-RateLimit-Reset', new Date(current.reset).toISOString());

    // Opportunistic cleanup
    if (store.size > 10000) {
        for (const [k, v] of store) {
            if (now > v.reset) {
                store.delete(k);
            }
        }
    }

    return next();
}

module.exports = rateLimit;

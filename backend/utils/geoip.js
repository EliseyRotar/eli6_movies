const axios = require('axios');

const cache = new Map();
const TTL   = 24 * 60 * 60 * 1000;
const MAX   = 10000;
const LOCAL = new Set(['::1', '127.0.0.1', '::ffff:127.0.0.1', 'localhost']);

// Simple circuit breaker: after 5 consecutive failures back off for 5 min
let failures   = 0;
let backoffUntil = 0;
const FAIL_THRESHOLD = 5;
const BACKOFF_MS     = 5 * 60 * 1000;

async function geoLookup(ip) {
    if (!ip) return {};
    const clean = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
    if (LOCAL.has(clean)) return { country: 'Local', countryCode: 'LO', city: 'localhost' };

    const hit = cache.get(clean);
    if (hit && Date.now() < hit.exp) return hit.data;

    if (Date.now() < backoffUntil) return {};

    try {
        const { data } = await axios.get(
            `http://ip-api.com/json/${encodeURIComponent(clean)}?fields=status,country,countryCode,city`,
            { timeout: 2500 }
        );
        if (data.status === 'success') {
            const geo = { country: data.country || null, countryCode: data.countryCode || null, city: data.city || null };
            if (cache.size >= MAX) cache.delete(cache.keys().next().value);
            cache.set(clean, { data: geo, exp: Date.now() + TTL });
            failures = 0;
            return geo;
        }
        if (data.status === 'fail' && data.message === 'quota') {
            backoffUntil = Date.now() + BACKOFF_MS;
        }
    } catch (_) {
        failures++;
        if (failures >= FAIL_THRESHOLD) {
            backoffUntil = Date.now() + BACKOFF_MS;
            failures = 0;
        }
    }
    return {};
}

module.exports = { geoLookup };

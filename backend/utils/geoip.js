const axios = require('axios');

const cache = new Map();
const TTL   = 24 * 60 * 60 * 1000;
const MAX   = 10000;
const LOCAL = new Set(['::1', '127.0.0.1', '::ffff:127.0.0.1', 'localhost']);

// Simple circuit breaker: after 5 consecutive failures back off for 5 min
let failures     = 0;
let backoffUntil = 0;
const FAIL_THRESHOLD = 5;
const BACKOFF_MS     = 5 * 60 * 1000;

// Private IP ranges — ip-api.com returns "fail" for these, skip the request
const PRIVATE_RE = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|::1$|fc00:|fd)/i;

async function geoLookup(ip) {
    if (!ip) return {};
    const clean = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
    if (LOCAL.has(clean)) return { country: 'Local', countryCode: 'LO', city: 'localhost', isp: null };
    if (PRIVATE_RE.test(clean)) return {};  // internal/infrastructure IP — skip lookup

    const hit = cache.get(clean);
    if (hit && Date.now() < hit.exp) return hit.data;

    if (Date.now() < backoffUntil) return {};

    try {
        const { data } = await axios.get(
            // HTTPS to prevent MITM injection of country/ISP fields that end up
            // in the admin analytics dashboard. NOTE: ip-api.com's free tier is
            // HTTP-only; if the request 401s, set IPAPI_KEY (pro plan) or swap
            // the host to a free HTTPS provider (ipinfo.io, freeipapi.com).
            // The module already has a circuit breaker so failures degrade to
            // empty-geo silently.
            `https://ip-api.com/json/${encodeURIComponent(clean)}?fields=status,country,countryCode,city,org${process.env.IPAPI_KEY ? `&key=${process.env.IPAPI_KEY}` : ''}`,
            { timeout: 2500 }
        );
        if (data.status === 'success') {
            const geo = {
                country:     data.country     || null,
                countryCode: data.countryCode || null,
                city:        data.city        || null,
                isp:         data.org         || null,
            };
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

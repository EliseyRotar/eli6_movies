const axios = require('axios');

const cache = new Map();
const TTL = 24 * 60 * 60 * 1000;
const MAX = 10000;
const LOCAL = new Set(['::1', '127.0.0.1', '::ffff:127.0.0.1', 'localhost']);

async function geoLookup(ip) {
    if (!ip) return {};
    const clean = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
    if (LOCAL.has(clean)) return { country: 'Local', countryCode: 'LO', city: 'localhost' };

    const hit = cache.get(clean);
    if (hit && Date.now() < hit.exp) return hit.data;

    try {
        const { data } = await axios.get(
            `http://ip-api.com/json/${encodeURIComponent(clean)}?fields=status,country,countryCode,city`,
            { timeout: 2500 }
        );
        if (data.status === 'success') {
            const geo = { country: data.country || null, countryCode: data.countryCode || null, city: data.city || null };
            if (cache.size >= MAX) cache.delete(cache.keys().next().value);
            cache.set(clean, { data: geo, exp: Date.now() + TTL });
            return geo;
        }
    } catch (_) {}
    return {};
}

module.exports = { geoLookup };

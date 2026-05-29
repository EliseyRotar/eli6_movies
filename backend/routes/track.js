const express = require('express');
const { UAParser } = require('ua-parser-js');
const optionalAuth = require('../middleware/optionalAuth');
const PageView = require('../models/PageView');
const { geoLookup } = require('../utils/geoip');

const router = express.Router();

// sessionId -> { lastSeen, userId, username, path }
const activeSessions = new Map();

// Evict stale sessions older than 2 min (run opportunistically)
function evictStale() {
    const cutoff = Date.now() - 2 * 60 * 1000;
    for (const [id, s] of activeSessions) {
        if (s.lastSeen < cutoff) activeSessions.delete(id);
    }
}

function extractHost(url) {
    if (!url) return null;
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch (_) { return null; }
}

function parseUA(ua) {
    const r = new UAParser(ua || '').getResult();
    return {
        browser: r.browser.name || 'Unknown',
        os:      r.os.name     || 'Unknown',
        device:  r.device.type || 'desktop',
    };
}

// POST /api/data  — public, receives pageviews + heartbeats + duration updates
router.post('/data', optionalAuth, (req, res) => {
    res.sendStatus(204); // respond immediately; process in background

    setImmediate(async () => {
        try {
            const { type, sid, path, ref, dur } = req.body || {};
            if (!type || !sid) return;

            const safePath = String(path || '/').slice(0, 300);
            const userId   = req.user?._id   || null;
            const username = req.user?.username || null;

            if (type === 'pv') {
                const ip  = req.ip || '';
                const ua  = req.headers['user-agent'] || '';
                const [geo, parsed] = await Promise.all([geoLookup(ip), Promise.resolve(parseUA(ua))]);
                await PageView.create({
                    sessionId:   sid,
                    userId,
                    username,
                    path:        safePath,
                    referrer:    extractHost(ref),
                    ip,
                    country:     geo.country    || null,
                    countryCode: geo.countryCode || null,
                    city:        geo.city        || null,
                    browser:     parsed.browser,
                    os:          parsed.os,
                    device:      parsed.device,
                });
            } else if (type === 'hb') {
                activeSessions.set(sid, { lastSeen: Date.now(), userId, username, path: safePath });
                if (activeSessions.size > 5000) evictStale();
            } else if (type === 'dur' && dur > 0) {
                await PageView.findOneAndUpdate(
                    { sessionId: sid, path: safePath },
                    { $set: { duration: Math.min(Number(dur) || 0, 86400) } },
                    { sort: { createdAt: -1 } }
                );
            }
        } catch (_) {}
    });
});

module.exports = { router, activeSessions };

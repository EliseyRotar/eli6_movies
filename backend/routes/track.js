const express = require('express');
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
    ua = ua || '';
    let browser = 'Other', os = 'Other', device = 'desktop';
    if (/Edg\//.test(ua))          browser = 'Edge';
    else if (/OPR\//.test(ua))     browser = 'Opera';
    else if (/Chrome\//.test(ua))  browser = 'Chrome';
    else if (/Firefox\//.test(ua)) browser = 'Firefox';
    else if (/Safari\//.test(ua))  browser = 'Safari';
    if (/Windows NT/.test(ua))     os = 'Windows';
    else if (/Android/.test(ua))   { os = 'Android'; device = 'mobile'; }
    else if (/iPhone/.test(ua))    { os = 'iOS';     device = 'mobile'; }
    else if (/iPad/.test(ua))      { os = 'iOS';     device = 'tablet'; }
    else if (/Mac OS X/.test(ua))  os = 'macOS';
    else if (/Linux/.test(ua))     os = 'Linux';
    if (/Mobi/.test(ua) && device === 'desktop') device = 'mobile';
    return { browser, os, device };
}

// POST /api/data  — public, receives pageviews + heartbeats + duration updates
// Accepts both application/json and text/plain (sendBeacon uses text/plain to avoid CORS preflight)
router.post('/data', optionalAuth, (req, res) => {
    res.sendStatus(204); // respond immediately; process in background

    setImmediate(async () => {
        try {
            let body = req.body;
            if (typeof body === 'string') {
                try { body = JSON.parse(body); } catch (_) { return; }
            }
            body = body || {};
            const { type, sid, path, ref, dur } = body;
            if (!type || !sid) return;

            const safePath = String(path || '/').slice(0, 300);
            const userId   = req.user?._id   || null;
            const username = req.user?.username || null;

            if (type === 'pv') {
                const ip  = req.ip || '';
                const ua  = req.headers['user-agent'] || '';
                const utmSource   = typeof body.utm_source   === 'string' ? body.utm_source.slice(0, 100)   : null;
                const utmMedium   = typeof body.utm_medium   === 'string' ? body.utm_medium.slice(0, 100)   : null;
                const utmCampaign = typeof body.utm_campaign === 'string' ? body.utm_campaign.slice(0, 100) : null;
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
                    utmSource,
                    utmMedium,
                    utmCampaign,
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

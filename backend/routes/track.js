const express = require('express');
const optionalAuth = require('../middleware/optionalAuth');
const PageView = require('../models/PageView');
const { geoLookup } = require('../utils/geoip');

const router = express.Router();

// sessionId -> { lastSeen, userId, username, path }
const activeSessions = new Map();

// The site's own hostname — referrers matching this are internal navigation, not real referrers
const SITE_HOST = (process.env.SITE_HOST || 'eli6movies.vercel.app').replace(/^www\./, '');

// Evict stale sessions older than 2 min (run opportunistically)
function evictStale() {
    const cutoff = Date.now() - 2 * 60 * 1000;
    for (const [id, s] of activeSessions) {
        if (s.lastSeen < cutoff) activeSessions.delete(id);
    }
}

function extractHost(url) {
    if (!url) return null;
    try {
        const host = new URL(url).hostname.replace(/^www\./, '');
        return host === SITE_HOST ? null : host;  // filter self-referrers
    } catch (_) { return null; }
}

// Render routes requests through multiple internal proxy hops (all 10.x.x.x).
// We iterate every possible IP source and return the first public (non-private) IP.
const PRIV_RE = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|::1$|fc00:|fd)/i;

function isPrivate(ip) {
    const clean = (ip || '').replace(/^::ffff:/, '');
    return !clean || PRIV_RE.test(clean);
}

function getClientIp(req) {
    const candidates = [
        req.headers['cf-connecting-ip'],               // Cloudflare (if ever added)
        req.headers['true-client-ip'],                  // Akamai / Cloudflare Enterprise
        req.headers['x-real-ip'],                       // Nginx
        ...(req.headers['x-forwarded-for'] || '').split(','),
        req.ip,
    ].map(s => (s || '').trim().replace(/^::ffff:/, '')).filter(Boolean);

    return candidates.find(ip => !isPrivate(ip)) || '';
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
            const type = typeof body.type === 'string' ? body.type : '';
            const sid  = typeof body.sid  === 'string' ? body.sid.slice(0, 128) : '';
            const path = body.path;
            const ref  = body.ref;
            const dur  = body.dur;
            if (!type || !sid) return;

            const safePath = String(path || '/').slice(0, 300);
            const userId   = req.user?._id   || null;
            const username = req.user?.username || null;

            if (type === 'pv') {
                const ip  = getClientIp(req);
                const ua  = req.headers['user-agent'] || '';
                const utmSource   = typeof body.utm_source   === 'string' ? body.utm_source.slice(0, 100)   : null;
                const utmMedium   = typeof body.utm_medium   === 'string' ? body.utm_medium.slice(0, 100)   : null;
                const utmCampaign = typeof body.utm_campaign === 'string' ? body.utm_campaign.slice(0, 100) : null;
                const utmContent  = typeof body.utm_content  === 'string' ? body.utm_content.slice(0, 100)  : null;
                const [geo, parsed] = await Promise.all([geoLookup(ip), Promise.resolve(parseUA(ua))]);
                await PageView.create({
                    sessionId:   sid,
                    userId,
                    username,
                    path:        safePath,
                    referrer:    extractHost(ref),
                    ip,
                    country:     geo.country     || null,
                    countryCode: geo.countryCode  || null,
                    city:        geo.city         || null,
                    isp:         geo.isp          || null,
                    browser:     parsed.browser,
                    os:          parsed.os,
                    device:      parsed.device,
                    utmSource,
                    utmMedium,
                    utmCampaign,
                    utmContent,
                });
            } else if (type === 'hb') {
                activeSessions.set(sid, { lastSeen: Date.now(), userId, username, path: safePath });
                if (activeSessions.size > 5000) evictStale();
            } else if (type === 'dur' && dur > 0) {
                await PageView.findOneAndUpdate(
                    { sessionId: sid, path: safePath },
                    { $max: { duration: Math.min(Number(dur) || 0, 86400) } },
                    { sort: { createdAt: -1 } }
                );
            }
        } catch (_) {}
    });
});

module.exports = { router, activeSessions };

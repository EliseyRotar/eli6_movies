const express = require('express');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const PageView = require('../models/PageView');
const ActivityLog = require('../models/ActivityLog');
const Event = require('../models/Event');
const WebVital = require('../models/WebVital');
const JSError = require('../models/JSError');
const User = require('../models/User');
const { activeSessions } = require('./track');

const SITE_HOST = (process.env.SITE_HOST || 'eli6movies.vercel.app').replace(/^www\./, '');

const router = express.Router();
router.use('/admin/analytics', auth, adminOnly);

function getFrom(range) {
    const now = Date.now();
    switch (range) {
        case '1d':  return new Date(now - 1  * 24 * 60 * 60 * 1000);
        case '30d': return new Date(now - 30 * 24 * 60 * 60 * 1000);
        case 'all': return new Date(0);
        default:    return new Date(now - 7  * 24 * 60 * 60 * 1000);
    }
}

// GET /admin/analytics/live
router.get('/admin/analytics/live', (req, res) => {
    const cutoff = Date.now() - 2 * 60 * 1000;
    let anon = 0, loggedIn = 0;
    const recent = [];
    for (const [, s] of activeSessions) {
        if (s.lastSeen >= cutoff) {
            s.userId ? loggedIn++ : anon++;
            recent.push({ username: s.username, path: s.path, lastSeen: s.lastSeen });
        }
    }
    recent.sort((a, b) => b.lastSeen - a.lastSeen);
    res.json({ total: anon + loggedIn, anon, loggedIn, sessions: recent.slice(0, 20) });
});

router.get('/admin/analytics/overview', async (req, res, next) => {
    try {
        const from = getFrom(req.query.range);
        const periodLen = req.query.range === 'all' ? 0 : (Date.now() - from.getTime());
        const prevFrom  = periodLen ? new Date(from.getTime() - periodLen) : null;
        const dayAgo    = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const queries = [
            PageView.countDocuments(),
            PageView.countDocuments({ createdAt: { $gte: from } }),
            prevFrom ? PageView.countDocuments({ createdAt: { $gte: prevFrom, $lt: from } }) : Promise.resolve(null),
            PageView.countDocuments({ createdAt: { $gte: dayAgo } }),
            PageView.distinct('sessionId', { createdAt: { $gte: from } }).then(r => r.length),
            prevFrom ? PageView.distinct('sessionId', { createdAt: { $gte: prevFrom, $lt: from } }).then(r => r.length) : Promise.resolve(null),
            PageView.distinct('userId', { createdAt: { $gte: from }, userId: { $ne: null } }).then(r => r.length),
            PageView.aggregate([
                { $match: { createdAt: { $gte: from }, duration: { $gt: 0, $lt: 7200 } } },
                { $group: { _id: null, avg: { $avg: '$duration' } } },
            ]),
            // bounce = sessions with 1 pageview
            PageView.aggregate([
                { $match: { createdAt: { $gte: from } } },
                { $group: { _id: '$sessionId', count: { $sum: 1 } } },
                { $group: { _id: null, total: { $sum: 1 }, bounced: { $sum: { $cond: [{ $eq: ['$count', 1] }, 1, 0] } } } },
            ]),
            ActivityLog.countDocuments({ event: 'register', createdAt: { $gte: from } }),
            prevFrom ? ActivityLog.countDocuments({ event: 'register', createdAt: { $gte: prevFrom, $lt: from } }) : Promise.resolve(null),
        ];

        const [total, period, prevPeriod, today, uniqueSessions, prevUnique, uniqueUsers, avgDurAgg, bounceAgg, newUsers, prevNewUsers] = await Promise.all(queries);

        const avgDuration = avgDurAgg[0] ? Math.round(avgDurAgg[0].avg) : null;
        const b = bounceAgg[0] || {};
        const bounceRate = b.total > 0 ? Math.round((b.bounced / b.total) * 100) : null;

        res.json({
            total, period, prevPeriod, today,
            uniqueSessions, prevUnique, uniqueUsers,
            avgDuration, bounceRate, newUsers, prevNewUsers,
        });
    } catch (err) { next(err); }
});

router.get('/admin/analytics/daily', async (req, res, next) => {
    try {
        const from = getFrom(req.query.range);
        const data = await PageView.aggregate([
            { $match: { createdAt: { $gte: from } } },
            { $group: {
                _id:      { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                views:    { $sum: 1 },
                uniq:     { $addToSet: '$sessionId' },
                avgDur:   { $avg: { $cond: [{ $gt: ['$duration', 0] }, '$duration', null] } },
            }},
            { $project: { _id: 1, views: 1, uniq: { $size: '$uniq' }, avgDur: { $ifNull: ['$avgDur', 0] } } },
            { $sort: { _id: 1 } },
        ]);
        res.json(data);
    } catch (err) { next(err); }
});

router.get('/admin/analytics/pages', async (req, res, next) => {
    try {
        const from = getFrom(req.query.range);
        const data = await PageView.aggregate([
            { $match: { createdAt: { $gte: from } } },
            { $group: {
                _id:    '$path',
                count:  { $sum: 1 },
                uniq:   { $addToSet: '$sessionId' },
                avgDur: { $avg: { $cond: [{ $gt: ['$duration', 0] }, '$duration', null] } },
            }},
            { $project: { _id: 1, count: 1, uniq: { $size: '$uniq' }, avgDur: { $ifNull: ['$avgDur', 0] } } },
            { $sort: { count: -1 } },
            { $limit: 15 },
        ]);
        res.json(data);
    } catch (err) { next(err); }
});

router.get('/admin/analytics/countries', async (req, res, next) => {
    try {
        const from = getFrom(req.query.range);
        const data = await PageView.aggregate([
            { $match: { createdAt: { $gte: from }, country: { $nin: [null, ''] } } },
            { $group: { _id: { country: '$country', code: '$countryCode' }, count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 15 },
        ]);
        res.json(data);
    } catch (err) { next(err); }
});

router.get('/admin/analytics/cities', async (req, res, next) => {
    try {
        const from = getFrom(req.query.range);
        const data = await PageView.aggregate([
            { $match: { createdAt: { $gte: from }, city: { $nin: [null, ''] } } },
            { $group: { _id: { city: '$city', country: '$country', code: '$countryCode' }, count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 15 },
        ]);
        res.json(data);
    } catch (err) { next(err); }
});

router.get('/admin/analytics/devices', async (req, res, next) => {
    try {
        const from = getFrom(req.query.range);
        const data = await PageView.aggregate([
            { $match: { createdAt: { $gte: from } } },
            { $group: { _id: '$device', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]);
        res.json(data);
    } catch (err) { next(err); }
});

router.get('/admin/analytics/browsers', async (req, res, next) => {
    try {
        const from = getFrom(req.query.range);
        const data = await PageView.aggregate([
            { $match: { createdAt: { $gte: from }, browser: { $nin: [null, 'Unknown'] } } },
            { $group: { _id: '$browser', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
        ]);
        res.json(data);
    } catch (err) { next(err); }
});

router.get('/admin/analytics/os', async (req, res, next) => {
    try {
        const from = getFrom(req.query.range);
        const data = await PageView.aggregate([
            { $match: { createdAt: { $gte: from }, os: { $nin: [null, 'Unknown', ''] } } },
            { $group: { _id: '$os', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
        ]);
        res.json(data);
    } catch (err) { next(err); }
});

router.get('/admin/analytics/referrers', async (req, res, next) => {
    try {
        const from = getFrom(req.query.range);
        const data = await PageView.aggregate([
            { $match: { createdAt: { $gte: from }, referrer: { $nin: [null, '', SITE_HOST] } } },
            { $group: { _id: '$referrer', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
        ]);
        res.json(data);
    } catch (err) { next(err); }
});

router.get('/admin/analytics/campaigns', async (req, res, next) => {
    try {
        const from = getFrom(req.query.range);
        const data = await PageView.aggregate([
            { $match: { createdAt: { $gte: from }, utmSource: { $nin: [null, ''] } } },
            { $group: {
                _id:      { source: '$utmSource', medium: '$utmMedium', campaign: '$utmCampaign', content: '$utmContent' },
                views:    { $sum: 1 },
                sessions: { $addToSet: '$sessionId' },
            }},
            { $project: { _id: 1, views: 1, sessions: { $size: '$sessions' } } },
            { $sort:  { views: -1 } },
            { $limit: 30 },
        ]);
        res.json(data);
    } catch (err) { next(err); }
});

router.get('/admin/analytics/hourly', async (req, res, next) => {
    try {
        const from = getFrom(req.query.range);
        const data = await PageView.aggregate([
            { $match: { createdAt: { $gte: from } } },
            { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]);
        const result = Array.from({ length: 24 }, (_, h) => ({
            hour: h,
            count: (data.find(d => d._id === h) || {}).count || 0,
        }));
        res.json(result);
    } catch (err) { next(err); }
});

router.get('/admin/analytics/user-growth', async (req, res, next) => {
    try {
        const from = getFrom(req.query.range);
        const data = await ActivityLog.aggregate([
            { $match: { event: 'register', createdAt: { $gte: from } } },
            { $group: {
                _id:   { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 },
            }},
            { $sort: { _id: 1 } },
        ]);
        res.json(data);
    } catch (err) { next(err); }
});

router.post('/admin/analytics/migrate', async (req, res, next) => {
    try {
        const { geoLookup } = require('../utils/geoip');
        const PRIV_RE = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.)/;

        // 1) Fix self-referrers in bulk
        const refFix = await PageView.updateMany(
            { referrer: SITE_HOST },
            { $set: { referrer: null } }
        );

        // 2) Geo-enrich records that have a real IP but no country (batched, max 500)
        const orphans = await PageView.find({
            country: null,
            ip: { $exists: true, $nin: [null, ''] },
        }).select('_id ip').limit(500).lean();

        let geoFixed = 0;
        for (const doc of orphans) {
            const clean = (doc.ip || '').replace(/^::ffff:/, '');
            if (!clean || PRIV_RE.test(clean)) continue;
            const geo = await geoLookup(clean);
            if (geo.country) {
                await PageView.updateOne(
                    { _id: doc._id },
                    { $set: { country: geo.country, countryCode: geo.countryCode, city: geo.city, isp: geo.isp } }
                );
                geoFixed++;
            }
        }

        res.json({
            referrersFixed: refFix.modifiedCount,
            geoEnriched: geoFixed,
            note: 'Private IPs (10.x.x.x) cannot be geo-located — those records were never captured with real IPs.',
        });
    } catch (err) { next(err); }
});

// GET /admin/analytics/debug-ip — shows what IP headers the server receives (for diagnosing proxy issues)
router.get('/admin/analytics/debug-ip', (req, res) => {
    res.json({
        'req.ip':              req.ip,
        'x-forwarded-for':     req.headers['x-forwarded-for'] || null,
        'x-real-ip':           req.headers['x-real-ip'] || null,
        'cf-connecting-ip':    req.headers['cf-connecting-ip'] || null,
        'true-client-ip':      req.headers['true-client-ip'] || null,
        'socket.remoteAddress': req.socket?.remoteAddress || null,
    });
});

// GET /admin/analytics/recent?limit=50
router.get('/admin/analytics/recent', async (req, res, next) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 50, 100);
        const data  = await PageView.find().sort({ createdAt: -1 }).limit(limit).lean();
        res.json(data);
    } catch (err) { next(err); }
});

// GET /admin/analytics/auth-log?limit=100
router.get('/admin/analytics/auth-log', async (req, res, next) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 100, 200);
        const data  = await ActivityLog.find().sort({ createdAt: -1 }).limit(limit).lean();
        res.json(data);
    } catch (err) { next(err); }
});

// ── Per-day sparkline data (last 7 days) for KPI cards ─────────────────
router.get('/admin/analytics/spark', async (req, res, next) => {
    try {
        const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const days = await PageView.aggregate([
            { $match: { createdAt: { $gte: from } } },
            { $group: {
                _id:  { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                views: { $sum: 1 },
                uniq:  { $addToSet: '$sessionId' },
                dur:   { $avg: { $cond: [{ $gt: ['$duration', 0] }, '$duration', null] } },
            }},
            { $project: { _id: 1, views: 1, uniq: { $size: '$uniq' }, dur: { $ifNull: ['$dur', 0] } } },
            { $sort: { _id: 1 } },
        ]);
        const regs = await ActivityLog.aggregate([
            { $match: { event: 'register', createdAt: { $gte: from } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, c: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]);
        const regsMap = Object.fromEntries(regs.map(r => [r._id, r.c]));
        res.json({
            views: days.map(d => d.views),
            uniq:  days.map(d => d.uniq),
            dur:   days.map(d => Math.round(d.dur)),
            newUsers: days.map(d => regsMap[d._id] || 0),
            labels: days.map(d => d._id),
        });
    } catch (err) { next(err); }
});

// ── 7×24 Day-of-week × Hour-of-day heatmap ─────────────────────────────
router.get('/admin/analytics/day-hour', async (req, res, next) => {
    try {
        const from = getFrom(req.query.range);
        const data = await PageView.aggregate([
            { $match: { createdAt: { $gte: from } } },
            { $group: {
                _id:  { day: { $dayOfWeek: '$createdAt' }, hour: { $hour: '$createdAt' } },
                count: { $sum: 1 },
            }},
        ]);
        // Mongo $dayOfWeek: 1=Sunday … 7=Saturday → convert to 0=Mon, 6=Sun
        const cells = Array.from({ length: 7 }, () => Array(24).fill(0));
        data.forEach(d => {
            const day = (d._id.day + 5) % 7; // Mon=0..Sun=6
            cells[day][d._id.hour] = d.count;
        });
        res.json(cells);
    } catch (err) { next(err); }
});

// ── Entry pages (first pageview of each session) ───────────────────────
router.get('/admin/analytics/entry-pages', async (req, res, next) => {
    try {
        const from = getFrom(req.query.range);
        const data = await PageView.aggregate([
            { $match: { createdAt: { $gte: from } } },
            { $sort: { createdAt: 1 } },
            { $group: { _id: '$sessionId', firstPath: { $first: '$path' } } },
            { $group: { _id: '$firstPath', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 15 },
        ]);
        res.json(data);
    } catch (err) { next(err); }
});

// ── Exit pages (last pageview of each session) ─────────────────────────
router.get('/admin/analytics/exit-pages', async (req, res, next) => {
    try {
        const from = getFrom(req.query.range);
        const data = await PageView.aggregate([
            { $match: { createdAt: { $gte: from } } },
            { $sort: { createdAt: 1 } },
            { $group: { _id: '$sessionId', lastPath: { $last: '$path' } } },
            { $group: { _id: '$lastPath', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 15 },
        ]);
        res.json(data);
    } catch (err) { next(err); }
});

// ── Weekly retention cohort (users who returned in following weeks) ────
router.get('/admin/analytics/retention', async (req, res, next) => {
    try {
        const sixWeeks = 6 * 7 * 24 * 60 * 60 * 1000;
        const from = new Date(Date.now() - sixWeeks);
        const sessions = await PageView.aggregate([
            { $match: { createdAt: { $gte: from } } },
            { $group: { _id: '$sessionId', first: { $min: '$createdAt' }, days: { $addToSet: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } } } },
        ]);
        // bucket by week of first seen
        const weekIndex = (d) => Math.floor((Date.now() - d.getTime()) / (7 * 24 * 60 * 60 * 1000));
        const cohorts = {};
        sessions.forEach(s => {
            const w = weekIndex(new Date(s.first));
            if (w < 0 || w > 5) return;
            cohorts[w] = cohorts[w] || { total: 0, returns: [0, 0, 0, 0, 0, 0] };
            cohorts[w].total++;
            const firstDay = new Date(s.first);
            s.days.forEach(dayStr => {
                const d = new Date(dayStr + 'T00:00:00Z');
                const offsetWeeks = Math.floor((d - firstDay) / (7 * 24 * 60 * 60 * 1000));
                if (offsetWeeks >= 0 && offsetWeeks <= 5) cohorts[w].returns[offsetWeeks]++;
            });
        });
        const result = [];
        for (let w = 5; w >= 0; w--) {
            const c = cohorts[w] || { total: 0, returns: [0, 0, 0, 0, 0, 0] };
            result.push({ weeksAgo: w, total: c.total, returns: c.returns });
        }
        res.json(result);
    } catch (err) { next(err); }
});

// ── Top searches ───────────────────────────────────────────────────────
router.get('/admin/analytics/top-searches', async (req, res, next) => {
    try {
        const from = getFrom(req.query.range);
        const data = await Event.aggregate([
            { $match: { name: 'search', createdAt: { $gte: from }, value: { $nin: [null, ''] } } },
            { $group: { _id: { $toLower: '$value' }, count: { $sum: 1 }, sessions: { $addToSet: '$sessionId' } } },
            { $project: { _id: 1, count: 1, sessions: { $size: '$sessions' } } },
            { $sort: { count: -1 } },
            { $limit: 20 },
        ]);
        res.json(data);
    } catch (err) { next(err); }
});

// ── Top watched (player_start events) ──────────────────────────────────
router.get('/admin/analytics/top-watched', async (req, res, next) => {
    try {
        const from = getFrom(req.query.range);
        const data = await Event.aggregate([
            { $match: { name: 'player_start', createdAt: { $gte: from } } },
            { $group: { _id: '$value', count: { $sum: 1 }, sessions: { $addToSet: '$sessionId' } } },
            { $project: { _id: 1, count: 1, sessions: { $size: '$sessions' } } },
            { $sort: { count: -1 } },
            { $limit: 20 },
        ]);
        res.json(data);
    } catch (err) { next(err); }
});

// ── Player drop-off / completion stats ─────────────────────────────────
router.get('/admin/analytics/player-stats', async (req, res, next) => {
    try {
        const from = getFrom(req.query.range);
        const data = await Event.aggregate([
            { $match: { name: { $in: ['player_start', 'player_25', 'player_50', 'player_75', 'player_complete', 'player_error'] }, createdAt: { $gte: from } } },
            { $group: { _id: '$name', count: { $sum: 1 } } },
        ]);
        const map = Object.fromEntries(data.map(d => [d._id, d.count]));
        res.json({
            start: map.player_start || 0,
            q25:   map.player_25 || 0,
            q50:   map.player_50 || 0,
            q75:   map.player_75 || 0,
            complete: map.player_complete || 0,
            error: map.player_error || 0,
        });
    } catch (err) { next(err); }
});

// ── Top events (custom event leaderboard) ──────────────────────────────
router.get('/admin/analytics/events-summary', async (req, res, next) => {
    try {
        const from = getFrom(req.query.range);
        const data = await Event.aggregate([
            { $match: { createdAt: { $gte: from } } },
            { $group: { _id: '$name', count: { $sum: 1 }, sessions: { $addToSet: '$sessionId' } } },
            { $project: { _id: 1, count: 1, sessions: { $size: '$sessions' } } },
            { $sort: { count: -1 } },
            { $limit: 20 },
        ]);
        res.json(data);
    } catch (err) { next(err); }
});

// ── Web vitals (P75 per metric per page) ───────────────────────────────
router.get('/admin/analytics/web-vitals', async (req, res, next) => {
    try {
        const from = getFrom(req.query.range);
        const data = await WebVital.aggregate([
            { $match: { createdAt: { $gte: from } } },
            { $group: {
                _id: '$metric',
                avg: { $avg: '$value' },
                p75: { $avg: '$value' }, // approximation, real P75 would need $percentile
                good: { $sum: { $cond: [{ $eq: ['$rating', 'good'] }, 1, 0] } },
                needs: { $sum: { $cond: [{ $eq: ['$rating', 'needs-improvement'] }, 1, 0] } },
                poor: { $sum: { $cond: [{ $eq: ['$rating', 'poor'] }, 1, 0] } },
                count: { $sum: 1 },
            }},
        ]);
        res.json(data);
    } catch (err) { next(err); }
});

// ── JS errors (recent + grouped) ───────────────────────────────────────
router.get('/admin/analytics/errors', async (req, res, next) => {
    try {
        const from = getFrom(req.query.range);
        const [grouped, recent] = await Promise.all([
            JSError.aggregate([
                { $match: { createdAt: { $gte: from } } },
                { $group: { _id: '$message', count: { $sum: 1 }, sessions: { $addToSet: '$sessionId' }, last: { $max: '$createdAt' }, anyPath: { $first: '$path' } } },
                { $project: { _id: 1, count: 1, sessions: { $size: '$sessions' }, last: 1, anyPath: 1 } },
                { $sort: { count: -1 } },
                { $limit: 15 },
            ]),
            JSError.find({ createdAt: { $gte: from } }).sort({ createdAt: -1 }).limit(20).lean(),
        ]);
        res.json({ grouped, recent });
    } catch (err) { next(err); }
});

// ── Session detail (all pageviews + events for a sessionId) ────────────
router.get('/admin/analytics/session/:sid', async (req, res, next) => {
    try {
        const sid = req.params.sid;
        const [views, events] = await Promise.all([
            PageView.find({ sessionId: sid }).sort({ createdAt: 1 }).limit(200).lean(),
            Event.find({ sessionId: sid }).sort({ createdAt: 1 }).limit(200).lean(),
        ]);
        res.json({ views, events });
    } catch (err) { next(err); }
});

module.exports = router;

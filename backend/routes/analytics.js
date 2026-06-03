const express = require('express');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const PageView = require('../models/PageView');
const ActivityLog = require('../models/ActivityLog');
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

// GET /admin/analytics/overview?range=7d
// Returns current + previous period for trend arrows, plus bounce rate and avg duration
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
            // avg duration
            PageView.aggregate([
                { $match: { createdAt: { $gte: from }, duration: { $gt: 0, $lt: 7200 } } },
                { $group: { _id: null, avg: { $avg: '$duration' } } },
            ]),
            // bounce rate: sessions with only 1 pageview
            PageView.aggregate([
                { $match: { createdAt: { $gte: from } } },
                { $group: { _id: '$sessionId', count: { $sum: 1 } } },
                { $group: { _id: null, total: { $sum: 1 }, bounced: { $sum: { $cond: [{ $eq: ['$count', 1] }, 1, 0] } } } },
            ]),
            // new registrations this period
            ActivityLog.countDocuments({ event: 'register', createdAt: { $gte: from } }),
            // new registrations prev period
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

// GET /admin/analytics/daily?range=7d
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

// GET /admin/analytics/pages?range=7d
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

// GET /admin/analytics/countries?range=7d
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

// GET /admin/analytics/cities?range=7d
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

// GET /admin/analytics/devices?range=7d
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

// GET /admin/analytics/browsers?range=7d
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

// GET /admin/analytics/os?range=7d
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

// GET /admin/analytics/referrers?range=7d
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

// GET /admin/analytics/campaigns?range=7d
router.get('/admin/analytics/campaigns', async (req, res, next) => {
    try {
        const from = getFrom(req.query.range);
        const data = await PageView.aggregate([
            { $match: { createdAt: { $gte: from }, utmSource: { $nin: [null, ''] } } },
            { $group: {
                _id:      { source: '$utmSource', medium: '$utmMedium', campaign: '$utmCampaign' },
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

// GET /admin/analytics/hourly?range=7d  — 24-slot traffic distribution
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

// GET /admin/analytics/user-growth?range=7d
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

// POST /admin/analytics/migrate — one-time fix for historical data
// • Nulls out self-referrers (eli6movies.vercel.app stored in old records)
// • Re-runs geo lookup for any records that have a real (non-private) IP but no country
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
            ip: { $exists: true, $ne: null, $ne: '' },
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

module.exports = router;

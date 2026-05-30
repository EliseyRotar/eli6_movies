const express = require('express');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const PageView = require('../models/PageView');
const ActivityLog = require('../models/ActivityLog');
const { activeSessions } = require('./track');

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
router.get('/admin/analytics/overview', async (req, res, next) => {
    try {
        const from = getFrom(req.query.range);
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const [total, period, today, uniqueSessions, uniqueUsers, topHour] = await Promise.all([
            PageView.countDocuments(),
            PageView.countDocuments({ createdAt: { $gte: from } }),
            PageView.countDocuments({ createdAt: { $gte: dayAgo } }),
            PageView.distinct('sessionId', { createdAt: { $gte: from } }).then(r => r.length),
            PageView.distinct('userId',    { createdAt: { $gte: from }, userId: { $ne: null } }).then(r => r.length),
            PageView.aggregate([
                { $match: { createdAt: { $gte: from } } },
                { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
                { $sort:  { count: -1 } },
                { $limit: 1 },
            ]),
        ]);

        res.json({ total, period, today, uniqueSessions, uniqueUsers, topHour: topHour[0] || null });
    } catch (err) { next(err); }
});

// GET /admin/analytics/daily?range=7d
router.get('/admin/analytics/daily', async (req, res, next) => {
    try {
        const from = getFrom(req.query.range);
        const data = await PageView.aggregate([
            { $match: { createdAt: { $gte: from } } },
            { $group: {
                _id:   { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                views: { $sum: 1 },
                uniq:  { $addToSet: '$sessionId' },
            }},
            { $project: { _id: 1, views: 1, uniq: { $size: '$uniq' } } },
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
            { $group: { _id: '$path', count: { $sum: 1 } } },
            { $sort:  { count: -1 } },
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
            { $sort:  { count: -1 } },
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
            { $sort:  { count: -1 } },
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
            { $sort:  { count: -1 } },
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
            { $match: { createdAt: { $gte: from }, referrer: { $nin: [null, ''] } } },
            { $group: { _id: '$referrer', count: { $sum: 1 } } },
            { $sort:  { count: -1 } },
            { $limit: 10 },
        ]);
        res.json(data);
    } catch (err) { next(err); }
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

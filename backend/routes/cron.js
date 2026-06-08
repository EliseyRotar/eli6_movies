const express = require('express');
const crypto = require('crypto');
const router = express.Router();

// Validate the shared secret sent by the external cron (cron-job.org / GH Actions / etc.)
// Constant-time comparison so response latency doesn't leak the secret.
function cronAuth(req, res, next) {
    const secret = process.env.CRON_SECRET;
    if (!secret) return res.status(500).json({ error: 'CRON_SECRET not configured' });
    const provided = req.headers['x-cron-secret'] || req.query.secret;
    if (typeof provided !== 'string' || provided.length !== secret.length) {
        return res.status(401).json({ error: 'UNAUTHORIZED' });
    }
    if (!crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(secret))) {
        return res.status(401).json({ error: 'UNAUTHORIZED' });
    }
    next();
}

// called daily by cron-job.org with X-Cron-Secret header
router.post('/cron/check-episodes', cronAuth, async (req, res, next) => {
    try {
        const { run } = require('../jobs/episodeNotifier');
        const result = await run();
        res.json({ ok: true, ...result });
    } catch (err) { next(err); }
});

module.exports = router;

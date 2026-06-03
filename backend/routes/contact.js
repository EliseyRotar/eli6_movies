const express = require('express');
const { sendEmail } = require('../utils/mailer');
const Contact = require('../models/Contact');

const router = express.Router();

const _rl = new Map();
function contactLimit(req, res, next) {
    const ip = req.ip || '';
    const now = Date.now();
    const entry = _rl.get(ip);
    if (entry && now < entry.reset) {
        if (entry.count >= 5) return res.status(429).json({ error: 'TOO_MANY_REQUESTS' });
        entry.count++;
    } else {
        _rl.set(ip, { count: 1, reset: now + 60 * 60 * 1000 });
    }
    next();
}

router.post('/contact', contactLimit, async (req, res) => {
    const { type, message, email, hp } = req.body || {};

    if (hp) return res.json({ ok: true });

    if (!message || typeof message !== 'string' || message.trim().length < 5) {
        return res.status(400).json({ error: 'INVALID_MESSAGE' });
    }
    if (message.length > 3000) return res.status(400).json({ error: 'MESSAGE_TOO_LONG' });

    const safeType    = ['bug', 'suggestion', 'other'].includes(type) ? type : 'other';
    const safeMessage = message.trim().slice(0, 3000).replace(/</g, '&lt;');
    const safeEmail   = email && typeof email === 'string' ? email.trim().slice(0, 200) : '';

    await Contact.create({
        type: safeType,
        message: message.trim().slice(0, 3000),
        email: safeEmail,
        ip: req.ip || '',
    });

    const subject = `[ELI6 Movies] ${safeType.charAt(0).toUpperCase() + safeType.slice(1)} report`;
    const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#111;color:#fff;padding:24px;border-radius:8px">
  <h2 style="margin:0 0 16px;color:#e50914">New ${safeType} from ELI6 Movies</h2>
  ${safeEmail ? `<p style="color:#aaa;margin:0 0 8px">From: <strong style="color:#fff">${safeEmail}</strong></p>` : '<p style="color:#555;margin:0 0 8px">No email provided</p>'}
  <p style="color:#aaa;margin:0 0 16px">Type: <strong style="color:#fff">${safeType}</strong></p>
  <div style="background:#1a1a1a;border-radius:6px;padding:16px;white-space:pre-wrap;font-size:14px;line-height:1.6">${safeMessage}</div>
</div>`;

    sendEmail({ to: 'eli6movies@proton.me', subject, html }).catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[contact] email failed:', err.message);
    });

    res.json({ ok: true });
});

module.exports = router;

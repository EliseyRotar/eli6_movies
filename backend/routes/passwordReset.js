const express = require('express');
const crypto  = require('crypto');
const userService   = require('../services/userService');
const PasswordReset = require('../models/PasswordReset');
const { sendEmail, passwordResetEmail, APP_URL } = require('../utils/mailer');
const { validateNewPassword } = require('../utils/validators');

const router = express.Router();

// Rate-limit: at most 3 reset requests per email per 15 min (in-memory, good enough)
const resetAttempts = new Map();
function checkResetRateLimit(email) {
    const now = Date.now();
    const entry = resetAttempts.get(email);
    if (entry && now < entry.reset) {
        if (entry.count >= 3) return false;
        entry.count++;
    } else {
        resetAttempts.set(email, { count: 1, reset: now + 15 * 60 * 1000 });
    }
    return true;
}

// POST /auth/forgot-password  { email }
router.post('/auth/forgot-password', async (req, res) => {
    const { email } = req.body || {};
    // Always respond with the same message to prevent user enumeration
    const OK = { message: 'If that email exists, a reset link has been sent.' };

    if (!email || typeof email !== 'string') return res.json(OK);

    const normalized = email.trim().toLowerCase();
    if (!checkResetRateLimit(normalized)) return res.status(429).json({ error: 'RATE_LIMITED' });

    try {
        const user = await userService.findByEmail(normalized);
        if (!user) return res.json(OK);

        // Invalidate any existing tokens for this user
        await PasswordReset.deleteMany({ userId: user._id });

        const token     = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await PasswordReset.create({ userId: user._id, token, expiresAt });

        const resetUrl = `${APP_URL}/reset-password.html?token=${token}`;
        await sendEmail({
            to:      user.email,
            subject: 'Reset your ELI6 Movies password',
            html:    passwordResetEmail(user.username, resetUrl),
        });
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[forgot-password]', err.message);
    }

    res.json(OK);
});

// POST /auth/reset-password  { token, newPassword }
router.post('/auth/reset-password', async (req, res) => {
    const { token, newPassword } = req.body || {};
    if (!token || !validateNewPassword(newPassword)) {
        return res.status(400).json({ error: 'INVALID_INPUT' });
    }

    try {
        const record = await PasswordReset.findOne({ token, used: false });
        if (!record || record.expiresAt < new Date()) {
            return res.status(400).json({ error: 'TOKEN_INVALID_OR_EXPIRED' });
        }

        const user = await userService.findById(record.userId);
        if (!user) return res.status(400).json({ error: 'USER_NOT_FOUND' });

        user.password  = await userService.hashPassword(newPassword);
        user.sessions  = []; // revoke all sessions
        await user.save();

        record.used = true;
        await record.save();

        res.json({ message: 'PASSWORD_RESET_OK' });
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[reset-password]', err.message);
        res.status(500).json({ error: 'RESET_FAILED' });
    }
});

module.exports = router;

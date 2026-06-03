const express = require('express');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const userService = require('../services/userService');
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');
const Contact = require('../models/Contact');
const {
    validateEmail,
    validateUsername,
    validatePassword,
    validateNewPassword,
} = require('../utils/validators');

const router = express.Router();

router.use('/admin', auth, adminOnly);

router.get('/admin/users', async (_req, res, next) => {
    try {
        const users = await userService.listUsersSafe();
        res.json(users);
    } catch (err) { next(err); }
});

router.post('/admin/users', async (req, res, next) => {
    try {
        const { username, email, password, role } = req.body || {};
        if (!validateUsername(username) || !validateEmail(email) || !validateNewPassword(password)) {
            return res.status(400).json({ error: 'INVALID_INPUT' });
        }
        const existing = await userService.findByEmail(email);
        if (existing) return res.status(400).json({ error: 'USER_EXISTS' });
        const existingUsername = await userService.findByUsername(username.trim());
        if (existingUsername) return res.status(400).json({ error: 'USER_EXISTS' });
        const safeRole = ['user', 'admin'].includes(role) ? role : 'user';
        const user = await userService.createUser({
            username: username.trim(),
            email,
            password,
            role: safeRole,
        });
        res.status(201).json({
            user: { _id: user._id, username: user.username, email: user.email, role: user.role },
        });
    } catch (err) { next(err); }
});

router.delete('/admin/users/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ error: 'INVALID_ID' });
        if (String(id) === String(req.user._id)) return res.status(400).json({ error: 'CANNOT_DELETE_SELF' });
        const deleted = await userService.deleteUser(id);
        if (!deleted) return res.status(404).json({ error: 'NOT_FOUND' });
        res.json({
            message: 'USER_DELETED',
            user: { _id: deleted._id, username: deleted.username, email: deleted.email },
        });
    } catch (err) { next(err); }
});

router.put('/admin/users/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = await userService.findById(id);
        if (!user) return res.status(404).json({ error: 'NOT_FOUND' });

        const { username, email } = req.body || {};
        if (username && !validateUsername(username))
            return res.status(400).json({ error: 'INVALID_USERNAME' });
        if (email && !validateEmail(email))
            return res.status(400).json({ error: 'INVALID_EMAIL' });

        if (username && username !== user.username) {
            const exists = await userService.findByUsername(username.trim());
            if (exists && String(exists._id) !== String(id)) {
                return res.status(400).json({ error: 'USERNAME_EXISTS' });
            }
            user.username = username.trim();
        }
        if (email && email !== user.email) {
            const normalized = email.trim().toLowerCase();
            const exists = await userService.findByEmail(normalized);
            if (exists && String(exists._id) !== String(id)) {
                return res.status(400).json({ error: 'EMAIL_EXISTS' });
            }
            user.email = normalized;
        }

        await user.save();
        res.json({
            message: 'USER_UPDATED',
            user: { _id: user._id, username: user.username, email: user.email, role: user.role },
        });
    } catch (err) { next(err); }
});

router.put('/admin/users/:id/reset-password', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body || {};
        if (!validateNewPassword(newPassword)) return res.status(400).json({ error: 'INVALID_PASSWORD' });
        const user = await userService.findById(id);
        if (!user) return res.status(404).json({ error: 'NOT_FOUND' });
        user.password = await userService.hashPassword(newPassword);
        user.sessions = [];
        await user.save();
        res.json({
            message: 'PASSWORD_RESET',
            user: { _id: user._id, username: user.username, email: user.email, role: user.role },
        });
    } catch (err) { next(err); }
});

router.put('/admin/users/:id/role', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { role } = req.body || {};
        if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'INVALID_ROLE' });
        const user = await userService.findById(id);
        if (!user) return res.status(404).json({ error: 'NOT_FOUND' });
        user.role = role;
        await user.save();
        res.json({
            message: 'ROLE_UPDATED',
            user: { _id: user._id, username: user.username, email: user.email, role: user.role },
        });
    } catch (err) { next(err); }
});

router.get('/admin/feedback', async (req, res, next) => {
    try {
        const page  = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 50);
        const skip  = (page - 1) * limit;
        const filter = req.query.type ? { type: req.query.type } : {};
        const [items, total] = await Promise.all([
            Contact.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            Contact.countDocuments(filter),
        ]);
        res.json({ items, total, page, pages: Math.ceil(total / limit) });
    } catch (err) { next(err); }
});

router.delete('/admin/feedback/:id', async (req, res, next) => {
    try {
        await Contact.findByIdAndDelete(req.params.id);
        res.json({ ok: true });
    } catch (err) { next(err); }
});

module.exports = router;

const express = require('express');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const userService = require('../services/userService');
const {
    validateEmail,
    validateUsername,
    validatePassword,
    requireNumber,
} = require('../utils/validators');

const router = express.Router();

router.use('/admin', auth, adminOnly);

router.get('/admin/users', async (_req, res) => {
    res.json(userService.listUsersSafe());
});

router.post('/admin/users', async (req, res) => {
    const { username, email, password, role } = req.body || {};
    if (!validateUsername(username) || !validateEmail(email) || !validatePassword(password)) {
        return res.status(400).json({ error: 'INVALID_INPUT' });
    }
    const existing = await userService.findByEmail(email);
    if (existing) return res.status(400).json({ error: 'USER_EXISTS' });
    const user = await userService.createUser({
        username: username.trim(),
        email,
        password,
        role: role || 'user',
    });
    res.status(201).json({
        user: { _id: user._id, username: user.username, email: user.email, role: user.role },
    });
});

router.delete('/admin/users/:id', async (req, res) => {
    const userId = requireNumber(req.params.id);
    if (!userId) return res.status(400).json({ error: 'INVALID_ID' });
    const deleted = await userService.deleteUser(userId);
    if (!deleted) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({
        message: 'USER_DELETED',
        user: { _id: deleted._id, username: deleted.username, email: deleted.email },
    });
});

router.put('/admin/users/:id', async (req, res) => {
    const userId = requireNumber(req.params.id);
    if (!userId) return res.status(400).json({ error: 'INVALID_ID' });
    const user = await userService.findById(userId);
    if (!user) return res.status(404).json({ error: 'NOT_FOUND' });

    const { username, email } = req.body || {};
    if (username && !validateUsername(username))
        return res.status(400).json({ error: 'INVALID_USERNAME' });
    if (email && !validateEmail(email)) return res.status(400).json({ error: 'INVALID_EMAIL' });

    if (username && username !== user.username) {
        const exists = (await userService.getInternalStore()).find(
            (u) => u.username === username && u._id !== userId
        );
        if (exists) return res.status(400).json({ error: 'USERNAME_EXISTS' });
        user.username = username.trim();
    }
    if (email && email !== user.email) {
        const normalized = email.trim().toLowerCase();
        const exists = (await userService.getInternalStore()).find(
            (u) => u.email === normalized && u._id !== userId
        );
        if (exists) return res.status(400).json({ error: 'EMAIL_EXISTS' });
        user.email = normalized;
    }

    res.json({
        message: 'USER_UPDATED',
        user: { _id: user._id, username: user.username, email: user.email, role: user.role },
    });
});

router.put('/admin/users/:id/reset-password', async (req, res) => {
    const userId = requireNumber(req.params.id);
    const { newPassword } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'INVALID_ID' });
    if (!validatePassword(newPassword)) return res.status(400).json({ error: 'INVALID_PASSWORD' });
    const user = await userService.findById(userId);
    if (!user) return res.status(404).json({ error: 'NOT_FOUND' });
    user.password = await userService.hashPassword(newPassword);
    res.json({
        message: 'PASSWORD_RESET',
        user: { _id: user._id, username: user.username, email: user.email, role: user.role },
    });
});

router.put('/admin/users/:id/role', async (req, res) => {
    const userId = requireNumber(req.params.id);
    const { role } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'INVALID_ID' });
    if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'INVALID_ROLE' });
    const user = await userService.findById(userId);
    if (!user) return res.status(404).json({ error: 'NOT_FOUND' });
    user.role = role;
    res.json({
        message: 'ROLE_UPDATED',
        user: { _id: user._id, username: user.username, email: user.email, role: user.role },
    });
});

router.post('/admin/fix-mylist', async (_req, res) => {
    res.json({ message: 'NO_OP_MEMORY_STORE' });
});

module.exports = router;

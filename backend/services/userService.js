const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');
const { normalizeEmail } = require('../utils/validators');

// In-memory store for now; ready to swap with Mongo-backed implementation.
const users = [];
let nextUserId = 1;

async function hashPassword(password) {
    return bcrypt.hash(password, 10);
}

async function createUser({ username, email, password, role = 'user' }) {
    const hashedPassword = await hashPassword(password);
    const user = {
        _id: nextUserId++,
        username,
        email: normalizeEmail(email),
        password: hashedPassword,
        role,
        myList: [],
        keepWatching: [],
        watchHistory: [],
    };
    users.push(user);
    return user;
}

async function findByEmail(email) {
    const normalized = normalizeEmail(email);
    return users.find((u) => u.email === normalized) || null;
}

async function findById(id) {
    return users.find((u) => u._id === id) || null;
}

async function verifyPassword(user, password) {
    return bcrypt.compare(password, user.password);
}

async function updateUser(user, updates = {}) {
    Object.assign(user, updates);
    return user;
}

async function deleteUser(id) {
    const idx = users.findIndex((u) => u._id === id);
    if (idx !== -1) {
        const [removed] = users.splice(idx, 1);
        return removed;
    }
    return null;
}

function listUsersSafe() {
    return users.map(({ _id, username, email, role }) => ({ _id, username, email, role }));
}

function getInternalStore() {
    return users;
}

function resetStore() {
    users.length = 0;
    nextUserId = 1;
    logger.info('User store reset');
}

module.exports = {
    createUser,
    findByEmail,
    findById,
    verifyPassword,
    updateUser,
    deleteUser,
    listUsersSafe,
    getInternalStore,
    resetStore,
    hashPassword,
};

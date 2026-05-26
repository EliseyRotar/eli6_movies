const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { normalizeEmail } = require('../utils/validators');

async function hashPassword(password) {
    return bcrypt.hash(password, 10);
}

async function createUser({ username, email, password, role = 'user' }) {
    const hashedPassword = await hashPassword(password);
    const user = new User({
        username,
        email: normalizeEmail(email),
        password: hashedPassword,
        role,
    });
    await user.save();
    return user;
}

async function findByEmail(email) {
    return User.findOne({ email: normalizeEmail(email) });
}

async function findById(id) {
    try {
        return await User.findById(id);
    } catch {
        return null;
    }
}

async function verifyPassword(user, password) {
    return bcrypt.compare(password, user.password);
}

async function updateUser(user, updates = {}) {
    Object.assign(user, updates);
    await user.save();
    return user;
}

async function deleteUser(id) {
    return User.findByIdAndDelete(id);
}

async function listUsersSafe() {
    return User.find({}, '_id username email role').lean();
}

async function findByUsername(username) {
    return User.findOne({ username });
}

function resetStore() {
    // no-op in production; only used in tests
}

module.exports = {
    createUser,
    findByEmail,
    findById,
    verifyPassword,
    updateUser,
    deleteUser,
    listUsersSafe,
    findByUsername,
    hashPassword,
    resetStore,
};

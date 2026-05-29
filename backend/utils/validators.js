const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email = '') {
    return email.trim().toLowerCase();
}

function validateEmail(email) {
    return EMAIL_REGEX.test(normalizeEmail(email));
}

function validatePassword(password = '') {
    return typeof password === 'string' && password.length >= 8 && password.length <= 128;
}

function validateUsername(username = '') {
    return typeof username === 'string' && username.trim().length >= 3;
}

function requireNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

module.exports = {
    normalizeEmail,
    validateEmail,
    validatePassword,
    validateUsername,
    requireNumber,
};

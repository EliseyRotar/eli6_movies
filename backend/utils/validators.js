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

// Stronger check for registration and password change — requires at least one letter + one digit/symbol
function validateNewPassword(password = '') {
    if (!validatePassword(password)) return false;
    if (!/[a-zA-Z]/.test(password)) return false;
    if (!/[0-9!@#$%^&*()\-_=+\[\]{}|;:,.<>?]/.test(password)) return false;
    return true;
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
    validateNewPassword,
    validateUsername,
    requireNumber,
};

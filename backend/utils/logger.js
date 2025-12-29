const redact = (value) => {
    if (!value) return value;
    if (typeof value === 'string' && value.length > 3) {
        return `${value.slice(0, 2)}***${value.slice(-1)}`;
    }
    return '[redacted]';
};

const baseLog = (level, message, meta = {}) => {
    const safeMeta = { ...meta };
    if (safeMeta.password) safeMeta.password = redact(safeMeta.password);
    if (safeMeta.token) safeMeta.token = redact(safeMeta.token);
    if (safeMeta.email) safeMeta.email = redact(safeMeta.email);

    const payload = {
        level,
        msg: message,
        ...safeMeta,
        timestamp: new Date().toISOString(),
    };
    // Simple structured log for now
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(payload));
};

module.exports = {
    info: (msg, meta) => baseLog('info', msg, meta),
    warn: (msg, meta) => baseLog('warn', msg, meta),
    error: (msg, meta) => baseLog('error', msg, meta),
};

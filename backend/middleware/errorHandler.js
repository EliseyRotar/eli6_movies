const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
    // eslint-disable-line no-unused-vars
    const status = err.status || 500;
    const code = err.code || 'INTERNAL_ERROR';
    logger.error('Request failed', {
        path: req.path,
        method: req.method,
        status,
        code,
        message: err.message,
    });
    return res.status(status).json({
        error: code,
        message: status === 500 ? 'Unexpected server error' : err.message,
    });
}

module.exports = errorHandler;

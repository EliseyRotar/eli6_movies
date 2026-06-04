const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    sessionId: { type: String, index: true },
    userId:    { type: mongoose.Schema.Types.ObjectId, default: null },
    username:  { type: String, default: null },
    path:      { type: String, default: null },
    message:   { type: String, default: '' },
    source:    { type: String, default: null },
    line:      { type: Number, default: null },
    col:       { type: Number, default: null },
    stack:     { type: String, default: null },
    userAgent: { type: String, default: null },
    createdAt: { type: Date, default: Date.now, index: true, expires: 60 * 60 * 24 * 30 },
});

schema.index({ createdAt: -1 });
schema.index({ message: 1, createdAt: -1 });

module.exports = mongoose.model('JSError', schema);

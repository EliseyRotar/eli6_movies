const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    sessionId: { type: String, index: true },
    userId:    { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    username:  { type: String, default: null },
    name:      { type: String, required: true, index: true },
    path:      { type: String, default: null },
    value:     { type: String, default: null },
    meta:      { type: mongoose.Schema.Types.Mixed, default: null },
    country:   { type: String, default: null },
    device:    { type: String, default: null },
    createdAt: { type: Date, default: Date.now, index: true },
});

schema.index({ name: 1, createdAt: -1 });
schema.index({ name: 1, value: 1, createdAt: -1 });
schema.index({ sessionId: 1, createdAt: -1 });

module.exports = mongoose.model('Event', schema);

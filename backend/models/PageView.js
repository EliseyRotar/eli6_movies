const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    sessionId:   { type: String, index: true },
    userId:      { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    username:    { type: String, default: null },
    path:        { type: String, index: true },
    referrer:    { type: String, default: null },
    duration:    { type: Number, default: null },
    ip:          { type: String, default: null },
    country:     { type: String, default: null },
    countryCode: { type: String, default: null },
    city:        { type: String, default: null },
    browser:     { type: String, default: null },
    os:          { type: String, default: null },
    device:      { type: String, default: 'desktop' },
    createdAt:   { type: Date, default: Date.now, index: true },
});

schema.index({ createdAt: -1 });
schema.index({ path: 1, createdAt: -1 });
schema.index({ country: 1, createdAt: -1 });
schema.index({ sessionId: 1, createdAt: -1 });

module.exports = mongoose.model('PageView', schema);

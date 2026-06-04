const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    sessionId: { type: String, index: true },
    path:      { type: String, index: true },
    metric:    { type: String, enum: ['LCP', 'INP', 'CLS', 'TTFB', 'FCP', 'FID'], required: true, index: true },
    value:     { type: Number, required: true },
    rating:    { type: String, enum: ['good', 'needs-improvement', 'poor'], default: null },
    device:    { type: String, default: null },
    createdAt: { type: Date, default: Date.now, index: true },
});

schema.index({ metric: 1, createdAt: -1 });
schema.index({ path: 1, metric: 1, createdAt: -1 });

module.exports = mongoose.model('WebVital', schema);

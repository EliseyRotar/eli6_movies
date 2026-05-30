const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    userId:    { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    token:     { type: String, required: true, index: true },
    expiresAt: { type: Date,   required: true },
    used:      { type: Boolean, default: false },
}, { timestamps: true });

// MongoDB TTL — auto-delete documents 1 h after expiresAt
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

module.exports = mongoose.model('PasswordReset', schema);

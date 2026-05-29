const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
    {
        userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
        username:  { type: String, default: '' },
        email:     { type: String, default: '' },
        event:     { type: String, enum: ['login', 'register'], required: true },
        ip:        { type: String, default: '' },
        userAgent: { type: String, default: '' },
    },
    { timestamps: true }
);

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);

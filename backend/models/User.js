const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    myList: {
        type: [{
            id: {
                type: Number,
                required: true
            },
            title: {
                type: String,
                required: true
            },
            type: {
                type: String,
                required: true,
                enum: ['movie', 'tv', 'anime']
            },
            poster_path: {
                type: String,
                required: true
            },
            overview: {
                type: String,
                default: ''
            },
            addedAt: {
                type: Date,
                default: Date.now
            }
        }],
        default: []
    },
    keepWatching: {
        type: [{
            id: {
                type: Number,
                required: true
            },
            title: {
                type: String,
                required: true
            },
            type: {
                type: String,
                required: true,
                enum: ['movie', 'tv', 'anime']
            },
            poster_path: {
                type: String,
                required: true
            },
            overview: {
                type: String,
                default: ''
            },
            addedAt: {
                type: Date,
                default: Date.now
            }
        }],
        default: []
    },
    // Add watchHistory for watched section
    watchHistory: {
        type: [{
            id: { type: Number, required: true },
            title: { type: String, required: true },
            type: { type: String, required: true, enum: ['movie', 'tv', 'anime'] },
            poster_path: { type: String, required: true },
            overview: { type: String, default: '' },
            progress: { type: Number, default: 0 },
            last_watched: { type: Date, default: Date.now }
        }],
        default: []
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    }
}, {
    timestamps: true
});

// Add a pre-save middleware to ensure myList is always an array and enforce size limits
userSchema.pre('save', function (next) {
    if (!Array.isArray(this.myList)) {
        this.myList = [];
    }
    if (Array.isArray(this.myList) && this.myList.length > 100) {
        this.myList = this.myList.slice(0, 100);
    }
    if (!Array.isArray(this.keepWatching)) {
        this.keepWatching = [];
    }
    if (Array.isArray(this.keepWatching) && this.keepWatching.length > 20) {
        this.keepWatching = this.keepWatching.slice(0, 20);
    }
    next();
});

module.exports = mongoose.model('User', userSchema); 
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
    }
}, {
    timestamps: true
});

// Add a pre-save middleware to ensure myList is always an array
userSchema.pre('save', function (next) {
    if (!Array.isArray(this.myList)) {
        this.myList = [];
    }
    next();
});

module.exports = mongoose.model('User', userSchema); 
const mongoose = require('mongoose');

let cached = null;

async function connectDB() {
    if (cached && mongoose.connection.readyState >= 1) return cached;

    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error('MONGODB_URI environment variable is not set');
    }

    cached = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
    });

    mongoose.connection.on('error', (err) => {
        // eslint-disable-next-line no-console
        console.error('MongoDB connection error:', err);
    });

    return cached;
}

module.exports = connectDB;

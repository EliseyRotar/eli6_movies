const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const path = require('path');
const cookieParser = require('cookie-parser');
const User = require('./models/User');

// Load environment variables from .env file if it exists
try {
    require('dotenv').config();
} catch (err) {
    console.log('No .env file found, using default values');
}

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Content-Range', 'X-Content-Range']
}));
app.use(express.json());
app.use(cookieParser());

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eli6_movies')
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
    });

// EJS template route for demonstration
app.get('/template', (req, res) => {
    res.render('index');
});

// Authentication middleware
const auth = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        if (!authHeader) {
            throw new Error('No authorization header');
        }

        const token = authHeader.replace('Bearer ', '');
        if (!token) {
            throw new Error('No token provided');
        }

        console.log('Verifying token:', token); // Debug log

        const decoded = jwt.verify(token, 'your_jwt_secret');
        console.log('Decoded token:', decoded); // Debug log

        const user = await User.findOne({ _id: decoded.userId });
        console.log('Found user:', user ? 'yes' : 'no'); // Debug log

        if (!user) {
            throw new Error('User not found');
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth error:', error.message); // Debug log
        res.status(401).json({ error: 'Please authenticate.' });
    }
};

// Get User Profile Route
app.get('/api/user/profile', auth, async (req, res) => {
    try {
        // Set proper headers
        res.setHeader('Content-Type', 'application/json');
        res.json({
            username: req.user.username,
            email: req.user.email,
            myList: req.user.myList || []
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add to My List Route
app.post('/api/user/mylist', auth, async (req, res) => {
    try {
        console.log('Add to my list body:', req.body);
        const { id, title, type, poster_path, overview } = req.body;

        // Validate required fields
        if (!id || !title || !type || !poster_path) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['id', 'title', 'type', 'poster_path']
            });
        }

        // Validate type
        if (!['movie', 'tv', 'anime'].includes(type)) {
            return res.status(400).json({
                error: 'Invalid type',
                allowed: ['movie', 'tv', 'anime']
            });
        }

        // Ensure myList is an array
        if (!Array.isArray(req.user.myList)) {
            req.user.myList = [];
        }

        // Check if item already exists in myList
        const exists = req.user.myList.some(item => item.id === id && item.type === type);
        if (exists) {
            return res.status(400).json({ error: 'Item already in your list' });
        }

        // Add the item
        req.user.myList.push({
            id,
            title,
            type,
            poster_path,
            overview: overview || '',
            addedAt: new Date()
        });

        // Save with validation
        await req.user.save();

        // Set proper headers
        res.setHeader('Content-Type', 'application/json');
        res.json(req.user.myList);
    } catch (error) {
        console.error('Add to my list error:', error);

        // Handle validation errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                error: 'Validation error',
                details: Object.values(error.errors).map(err => err.message)
            });
        }

        // Handle other errors
        res.status(500).json({
            error: 'Failed to add to list',
            message: error.message
        });
    }
});

// Remove from My List Route
app.delete('/api/user/mylist/:id/:type', auth, async (req, res) => {
    try {
        const { id, type } = req.params;
        req.user.myList = req.user.myList.filter(item => !(item.id === parseInt(id) && item.type === type));
        await req.user.save();

        // Set proper headers
        res.setHeader('Content-Type', 'application/json');
        res.json(req.user.myList);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Register Route
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            username,
            email,
            password: hashedPassword
        });
        await user.save();

        // Generate token for the new user
        const token = jwt.sign({ userId: user._id }, 'your_jwt_secret', { expiresIn: '7d' });

        // Send both token and user data
        res.status(201).json({
            token,
            user: {
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Login Route
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user._id }, 'your_jwt_secret', { expiresIn: '7d' });

        // Send both token and user data
        res.json({
            token,
            user: {
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Protected Routes
app.post('/api/user/watch-history', auth, async (req, res) => {
    try {
        const { item } = req.body;
        const user = req.user;

        const existingItem = user.watchHistory.find(i => i.id === item.id);
        if (existingItem) {
            existingItem.progress = item.progress;
            existingItem.last_watched = new Date();
        } else {
            user.watchHistory.unshift(item);
        }

        await user.save();
        res.json(user.watchHistory);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete Account Endpoint
app.delete('/api/user/delete', auth, async (req, res) => {
    try {
        const user = req.user;

        // Delete the user from the database
        await User.findByIdAndDelete(user._id);

        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({ message: 'Failed to delete account' });
    }
});

// Proxy endpoint for VidSrc API
app.get('/api/movies/:type', async (req, res) => {
    try {
        const { type } = req.params;
        console.log(`Fetching movies of type: ${type}`);

        const response = await axios.get(`https://vidsrc.to/vapi/movie/${type}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.data) {
            throw new Error('No data received from VidSrc API');
        }

        console.log('VidSrc API response:', response.data);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching from VidSrc:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
        }
        res.status(500).json({
            error: 'Failed to fetch movies',
            details: error.message
        });
    }
});

// Automatic fix endpoint for legacy myList corruption
app.post('/api/admin/fix-mylist', async (req, res) => {
    try {
        const User = require('./models/User');
        const users = await User.find({});
        let fixed = 0;
        for (const user of users) {
            if (!Array.isArray(user.myList)) {
                user.myList = [];
                await user.save();
                fixed++;
            }
        }
        res.json({ message: `Fixed ${fixed} user(s)` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Keep Watching List
app.get('/api/user/keep-watching', auth, async (req, res) => {
    try {
        res.json(req.user.keepWatching || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add to Keep Watching List
app.post('/api/user/keep-watching', auth, async (req, res) => {
    try {
        const item = req.body;

        const keepWatchingList = req.user.keepWatching || [];

        const existingItemIndex = keepWatchingList.findIndex(i => i.id === item.id && i.type === item.type);

        if (existingItemIndex > -1) {
            keepWatchingList.splice(existingItemIndex, 1);
        }

        keepWatchingList.unshift(item);

        if (keepWatchingList.length > 20) {
            keepWatchingList.pop();
        }

        req.user.keepWatching = keepWatchingList;
        await req.user.save();

        res.json(req.user.keepWatching);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Remove from Keep Watching List
app.delete('/api/user/keep-watching/:id/:type', auth, async (req, res) => {
    try {
        const { id, type } = req.params;
        const itemId = parseInt(id, 10);

        req.user.keepWatching = req.user.keepWatching.filter(
            item => !(item.id === itemId && item.type === type)
        );

        await req.user.save();
        res.json(req.user.keepWatching);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 
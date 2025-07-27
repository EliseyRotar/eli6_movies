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
    console.log('Environment loaded. JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
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

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        console.log('Decoded token:', decoded); // Debug log

        const user = await User.findOne({ _id: decoded.userId });
        console.log('Found user:', user ? 'yes' : 'no'); // Debug log

        if (!user) {
            throw new Error('User not found');
        }

        req.user = user;
        req.userRole = decoded.role; // Include role from token
        next();
    } catch (error) {
        console.error('Auth error:', error.message); // Debug log
        res.status(401).json({ error: 'Please authenticate.' });
    }
};

// Admin-only middleware
const adminOnly = async (req, res, next) => {
    try {
        if (!req.userRole || req.userRole !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    } catch (error) {
        res.status(403).json({ error: 'Admin access required' });
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
            role: req.user.role,
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
        req.user.myList.unshift({
            id,
            title,
            type,
            poster_path,
            overview: overview || '',
            addedAt: new Date()
        });
        // Enforce max 100 items
        if (req.user.myList.length > 100) {
            req.user.myList = req.user.myList.slice(0, 100);
        }
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
        const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '7d' });

        // Send both token and user data
        res.status(201).json({
            token,
            user: {
                username: user.username,
                email: user.email,
                role: user.role
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

        const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '7d' });

        // Send both token and user data
        res.json({
            token,
            user: {
                username: user.username,
                email: user.email,
                role: user.role
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

// Remove item from watch history
app.delete('/api/user/watch-history', auth, async (req, res) => {
    try {
        const { id, type } = req.body;
        if (!id || !type) return res.status(400).json({ error: 'id and type required' });
        const user = req.user;
        user.watchHistory = user.watchHistory.filter(item => !(item.id === id && item.type === type));
        await user.save();
        res.json(user.watchHistory);
    } catch (error) {
        res.status(500).json({ error: error.message });
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
app.post('/api/admin/fix-mylist', adminOnly, async (req, res) => {
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

// Get all users endpoint (admin)
app.get('/api/admin/users', auth, adminOnly, async (req, res) => {
    try {
        const users = await User.find({}, { password: 0 }); // Exclude password field
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new user (admin)
app.post('/api/admin/users', auth, adminOnly, async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }
        const existing = await User.findOne({ $or: [{ username }, { email }] });
        if (existing) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, email, password: hashedPassword, role: role || 'user' });
        await user.save();
        res.status(201).json({ message: 'User created successfully', user: { _id: user._id, username: user.username, email: user.email, role: user.role } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint: List all user IDs and usernames
app.get('/api/admin/debug/user-ids', auth, adminOnly, async (req, res) => {
    try {
        const users = await User.find({}, { _id: 1, username: 1, email: 1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete user by ID (admin)
app.delete('/api/admin/users/:id', auth, adminOnly, async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User deleted successfully', user: { _id: user._id, username: user.username, email: user.email } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Edit user by ID (admin)
app.put('/api/admin/users/:id', auth, adminOnly, async (req, res) => {
    try {
        const { username, email } = req.body;
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: { username, email } },
            { new: true, fields: { password: 0 } }
        );
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User updated successfully', user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reset user password by ID (admin)
app.put('/api/admin/users/:id/reset-password', auth, adminOnly, async (req, res) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword) return res.status(400).json({ error: 'New password is required' });
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: { password: hashedPassword } },
            { new: true, fields: { password: 0 } }
        );
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'Password reset successfully', user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update user role by ID (admin)
app.put('/api/admin/users/:id/role', auth, adminOnly, async (req, res) => {
    try {
        const { role } = req.body;
        if (!role) return res.status(400).json({ error: 'Role is required' });
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: { role } },
            { new: true, fields: { password: 0 } }
        );
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'Role updated successfully', user });
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
        const watchHistory = req.user.watchHistory || [];

        // Update keepWatching
        const existingItemIndex = keepWatchingList.findIndex(i => i.id === item.id && i.type === item.type);
        if (existingItemIndex > -1) {
            keepWatchingList.splice(existingItemIndex, 1);
        }
        keepWatchingList.unshift(item);
        if (keepWatchingList.length > 20) {
            keepWatchingList.pop();
        }
        req.user.keepWatching = keepWatchingList;

        // Update watchHistory
        const whIndex = watchHistory.findIndex(i => i.id === item.id && i.type === item.type);
        if (whIndex > -1) {
            watchHistory[whIndex].last_watched = new Date();
            watchHistory[whIndex].progress = item.progress || 0;
        } else {
            watchHistory.unshift({
                ...item,
                last_watched: new Date(),
                progress: item.progress || 0
            });
        }
        if (watchHistory.length > 100) {
            watchHistory.pop();
        }
        req.user.watchHistory = watchHistory;

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

// Get Watched List
app.get('/api/user/watched', auth, async (req, res) => {
    try {
        res.json(req.user.watchHistory || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update User Profile Endpoint
app.put('/api/user/update', auth, async (req, res) => {
    try {
        const { username, email } = req.body;

        // Check if username or email already exists (excluding current user)
        if (username && username !== req.user.username) {
            const existingUser = await User.findOne({ username });
            if (existingUser) {
                return res.status(400).json({ error: 'Username already exists.' });
            }
        }

        if (email && email !== req.user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ error: 'Email already exists.' });
            }
        }

        // Update user fields
        if (username) req.user.username = username;
        if (email) req.user.email = email;

        await req.user.save();

        res.json({
            message: 'Profile updated successfully.',
            user: {
                username: req.user.username,
                email: req.user.email,
                role: req.user.role
            }
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Failed to update profile.' });
    }
});

// Change Password Endpoint
app.put('/api/user/password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password are required.' });
        }
        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, req.user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Current password is incorrect.' });
        }
        // Hash and update new password
        req.user.password = await bcrypt.hash(newPassword, 10);
        await req.user.save();
        res.json({ message: 'Password updated successfully.' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ error: 'Failed to change password.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 
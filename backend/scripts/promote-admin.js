// One-time script: promotes a user to admin by username or email.
// Usage: node scripts/promote-admin.js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const TARGET_USERNAME = 'eli6';
const TARGET_EMAIL    = ''; // set to an email to promote by email, otherwise promotes by username

(async () => {
    if (!process.env.MONGODB_URI) {
        console.error('MONGODB_URI not set. Create backend/.env first.');
        process.exit(1);
    }
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await User.findOne(TARGET_EMAIL ? { email: TARGET_EMAIL } : { username: TARGET_USERNAME });
    if (!user) {
        console.error(`User "${TARGET_EMAIL || TARGET_USERNAME}" not found.`);
        process.exit(1);
    }
    if (user.role === 'admin') {
        console.log(`"${user.username}" is already admin.`);
    } else {
        user.role = 'admin';
        await user.save();
        console.log(`✓ "${user.username}" (${user.email}) promoted to admin.`);
    }
    await mongoose.disconnect();
})();

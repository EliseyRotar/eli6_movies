const mongoose = require('mongoose');
const User = require('./models/User');

async function fixMyList() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eli6_movies');
        console.log('Connected to MongoDB');

        // Get all users
        const users = await User.find({});
        console.log(`Found ${users.length} users`);

        let fixed = 0;
        let skipped = 0;

        for (const user of users) {
            try {
                // Check if myList is corrupted
                if (!Array.isArray(user.myList)) {
                    console.log(`Fixing corrupted myList for user: ${user.email || user._id}`);
                    user.myList = [];
                    await user.save();
                    fixed++;
                } else {
                    // Validate each item in myList
                    const validItems = user.myList.filter(item => {
                        return (
                            typeof item === 'object' &&
                            typeof item.id === 'number' &&
                            typeof item.title === 'string' &&
                            ['movie', 'tv', 'anime'].includes(item.type) &&
                            typeof item.poster_path === 'string'
                        );
                    });

                    if (validItems.length !== user.myList.length) {
                        console.log(`Fixing invalid items in myList for user: ${user.email || user._id}`);
                        user.myList = validItems;
                        await user.save();
                        fixed++;
                    } else {
                        skipped++;
                    }
                }
            } catch (error) {
                console.error(`Error fixing user ${user.email || user._id}:`, error.message);
            }
        }

        console.log('\nFix Summary:');
        console.log(`Total users processed: ${users.length}`);
        console.log(`Users fixed: ${fixed}`);
        console.log(`Users skipped (already valid): ${skipped}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

// Run the fix
fixMyList(); 
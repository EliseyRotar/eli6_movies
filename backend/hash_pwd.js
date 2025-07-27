const bcrypt = require('bcrypt');

bcrypt.hash('Lopa2024!', 10, (err, hash) => {
    if (err) throw err;
    console.log(hash);
}); 
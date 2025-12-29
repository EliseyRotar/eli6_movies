const bcrypt = require('bcrypt');

bcrypt.hash('REDACTED_PASSWORD', 10, (err, hash) => {
    if (err) throw err;
    console.log(hash);
});

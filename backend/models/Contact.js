const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    type:      { type: String, enum: ['bug', 'suggestion', 'other'], default: 'other' },
    message:   { type: String, required: true, maxlength: 3000 },
    email:     { type: String, default: '' },
    ip:        { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Contact', contactSchema);

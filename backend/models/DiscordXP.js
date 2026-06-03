const mongoose = require('mongoose');

const discordXPSchema = new mongoose.Schema({
    userId:    { type: String, required: true },
    guildId:   { type: String, required: true },
    username:  { type: String, default: '' },
    xp:        { type: Number, default: 0 },
    level:     { type: Number, default: 0 },
}, { timestamps: true });

discordXPSchema.index({ guildId: 1, xp: -1 });
discordXPSchema.index({ userId: 1, guildId: 1 }, { unique: true });

module.exports = mongoose.model('DiscordXP', discordXPSchema);

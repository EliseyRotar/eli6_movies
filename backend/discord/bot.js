const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const DiscordXP = require('../models/DiscordXP');

const GUILD_ID        = process.env.DISCORD_GUILD_ID  || '1511802012637860001';
const LEVELUP_CH      = process.env.DISCORD_LEVELUP_CH || '1511802515677642985'; // #level-ups
const REGULAR_ROLE    = process.env.DISCORD_REGULAR_ROLE || '1511802418533372084'; // 🔥 Regular
const VERIFIED_ROLE   = process.env.DISCORD_VERIFIED_ROLE || '1511802416197144708'; // ✅ Verified

// XP per level formula: 5n² + 50n + 100
function xpForLevel(n) {
    return 5 * n * n + 50 * n + 100;
}

// Total XP required to reach a given level from 0
function totalXpForLevel(level) {
    let total = 0;
    for (let i = 0; i < level; i++) total += xpForLevel(i);
    return total;
}

// Compute level from total XP
function computeLevel(xp) {
    let level = 0;
    while (xp >= totalXpForLevel(level + 1)) level++;
    return level;
}

const cooldowns = new Map(); // userId → last message timestamp

const COLORS = {
    yellow: 0xE5FF00,
    green:  0x46D369,
    blue:   0x5865F2,
    gold:   0xFFD700,
    dark:   0x2F3136,
};

const FOOTER = { text: 'ELI6 Movies', iconURL: 'https://eli6movies.vercel.app/img/favicon.svg' };

function startBot(token) {
    if (!token) {
        console.log('[Discord] No DISCORD_TOKEN set — bot not started');
        return;
    }

    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildMembers,
        ],
    });

    client.once('ready', () => {
        console.log(`[Discord] Logged in as ${client.user.tag}`);
        client.user.setActivity('eli6movies.vercel.app', { type: 3 }); // Watching
    });

    // ── XP on message ──────────────────────────────────────────────────────────
    client.on('messageCreate', async (msg) => {
        if (msg.author.bot) return;
        if (msg.guildId !== GUILD_ID) return;
        if (msg.content.startsWith('!')) return handleCommand(msg, client);

        // 60s cooldown per user
        const now = Date.now();
        const last = cooldowns.get(msg.author.id) || 0;
        if (now - last < 60_000) return;
        cooldowns.set(msg.author.id, now);

        const earned = Math.floor(Math.random() * 11) + 15; // 15–25 XP

        try {
            const entry = await DiscordXP.findOneAndUpdate(
                { userId: msg.author.id, guildId: GUILD_ID },
                {
                    $inc: { xp: earned },
                    $set: { username: msg.author.username },
                },
                { upsert: true, new: true }
            );

            const newLevel = computeLevel(entry.xp);
            if (newLevel > entry.level) {
                await DiscordXP.updateOne({ userId: msg.author.id, guildId: GUILD_ID }, { $set: { level: newLevel } });
                await onLevelUp(msg, client, newLevel);
            }
        } catch (err) {
            console.error('[Discord XP]', err.message);
        }
    });

    // ── Level up handler ───────────────────────────────────────────────────────
    async function onLevelUp(msg, client, newLevel) {
        try {
            const ch = await client.channels.fetch(LEVELUP_CH).catch(() => null);
            if (ch) {
                const embed = new EmbedBuilder()
                    .setColor(newLevel >= 5 ? COLORS.gold : COLORS.yellow)
                    .setTitle(newLevel >= 5 ? '⭐ Level Up + Role Unlocked!' : '🎉 Level Up!')
                    .setDescription(
                        `${msg.author} reached **Level ${newLevel}**!` +
                        (newLevel === 5 ? `\n\nYou've been given the 🔥 **Regular** role — welcome to the inner circle.` : '')
                    )
                    .setFooter(FOOTER);
                await ch.send({ embeds: [embed] });
            }

            // Assign Regular role at level 5
            if (newLevel >= 5) {
                const guild  = await client.guilds.fetch(GUILD_ID).catch(() => null);
                const member = await guild?.members.fetch(msg.author.id).catch(() => null);
                if (member && !member.roles.cache.has(REGULAR_ROLE)) {
                    await member.roles.add(REGULAR_ROLE).catch(console.error);
                }
            }
        } catch (err) {
            console.error('[Discord LevelUp]', err.message);
        }
    }

    // ── Commands ───────────────────────────────────────────────────────────────
    async function handleCommand(msg, client) {
        const cmd = msg.content.trim().toLowerCase().split(/\s+/)[0];

        if (cmd === '!rank') {
            try {
                const entry = await DiscordXP.findOne({ userId: msg.author.id, guildId: GUILD_ID });
                if (!entry || entry.xp === 0) {
                    return msg.reply('You haven\'t earned any XP yet — start chatting!');
                }
                const level    = computeLevel(entry.xp);
                const levelXp  = xpForLevel(level);
                const progress = entry.xp - totalXpForLevel(level);
                const bar      = buildBar(progress, levelXp);
                const rank     = await DiscordXP.countDocuments({ guildId: GUILD_ID, xp: { $gt: entry.xp } }) + 1;

                const embed = new EmbedBuilder()
                    .setColor(COLORS.yellow)
                    .setTitle(`📊 ${msg.author.username}'s Rank`)
                    .setThumbnail(msg.author.displayAvatarURL())
                    .addFields(
                        { name: 'Rank',  value: `#${rank}`,            inline: true },
                        { name: 'Level', value: `${level}`,             inline: true },
                        { name: 'XP',    value: `${entry.xp} total`,   inline: true },
                        { name: `Progress to Level ${level + 1}`, value: `${bar}\n${progress} / ${levelXp} XP`, inline: false },
                    )
                    .setFooter(FOOTER);
                return msg.reply({ embeds: [embed] });
            } catch (err) {
                console.error('[!rank]', err.message);
            }
        }

        if (cmd === '!leaderboard' || cmd === '!lb') {
            try {
                const top = await DiscordXP.find({ guildId: GUILD_ID }).sort({ xp: -1 }).limit(10);
                if (!top.length) return msg.reply('No XP data yet.');

                const medals = ['🥇', '🥈', '🥉'];
                const rows = top.map((e, i) => {
                    const medal = medals[i] || `**${i + 1}.**`;
                    const lvl   = computeLevel(e.xp);
                    return `${medal} ${e.username || 'Unknown'}  —  Level ${lvl}  (${e.xp} XP)`;
                }).join('\n');

                const embed = new EmbedBuilder()
                    .setColor(COLORS.yellow)
                    .setTitle('🏆 ELI6 Movies Leaderboard')
                    .setDescription(rows)
                    .setFooter(FOOTER)
                    .setTimestamp();
                return msg.reply({ embeds: [embed] });
            } catch (err) {
                console.error('[!lb]', err.message);
            }
        }

        if (cmd === '!site') {
            const embed = new EmbedBuilder()
                .setColor(COLORS.yellow)
                .setDescription('🎬 **[Watch free on ELI6 Movies](https://eli6movies.vercel.app)**\nMovies · TV Shows · Anime · Live Sports — no sign-up, no ads.')
                .setFooter(FOOTER);
            return msg.reply({ embeds: [embed] });
        }

        if (cmd === '!report') {
            return msg.reply(`Drop the title, type, and which server failed in <#1511802487961817139> and the team will look into it.`);
        }

        if (cmd === '!trakt') {
            return msg.reply('Connect your Trakt account at **Account → Connected Apps** on the site: https://eli6movies.vercel.app/account.html');
        }

        if (cmd === '!help') {
            const embed = new EmbedBuilder()
                .setColor(COLORS.blue)
                .setTitle('🤖 ELI6 Bot Commands')
                .addFields(
                    { name: '!rank',        value: 'Your level and XP progress',         inline: true },
                    { name: '!leaderboard', value: 'Top 10 most active members',         inline: true },
                    { name: '!site',        value: 'Link to ELI6 Movies',                inline: true },
                    { name: '!report',      value: 'How to report a broken source',      inline: true },
                    { name: '!trakt',       value: 'How to connect Trakt',               inline: true },
                    { name: '!help',        value: 'This message',                       inline: true },
                )
                .setFooter(FOOTER);
            return msg.reply({ embeds: [embed] });
        }
    }

    client.login(token).catch(err => console.error('[Discord] Login failed:', err.message));
}

function buildBar(current, max, length = 14) {
    const filled = Math.round((current / max) * length);
    return '▓'.repeat(filled) + '░'.repeat(length - filled);
}

module.exports = { startBot };

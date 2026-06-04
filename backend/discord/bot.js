const {
    Client, GatewayIntentBits, EmbedBuilder,
    AutoModerationRuleTriggerType, AutoModerationActionType,
} = require('discord.js');
const mongoose = require('mongoose');
const DiscordXP = require('../models/DiscordXP');
const { fetchTMDB } = require('../services/tmdbClient');

const GUILD_ID      = process.env.DISCORD_GUILD_ID      || '1511802012637860001';
const LEVELUP_CH    = process.env.DISCORD_LEVELUP_CH    || '1511802515677642985';
const REGULAR_ROLE  = process.env.DISCORD_REGULAR_ROLE  || '1511802418533372084';
const VERIFIED_ROLE = process.env.DISCORD_VERIFIED_ROLE || '1511802416197144708';
const VIP_ROLE      = process.env.DISCORD_VIP_ROLE      || '1511802420957544519';
const STATUS_CH     = process.env.DISCORD_STATUS_CH     || '1511802446366642357';
const SUGGEST_CH    = process.env.DISCORD_SUGGEST_CH    || '1511802490092261540';
const REPORT_CH     = process.env.DISCORD_REPORT_CH     || '1511802487961817139';
const CHANGELOG_CH  = process.env.DISCORD_CHANGELOG_CH  || '1511983116795904100';
const SCREENSHOTS_CH= process.env.DISCORD_SCREENSHOTS_CH|| '1511982889833599018';
const SOURCE_DOWN_ROLE = process.env.DISCORD_SOURCE_DOWN_ROLE || '1511814123032412221';
const UPDATE_PINGS_ROLE= process.env.DISCORD_UPDATE_PINGS_ROLE|| '1511814119832031312';

const SITE    = 'https://eli6movies.vercel.app';
const BACKEND = 'https://eli6movies.onrender.com';

let GENERAL_CH = process.env.DISCORD_GENERAL_CH || null;
let VERIFY_CH  = process.env.DISCORD_VERIFY_CH  || null;
let ROLES_CH   = process.env.DISCORD_ROLES_CH   || null;

// XP formula: 5n² + 50n + 100 per level
function xpForLevel(n) { return 5 * n * n + 50 * n + 100; }
function totalXpForLevel(level) {
    let t = 0;
    for (let i = 0; i < level; i++) t += xpForLevel(i);
    return t;
}
function computeLevel(xp) {
    let level = 0;
    while (xp >= totalXpForLevel(level + 1)) level++;
    return level;
}
function buildBar(current, max, length = 14) {
    const filled = Math.round((current / max) * length);
    return '▓'.repeat(filled) + '░'.repeat(length - filled);
}

const cooldowns = new Map();

const COLORS = { yellow: 0xE5FF00, green: 0x46D369, blue: 0x5865F2, gold: 0xFFD700, red: 0xed4245 };
const FOOTER  = { text: 'ELI6 Movies', iconURL: `${SITE}/img/favicon.svg` };

// Pending Discord link codes: code → { discordId, username, expires }
const pendingLinks = new Map();

let botClient = null;

async function assignVipRole(discordId) {
    if (!botClient) return;
    try {
        const guild  = await botClient.guilds.fetch(GUILD_ID).catch(() => null);
        const member = await guild?.members.fetch(discordId).catch(() => null);
        if (member && !member.roles.cache.has(VIP_ROLE)) {
            await member.roles.add(VIP_ROLE);
            console.log(`[Discord] VIP role assigned to ${discordId}`);
        }
    } catch (err) {
        console.error('[assignVipRole]', err.message);
    }
}

function startBot(token) {
    if (!token) {
        console.log('[Discord] No DISCORD_TOKEN — bot not started');
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

    botClient = client;

    client.once('ready', async () => {
        console.log(`[Discord] Logged in as ${client.user.tag}`);
        client.user.setActivity('eli6movies.vercel.app', { type: 3 });

        try {
            const guild    = await client.guilds.fetch(GUILD_ID);
            const channels = await guild.channels.fetch();
            if (!GENERAL_CH) GENERAL_CH = channels.find(c => c.name === 'general')?.id     || null;
            if (!VERIFY_CH)  VERIFY_CH  = channels.find(c => c.name === 'verify-here')?.id || null;
            if (!ROLES_CH)   ROLES_CH   = channels.find(c => c.name === 'get-roles')?.id   || null;
            console.log(`[Discord] Channels — general:${GENERAL_CH} verify:${VERIFY_CH} roles:${ROLES_CH}`);

            await setupAutoMod(guild);
            scheduleWeeklyPoll(client);
            startStatusMonitor(client);
        } catch (err) {
            console.error('[Discord ready]', err.message);
        }
    });

    // ── Welcome DM ─────────────────────────────────────────────────────────────
    client.on('guildMemberAdd', async (member) => {
        if (member.guild.id !== GUILD_ID) return;
        try {
            const lines = [
                `Hey **${member.user.username}**! Glad you're here.\n`,
                `🎬 **[Watch now — free, no sign-up](${SITE})**`,
                `Movies · TV Shows · Anime · Live Sports\n`,
                `**Quick start:**`,
                VERIFY_CH ? `→ Go to <#${VERIFY_CH}> and click ✅ to unlock the server` : '',
                ROLES_CH  ? `→ Pick your interests in <#${ROLES_CH}>` : '',
                `→ Chat to earn XP and level up`,
                `\nType \`!help\` to see all bot commands.`,
            ].filter(Boolean).join('\n');

            await member.send({
                embeds: [new EmbedBuilder()
                    .setColor(COLORS.yellow)
                    .setTitle('👋 Welcome to ELI6 Movies!')
                    .setDescription(lines)
                    .setFooter(FOOTER)],
            });
        } catch {
            // DMs disabled — ignore
        }
    });

    // ── XP + commands ──────────────────────────────────────────────────────────
    client.on('messageCreate', async (msg) => {
        if (msg.author.bot) return;
        if (msg.guildId !== GUILD_ID) return;
        if (msg.content.startsWith('!')) return handleCommand(msg);

        const now = Date.now();
        if (now - (cooldowns.get(msg.author.id) || 0) < 60_000) return;
        cooldowns.set(msg.author.id, now);

        const earned = Math.floor(Math.random() * 11) + 15;
        try {
            const entry = await DiscordXP.findOneAndUpdate(
                { userId: msg.author.id, guildId: GUILD_ID },
                { $inc: { xp: earned }, $set: { username: msg.author.username } },
                { upsert: true, new: true }
            );
            const newLevel = computeLevel(entry.xp);
            if (newLevel > entry.level) {
                await DiscordXP.updateOne(
                    { userId: msg.author.id, guildId: GUILD_ID },
                    { $set: { level: newLevel } }
                );
                await onLevelUp(msg, newLevel);
            }
        } catch (err) {
            console.error('[Discord XP]', err.message);
        }
    });

    async function onLevelUp(msg, newLevel) {
        try {
            const embed = new EmbedBuilder()
                .setColor(newLevel >= 5 ? COLORS.gold : COLORS.yellow)
                .setTitle(newLevel >= 5 ? '⭐ Level Up + Role Unlocked!' : '🎉 Level Up!')
                .setDescription(
                    `${msg.author} reached **Level ${newLevel}**!` +
                    (newLevel === 5 ? '\n\nYou\'ve been given the 🔥 **Regular** role — welcome to the inner circle.' : '')
                )
                .setFooter(FOOTER);

            // DM the user — no channel spam
            try {
                await msg.author.send({ embeds: [embed] });
            } catch {
                // DMs off — fall back to channel
                const ch = await client.channels.fetch(LEVELUP_CH).catch(() => null);
                if (ch) await ch.send({ embeds: [embed] });
            }

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

    async function handleCommand(msg) {
        const parts = msg.content.trim().split(/\s+/);
        const cmd   = parts[0].toLowerCase();

        // ── !watch <title> ────────────────────────────────────────────────────
        if (cmd === '!watch') {
            const query = parts.slice(1).join(' ');
            if (!query) return msg.reply('Usage: `!watch <movie or show title>`');
            try {
                const data    = await fetchTMDB('/search/multi', { query });
                const results = (data.results || [])
                    .filter(r => r.media_type === 'movie' || r.media_type === 'tv')
                    .slice(0, 3);
                if (!results.length) return msg.reply(`Nothing found for "${query}".`);

                const embed = new EmbedBuilder()
                    .setColor(COLORS.yellow)
                    .setTitle(`🎬 Results for "${query}"`)
                    .addFields(results.map(r => {
                        const title = r.title || r.name;
                        const year  = (r.release_date || r.first_air_date || '').slice(0, 4);
                        return {
                            name:   `${title}${year ? ` (${year})` : ''}`,
                            value:  `[▶ Watch](${SITE}/watch/${r.media_type}/${r.id})`,
                            inline: true,
                        };
                    }))
                    .setFooter(FOOTER);
                return msg.reply({ embeds: [embed] });
            } catch (err) {
                console.error('[!watch]', err.message);
                return msg.reply('Could not search right now — try again in a moment.');
            }
        }

        // ── !new ──────────────────────────────────────────────────────────────
        if (cmd === '!new') {
            try {
                const data  = await fetchTMDB('/trending/all/week');
                const items = (data.results || []).slice(0, 5);
                const rows  = items.map((item, i) =>
                    `${i + 1}. [${item.title || item.name}](${SITE}/watch/${item.media_type}/${item.id})`
                ).join('\n');
                return msg.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(COLORS.yellow)
                        .setTitle('🔥 Trending This Week')
                        .setDescription(rows)
                        .setFooter(FOOTER)],
                });
            } catch (err) {
                console.error('[!new]', err.message);
                return msg.reply('Could not fetch trending right now.');
            }
        }

        // ── !request <title> ─────────────────────────────────────────────────
        if (cmd === '!request') {
            const title = parts.slice(1).join(' ');
            if (!title) return msg.reply('Usage: `!request <movie or show title>`');
            try {
                const ch = await client.channels.fetch(SUGGEST_CH).catch(() => null);
                if (!ch) return msg.reply('Suggestions channel not found.');
                const embed = new EmbedBuilder()
                    .setColor(COLORS.blue)
                    .setTitle('📬 New Request')
                    .addFields(
                        { name: 'Title',       value: title,                      inline: true },
                        { name: 'Requested by', value: `${msg.author} (${msg.author.username})`, inline: true },
                    )
                    .setFooter(FOOTER)
                    .setTimestamp();
                const posted = await ch.send({ embeds: [embed] });
                await posted.react('👍');
                await posted.react('👎');
                await msg.reply(`✅ Request posted in <#${SUGGEST_CH}>! Others can vote 👍/👎.`);
            } catch (err) {
                console.error('[!request]', err.message);
                return msg.reply('Could not post request right now.');
            }
        }

        // ── !report <title> [server] ─────────────────────────────────────────
        if (cmd === '!report') {
            const rest = parts.slice(1).join(' ');
            if (!rest) return msg.reply('Usage: `!report <title> [server name]`\nExample: `!report Breaking Bad VidSrc`');
            try {
                const ch = await client.channels.fetch(REPORT_CH).catch(() => null);
                if (!ch) return msg.reply('Report channel not found.');
                const embed = new EmbedBuilder()
                    .setColor(COLORS.red)
                    .setTitle('🚨 Broken Source Report')
                    .addFields(
                        { name: 'Content',      value: rest,                                   inline: true },
                        { name: 'Reported by',  value: `${msg.author} (${msg.author.username})`, inline: true },
                        { name: 'From channel', value: `<#${msg.channelId}>`,                  inline: true },
                    )
                    .setFooter(FOOTER)
                    .setTimestamp();
                await ch.send({ embeds: [embed] });
                await msg.reply(`✅ Report logged in <#${REPORT_CH}>. Thanks — the team will check it.`);
            } catch (err) {
                console.error('[!report]', err.message);
                return msg.reply('Could not file report right now.');
            }
        }

        // ── !faq ──────────────────────────────────────────────────────────────
        if (cmd === '!faq') {
            return msg.reply({
                embeds: [new EmbedBuilder()
                    .setColor(COLORS.blue)
                    .setTitle('❓ Frequently Asked Questions')
                    .addFields(
                        {
                            name:  'Why is a source broken?',
                            value: 'Third-party embed providers go down all the time. Hit the ▶ button in the player to switch to a different server — there are 15+ options.',
                        },
                        {
                            name:  'Why are there ads?',
                            value: `We don't control ads in embed players. Install **uBlock Origin** — it blocks basically all of them. [Get it here](${SITE}) (the site has a guide on install).`,
                        },
                        {
                            name:  'How do I request a title?',
                            value: `Use \`!request <title>\` right here — it posts to <#${SUGGEST_CH}> and others can upvote it.`,
                        },
                        {
                            name:  'How do I get VIP?',
                            value: `Link your ELI6 Movies account (\`!link\`) **and** connect Trakt from your account page — VIP gets assigned automatically when both are done.`,
                        },
                        {
                            name:  'Why was my account removed?',
                            value: `Email **eli6movies@proton.me** or post in <#${msg.channelId === '1511802495473811520' ? msg.channelId : '1511802495473811520'}> — we'll sort it.`,
                        },
                    )
                    .setFooter(FOOTER)],
            });
        }

        // ── !link ─────────────────────────────────────────────────────────────
        if (cmd === '!link') {
            for (const [k, v] of pendingLinks) {
                if (v.expires < Date.now()) pendingLinks.delete(k);
            }
            const code    = Math.random().toString(36).slice(2, 8).toUpperCase();
            const expires = Date.now() + 10 * 60 * 1000;
            pendingLinks.set(code, { discordId: msg.author.id, username: msg.author.username, expires });

            const text =
                `🔗 **Link your ELI6 Movies account**\n\n` +
                `Go to **${SITE}/account.html** → Connected apps → Discord → enter this code:\n\n` +
                `## \`${code}\`\n\n*(expires in 10 minutes)*`;
            try {
                await msg.author.send(text);
                return msg.reply('Check your DMs for the code!');
            } catch {
                return msg.reply(`Your code: \`${code}\` — go to ${SITE}/account.html → Connected apps → Discord. *(10 min)*`);
            }
        }

        // ── !rank ─────────────────────────────────────────────────────────────
        if (cmd === '!rank') {
            try {
                const entry = await DiscordXP.findOne({ userId: msg.author.id, guildId: GUILD_ID });
                if (!entry || entry.xp === 0) return msg.reply('You haven\'t earned any XP yet — start chatting!');
                const level    = computeLevel(entry.xp);
                const levelXp  = xpForLevel(level);
                const progress = entry.xp - totalXpForLevel(level);
                const rank     = await DiscordXP.countDocuments({ guildId: GUILD_ID, xp: { $gt: entry.xp } }) + 1;
                return msg.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(COLORS.yellow)
                        .setTitle(`📊 ${msg.author.username}'s Rank`)
                        .setThumbnail(msg.author.displayAvatarURL())
                        .addFields(
                            { name: 'Rank',  value: `#${rank}`,          inline: true },
                            { name: 'Level', value: `${level}`,           inline: true },
                            { name: 'XP',    value: `${entry.xp} total`, inline: true },
                            { name: `Progress to Level ${level + 1}`, value: `${buildBar(progress, levelXp)}\n${progress} / ${levelXp} XP` }
                        )
                        .setFooter(FOOTER)],
                });
            } catch (err) { console.error('[!rank]', err.message); }
        }

        // ── !leaderboard / !lb ────────────────────────────────────────────────
        if (cmd === '!leaderboard' || cmd === '!lb') {
            try {
                const top = await DiscordXP.find({ guildId: GUILD_ID }).sort({ xp: -1 }).limit(10);
                if (!top.length) return msg.reply('No XP data yet.');
                const medals = ['🥇', '🥈', '🥉'];
                const rows = top.map((e, i) =>
                    `${medals[i] || `**${i + 1}.**`} ${e.username || 'Unknown'}  —  Level ${computeLevel(e.xp)}  (${e.xp} XP)`
                ).join('\n');
                return msg.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(COLORS.yellow)
                        .setTitle('🏆 ELI6 Movies Leaderboard')
                        .setDescription(rows)
                        .setFooter(FOOTER)
                        .setTimestamp()],
                });
            } catch (err) { console.error('[!lb]', err.message); }
        }

        if (cmd === '!site') {
            return msg.reply({
                embeds: [new EmbedBuilder()
                    .setColor(COLORS.yellow)
                    .setDescription(`🎬 **[Watch free on ELI6 Movies](${SITE})**\nMovies · TV Shows · Anime · Live Sports — no sign-up, no ads.`)
                    .setFooter(FOOTER)],
            });
        }

        if (cmd === '!status') {
            if (!lastStatus) return msg.reply('Status not available yet — check back in a minute.');
            const s = lastStatus;
            const icon = ok => ok ? '🟢' : '🔴';
            const allOk = s.frontend && s.db && s.tmdb && s.anime;
            const ago = Math.round((Date.now() - s.ts) / 1000);
            return msg.reply({
                embeds: [new EmbedBuilder()
                    .setColor(allOk ? 0x3ba55c : 0xed4245)
                    .setTitle(allOk ? '✅ All Systems Operational' : '⚠️ Partial Outage')
                    .addFields(
                        { name: `${icon(s.frontend)} Frontend`,   value: 'eli6movies.vercel.app',  inline: true },
                        { name: `${icon(s.db)} Database`,         value: 'MongoDB',                inline: true },
                        { name: `${icon(s.tmdb)} TMDB`,           value: 'Movie & TV metadata',    inline: true },
                        { name: `${icon(s.anime)} Anime API`,     value: 'Jikan / MyAnimeList',    inline: true },
                    )
                    .setFooter({ text: `Last checked ${ago}s ago` })
                    .setTimestamp(new Date(s.ts))],
            });
        }

        if (cmd === '!trakt')
            return msg.reply(`Connect your Trakt account at **Account → Connected apps** on the site: ${SITE}/account.html`);

        if (cmd === '!help') {
            return msg.reply({
                embeds: [new EmbedBuilder()
                    .setColor(COLORS.blue)
                    .setTitle('🤖 ELI6 Bot Commands')
                    .addFields(
                        { name: '!watch <title>',          value: 'Search and get a watch link',             inline: true },
                        { name: '!new',                    value: 'Trending titles this week',               inline: true },
                        { name: '!request <title>',        value: 'Request a movie or show',                 inline: true },
                        { name: '!report <title> [server]',value: 'Report a broken source',                  inline: true },
                        { name: '!faq',                    value: 'Answers to common questions',             inline: true },
                        { name: '!status',                 value: 'Live service status',                     inline: true },
                        { name: '!rank',                   value: 'Your level and XP progress',              inline: true },
                        { name: '!leaderboard',            value: 'Top 10 most active members',              inline: true },
                        { name: '!link',                   value: 'Link your ELI6 Movies account',           inline: true },
                        { name: '!site',                   value: 'Link to ELI6 Movies',                     inline: true },
                        { name: '!trakt',                  value: 'How to connect Trakt',                    inline: true },
                        { name: '!help',                   value: 'This message',                            inline: true },
                    )
                    .setFooter(FOOTER)],
            });
        }
    }

    client.login(token).catch(err => console.error('[Discord] Login failed:', err.message));
}

// ── Status monitor ────────────────────────────────────────────────────────────
let lastStatus    = null;
let statusMsgId   = null;
let prevStatusKey = null;

async function httpCheck(url, timeout = 7000) {
    try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeout);
        const r = await fetch(url, { signal: ctrl.signal });
        clearTimeout(timer);
        return r.ok;
    } catch {
        return false;
    }
}

function statusKey(s) {
    return `${s.frontend ? 1 : 0}${s.db ? 1 : 0}${s.tmdb ? 1 : 0}${s.anime ? 1 : 0}`;
}

function buildStatusEmbed(s) {
    const icon  = ok => ok ? '🟢' : '🔴';
    const allOk = s.frontend && s.db && s.tmdb && s.anime;
    return new EmbedBuilder()
        .setColor(allOk ? 0x3ba55c : 0xed4245)
        .setTitle(allOk ? '✅ All Systems Operational' : '🔴 Service Disruption')
        .addFields(
            { name: `${icon(s.frontend)} Frontend`,  value: 'eli6movies.vercel.app', inline: true },
            { name: `${icon(s.db)} Database`,         value: 'MongoDB',               inline: true },
            { name: `${icon(s.tmdb)} TMDB`,           value: 'Movie & TV metadata',   inline: true },
            { name: `${icon(s.anime)} Anime API`,     value: 'Jikan / MyAnimeList',   inline: true },
        )
        .setFooter({ text: 'ELI6 Movies • Auto-updated every 5 min' })
        .setTimestamp();
}

async function startStatusMonitor(client) {
    const ch = await client.channels.fetch(STATUS_CH).catch(() => null);
    if (!ch) { console.log('[Status] Channel not found'); return; }

    try {
        const recent = await ch.messages.fetch({ limit: 20 });
        const mine   = recent.find(m => m.author.id === client.user.id && m.embeds.length > 0);
        if (mine) statusMsgId = mine.id;
    } catch { /* ignore */ }

    await runStatusCheck(ch);
    setInterval(() => runStatusCheck(ch), 5 * 60 * 1000);
}

async function runStatusCheck(ch) {
    const [frontendOk, tmdbOk, animeOk] = await Promise.all([
        httpCheck(SITE),
        httpCheck(`https://api.themoviedb.org/3/configuration?api_key=${process.env.TMDB_API_KEY}`),
        httpCheck('https://api.jikan.moe/v4/anime?limit=1'),
    ]);
    const dbOk = mongoose.connection.readyState === 1;

    const s = { frontend: frontendOk, db: dbOk, tmdb: tmdbOk, anime: animeOk, ts: Date.now() };
    const key = statusKey(s);

    if (prevStatusKey !== null && prevStatusKey !== key) {
        await postIncidentMessage(ch, s, key);
    }
    prevStatusKey = key;
    lastStatus    = s;

    const embed = buildStatusEmbed(s);
    if (statusMsgId) {
        try {
            const msg = await ch.messages.fetch(statusMsgId);
            await msg.edit({ embeds: [embed] });
            return;
        } catch {
            statusMsgId = null;
        }
    }
    const msg = await ch.send({ embeds: [embed] }).catch(() => null);
    if (msg) {
        statusMsgId = msg.id;
        await msg.pin().catch(() => {});
    }
}

async function postIncidentMessage(ch, s, key) {
    const allOk = s.frontend && s.db && s.tmdb && s.anime;
    const icon  = ok => ok ? '🟢' : '🔴';
    const lines = [
        `${icon(s.frontend)} Frontend`,
        `${icon(s.db)} Database`,
        `${icon(s.tmdb)} TMDB`,
        `${icon(s.anime)} Anime API`,
    ].join('  ·  ');

    const embed = new EmbedBuilder()
        .setColor(allOk ? 0x3ba55c : 0xed4245)
        .setTitle(allOk ? '✅ All systems recovered' : '🚨 Incident detected')
        .setDescription(lines)
        .setTimestamp();

    // Ping Source Down role on outage, Update Pings on recovery
    const rolePing = allOk
        ? `<@&${UPDATE_PINGS_ROLE}> Site is back online.`
        : `<@&${SOURCE_DOWN_ROLE}> Something went down — checking now.`;

    await ch.send({ content: rolePing, embeds: [embed] }).catch(() => {});
}

// ── AutoMod ────────────────────────────────────────────────────────────────────
async function setupAutoMod(guild) {
    try {
        const existing = await guild.autoModerationRules.fetch();
        const names    = [...existing.values()].map(r => r.name);

        if (!names.includes('Block invite links')) {
            await guild.autoModerationRules.create({
                name:            'Block invite links',
                eventType:       1,
                triggerType:     AutoModerationRuleTriggerType.Keyword,
                triggerMetadata: { regexPatterns: ['discord\\.(gg|com\\/invite)\\/[a-zA-Z0-9]+'] },
                actions:         [{ type: AutoModerationActionType.BlockMessage, metadata: { customMessage: 'No invite links here.' } }],
                enabled:         true,
            });
        }

        if (!names.includes('Mention spam')) {
            await guild.autoModerationRules.create({
                name:            'Mention spam',
                eventType:       1,
                triggerType:     AutoModerationRuleTriggerType.MentionSpam,
                triggerMetadata: { mentionTotalLimit: 5 },
                actions:         [{ type: AutoModerationActionType.BlockMessage, metadata: { customMessage: 'Too many mentions in one message.' } }],
                enabled:         true,
            });
        }

        console.log('[Discord AutoMod] Rules set up');
    } catch (err) {
        console.error('[Discord AutoMod]', err.message);
    }
}

// ── Weekly poll ────────────────────────────────────────────────────────────────
let lastPollWeek = null;

function getISOWeek(d) {
    const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

function scheduleWeeklyPoll(client) {
    setInterval(() => checkAndPostPoll(client), 60 * 60 * 1000);
    checkAndPostPoll(client);
}

async function checkAndPostPoll(client) {
    if (!GENERAL_CH) return;
    const now     = new Date();
    const weekKey = `${now.getUTCFullYear()}-W${getISOWeek(now)}`;
    if (lastPollWeek === weekKey) return;
    if (now.getUTCDay() !== 0) return;
    if (now.getUTCHours() < 12 || now.getUTCHours() > 13) return;

    lastPollWeek = weekKey;
    try {
        const data  = await fetchTMDB('/trending/movie/week');
        const picks = (data.results || []).slice(0, 5);
        if (!picks.length) return;

        const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
        const rows   = picks.map((m, i) =>
            `${emojis[i]} **${m.title}** (${(m.release_date || '').slice(0, 4)})`
        ).join('\n');

        const ch = await client.channels.fetch(GENERAL_CH).catch(() => null);
        if (!ch) return;

        const pollMsg = await ch.send({
            content: `<@&${UPDATE_PINGS_ROLE}>`,
            embeds: [new EmbedBuilder()
                .setColor(COLORS.yellow)
                .setTitle('🗳️ Weekly Poll — Which one are you watching?')
                .setDescription(rows + '\n\nReact below to vote!')
                .setFooter(FOOTER)
                .setTimestamp()],
        });
        for (const emoji of emojis.slice(0, picks.length)) {
            await pollMsg.react(emoji);
        }
        console.log('[Discord] Weekly poll posted');
    } catch (err) {
        console.error('[Discord weekly poll]', err.message);
    }
}

module.exports = { startBot, assignVipRole, pendingLinks };

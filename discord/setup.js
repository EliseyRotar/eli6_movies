/**
 * ELI6 Movies — Discord server setup script
 *
 * Usage:
 *   DISCORD_TOKEN=<bot_token> GUILD_ID=<server_id> node setup.js
 *
 * If GUILD_ID is omitted the bot will create a new server.
 * Run ONCE on a fresh server — it doesn't check for duplicates.
 */

const TOKEN   = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID || null;

if (!TOKEN) { console.error('Set DISCORD_TOKEN env var'); process.exit(1); }

const BASE = 'https://discord.com/api/v10';
const delay = ms => new Promise(r => setTimeout(r, ms));

async function api(method, path, body) {
    await delay(300); // stay well under rate limits
    const res = await fetch(BASE + path, {
        method,
        headers: {
            'Authorization': `Bot ${TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) {
        console.error(`API ${method} ${path} → ${res.status}`, text);
        throw new Error(`${res.status}: ${text}`);
    }
    return text ? JSON.parse(text) : null;
}

// ─── Permission flags ─────────────────────────────────────────────────────────
const P = {
    CREATE_INVITE:      '1',
    KICK:               '2',
    BAN:                '4',
    ADMINISTRATOR:      '8',
    MANAGE_CHANNELS:    '16',
    MANAGE_GUILD:       '32',
    ADD_REACTIONS:      '64',
    VIEW_AUDIT_LOG:     '128',
    VIEW_CHANNEL:       '1024',
    SEND_MESSAGES:      '2048',
    MANAGE_MESSAGES:    '8192',
    EMBED_LINKS:        '16384',
    ATTACH_FILES:       '32768',
    READ_HISTORY:       '65536',
    MENTION_EVERYONE:   '131072',
    EXTERNAL_EMOJIS:    '262144',
    MANAGE_ROLES:       '268435456',
    CHANGE_NICKNAME:    '67108864',
    CONNECT:            '1048576',
    SPEAK:              '2097152',
    MOVE_MEMBERS:       '16777216',
    USE_SLASH:          '2147483648',
    SEND_THREADS:       '274877906944',
};

// Combine multiple flags via BigInt addition
function perms(...flags) {
    return flags.reduce((acc, f) => acc + BigInt(f), 0n).toString();
}

// ─── Roles ────────────────────────────────────────────────────────────────────
// Colors as decimal (hex → decimal)
const ROLES_DEF = [
    { name: '👑 Owner',    color: 0xE5FF00, hoist: true,  mentionable: false, permissions: perms(P.ADMINISTRATOR) },
    { name: '⚡ Admin',    color: 0xFF4444, hoist: true,  mentionable: false, permissions: perms(P.ADMINISTRATOR) },
    { name: '🛡️ Mod',      color: 0xFF8800, hoist: true,  mentionable: true,  permissions: perms(P.KICK, P.BAN, P.MANAGE_MESSAGES, P.MANAGE_CHANNELS, P.VIEW_AUDIT_LOG, P.MOVE_MEMBERS) },
    { name: '🤖 Bots',     color: 0x5865F2, hoist: false, mentionable: false, permissions: perms(P.SEND_MESSAGES, P.EMBED_LINKS, P.READ_HISTORY, P.VIEW_CHANNEL, P.USE_SLASH, P.ADD_REACTIONS) },
    { name: '⭐ VIP',      color: 0xFFD700, hoist: true,  mentionable: true,  permissions: perms(P.VIEW_CHANNEL, P.SEND_MESSAGES, P.ADD_REACTIONS, P.READ_HISTORY, P.EMBED_LINKS, P.ATTACH_FILES, P.CHANGE_NICKNAME, P.CONNECT, P.SPEAK, P.USE_SLASH) },
    { name: '🔥 Regular',  color: 0x46D369, hoist: false, mentionable: false, permissions: perms(P.VIEW_CHANNEL, P.SEND_MESSAGES, P.ADD_REACTIONS, P.READ_HISTORY, P.EMBED_LINKS, P.ATTACH_FILES, P.CHANGE_NICKNAME, P.CONNECT, P.SPEAK, P.USE_SLASH) },
    { name: '✅ Verified', color: 0x7289DA, hoist: false, mentionable: false, permissions: perms(P.VIEW_CHANNEL, P.SEND_MESSAGES, P.ADD_REACTIONS, P.READ_HISTORY, P.EMBED_LINKS, P.ATTACH_FILES, P.CHANGE_NICKNAME, P.CONNECT, P.SPEAK, P.USE_SLASH) },
];

// ─── Channel layout ───────────────────────────────────────────────────────────
// type 0 = text, type 2 = voice, type 4 = category
// slowmode in seconds

const LAYOUT = [
    {
        name: '📢 ANNOUNCEMENTS', type: 4, channels: [
            { name: 'announcements', topic: 'Major site news and updates. Watch for pings here.',     readOnly: true },
            { name: 'updates',       topic: 'Every feature and fix — linked to eli6movies.vercel.app/updates.html', readOnly: true },
            { name: 'site-status',   topic: 'Downtime, maintenance, and source issues.',              readOnly: true },
        ],
    },
    {
        name: '👋 START HERE', type: 4, channels: [
            { name: 'rules',        topic: 'Read before anything else.',                              readOnly: true },
            { name: 'verify-here',  topic: 'React with ✅ to get access to the rest of the server.', readOnly: true },
            { name: 'get-roles',    topic: 'Pick your notification and interest roles.',              readOnly: true },
        ],
    },
    {
        name: '💬 COMMUNITY', type: 4, verifiedOnly: true, channels: [
            { name: 'general',        topic: 'Main chat.',                                     slowmode: 3 },
            { name: 'introductions',  topic: 'New here? Say hi.',                             slowmode: 30 },
            { name: 'off-topic',      topic: 'Anything goes (within rules).',                 slowmode: 0 },
        ],
    },
    {
        name: '🎬 ELI6 MOVIES', type: 4, verifiedOnly: true, channels: [
            { name: 'what-to-watch',       topic: 'Ask for recs or share what you\'re watching next.',   slowmode: 5 },
            { name: 'currently-watching',  topic: 'What are you watching right now?',                    slowmode: 0 },
            { name: 'reviews',             topic: 'Spoiler-free opinions on what you just finished.',    slowmode: 10 },
            { name: 'report-broken-source',topic: 'Broken embed? Drop the title and type here.',        slowmode: 10 },
            { name: 'suggestions',         topic: 'Ideas for the site — features, design, anything.',   slowmode: 30 },
        ],
    },
    {
        name: '🛠️ SUPPORT', type: 4, verifiedOnly: true, channels: [
            { name: 'help',  topic: 'Questions about the site.',                     slowmode: 5 },
            { name: 'faq',   topic: 'Common questions answered. Read before asking.', readOnly: true },
        ],
    },
    {
        name: '⭐ VIP LOUNGE', type: 4, vipOnly: true, channels: [
            { name: 'vip-chat',      topic: 'For VIPs. Early access, previews, direct feedback.',   slowmode: 0 },
            { name: 'early-access',  topic: 'Test new features before they go live.',               slowmode: 0 },
        ],
    },
    {
        name: '🤖 BOTS', type: 4, verifiedOnly: true, channels: [
            { name: 'bot-commands', topic: 'Use bot commands here, not in main chat.',  slowmode: 0 },
            { name: 'level-ups',    topic: 'MEE6 level-up notifications.',              slowmode: 0 },
        ],
    },
    {
        name: '🔊 VOICE', type: 4, channels: [
            { name: 'General',          type: 2 },
            { name: 'Watch Together 🎬', type: 2 },
            { name: 'AFK',              type: 2, afk: true },
        ],
    },
    {
        name: '🛡️ MOD ONLY', type: 4, modOnly: true, channels: [
            { name: 'mod-chat',           topic: 'Staff coordination.',               slowmode: 0 },
            { name: 'mod-logs',           topic: 'Carl-bot auto-mod and action logs.', readOnly: true },
            { name: 'admin-notes',        topic: 'Long-term notes and decisions.',     slowmode: 0 },
        ],
    },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    let guildId = GUILD_ID;

    if (!guildId) {
        console.log('Creating new Discord server...');
        const guild = await api('POST', '/guilds', {
            name: 'ELI6 Movies',
            region: 'us-west',
            verification_level: 1,        // low — must have verified email
            default_message_notifications: 1, // only @mentions
            explicit_content_filter: 2,   // scan all messages
        });
        guildId = guild.id;
        console.log(`Server created: ${guildId}`);
    } else {
        console.log(`Using existing server: ${guildId}`);
    }

    // Delete default channels
    console.log('Cleaning default channels...');
    const existingChannels = await api('GET', `/guilds/${guildId}/channels`);
    for (const ch of existingChannels) {
        try { await api('DELETE', `/channels/${ch.id}`); } catch {}
    }

    // Create roles (in reverse order since Discord stacks from bottom)
    console.log('Creating roles...');
    const roleMap = {};
    for (const def of [...ROLES_DEF].reverse()) {
        const role = await api('POST', `/guilds/${guildId}/roles`, {
            name:        def.name,
            color:       def.color,
            hoist:       def.hoist,
            mentionable: def.mentionable,
            permissions: def.permissions,
        });
        roleMap[def.name] = role.id;
        console.log(`  Role: ${def.name} → ${role.id}`);
    }

    // Lock @everyone: remove send_messages + view_channel by default
    const everyoneRole = (await api('GET', `/guilds/${guildId}/roles`)).find(r => r.name === '@everyone');
    const everyoneDeny = perms(P.SEND_MESSAGES, P.ADD_REACTIONS, P.SEND_THREADS);
    await api('PATCH', `/guilds/${guildId}/roles/${everyoneRole.id}`, {
        permissions: perms(P.VIEW_CHANNEL, P.READ_HISTORY, P.CONNECT, P.USE_SLASH),
    });

    const verifiedId = roleMap['✅ Verified'];
    const vipId      = roleMap['⭐ VIP'];
    const modId      = roleMap['🛡️ Mod'];
    const adminId    = roleMap['⚡ Admin'];
    const everyoneId = everyoneRole.id;

    // Build permission overwrites helper
    function makeOverwrites(opts = {}) {
        const overwrites = [];
        if (opts.readOnly) {
            // Everyone can view + read but not send
            overwrites.push({ id: everyoneId, type: 0, allow: perms(P.VIEW_CHANNEL, P.READ_HISTORY), deny: perms(P.SEND_MESSAGES, P.ADD_REACTIONS) });
        } else if (opts.verifiedOnly) {
            // Hide from everyone, allow verified+
            overwrites.push({ id: everyoneId, type: 0, allow: '0', deny: perms(P.VIEW_CHANNEL) });
            overwrites.push({ id: verifiedId, type: 0, allow: perms(P.VIEW_CHANNEL, P.SEND_MESSAGES, P.READ_HISTORY, P.ADD_REACTIONS, P.ATTACH_FILES, P.EMBED_LINKS), deny: '0' });
            overwrites.push({ id: vipId,      type: 0, allow: perms(P.VIEW_CHANNEL, P.SEND_MESSAGES, P.READ_HISTORY, P.ADD_REACTIONS, P.ATTACH_FILES, P.EMBED_LINKS), deny: '0' });
            overwrites.push({ id: modId,      type: 0, allow: perms(P.VIEW_CHANNEL, P.SEND_MESSAGES, P.READ_HISTORY, P.MANAGE_MESSAGES), deny: '0' });
        } else if (opts.vipOnly) {
            overwrites.push({ id: everyoneId, type: 0, allow: '0', deny: perms(P.VIEW_CHANNEL) });
            overwrites.push({ id: vipId,      type: 0, allow: perms(P.VIEW_CHANNEL, P.SEND_MESSAGES, P.READ_HISTORY, P.ADD_REACTIONS), deny: '0' });
            overwrites.push({ id: modId,      type: 0, allow: perms(P.VIEW_CHANNEL, P.SEND_MESSAGES, P.READ_HISTORY), deny: '0' });
        } else if (opts.modOnly) {
            overwrites.push({ id: everyoneId, type: 0, allow: '0', deny: perms(P.VIEW_CHANNEL) });
            overwrites.push({ id: modId,      type: 0, allow: perms(P.VIEW_CHANNEL, P.SEND_MESSAGES, P.READ_HISTORY, P.MANAGE_MESSAGES), deny: '0' });
            overwrites.push({ id: adminId,    type: 0, allow: perms(P.VIEW_CHANNEL, P.SEND_MESSAGES, P.READ_HISTORY, P.MANAGE_MESSAGES), deny: '0' });
        }
        return overwrites;
    }

    // Create categories + channels
    console.log('Creating channels...');
    for (const cat of LAYOUT) {
        const catPerms = makeOverwrites({ verifiedOnly: cat.verifiedOnly, vipOnly: cat.vipOnly, modOnly: cat.modOnly });
        const category = await api('POST', `/guilds/${guildId}/channels`, {
            name: cat.name,
            type: 4,
            permission_overwrites: catPerms,
        });
        console.log(`  Category: ${cat.name}`);

        for (const ch of cat.channels) {
            const chType = ch.type || 0;
            const chPerms = ch.readOnly   ? makeOverwrites({ readOnly: true }) :
                            cat.verifiedOnly ? makeOverwrites({ verifiedOnly: true }) :
                            cat.vipOnly      ? makeOverwrites({ vipOnly: true }) :
                            cat.modOnly      ? makeOverwrites({ modOnly: true }) :
                            [];

            const payload = {
                name:                ch.name,
                type:                chType,
                parent_id:           category.id,
                topic:               ch.topic || undefined,
                rate_limit_per_user: ch.slowmode || 0,
                permission_overwrites: chPerms,
            };
            if (ch.afk) payload.name = 'AFK';

            await api('POST', `/guilds/${guildId}/channels`, payload);
            console.log(`    #${ch.name}`);
        }
    }

    // Set AFK channel (last voice channel created)
    const finalChannels = await api('GET', `/guilds/${guildId}/channels`);
    const afkCh = finalChannels.find(c => c.name === 'AFK');
    if (afkCh) {
        await api('PATCH', `/guilds/${guildId}`, { afk_channel_id: afkCh.id, afk_timeout: 300 });
    }

    console.log('\n✅ Server setup complete!');
    console.log(`\nGuild ID: ${guildId}`);
    console.log('\n--- Next steps ---');
    console.log('1. Invite Carl-bot:  https://carl.gg  → invite to your server');
    console.log('   • Set up reaction role in #verify-here: react ✅ → assign Verified role');
    console.log('   • Set up self-roles in #get-roles: 🎬 Movie Lover | 📺 TV Addict | 🎌 Anime Fan | ⚽ Sports Fan | 🔔 Update Pings');
    console.log('   • Enable automod: block invite links, filter spam, log to #mod-logs');
    console.log('   • Set logging: deleted messages + mod actions → #mod-logs');
    console.log('\n2. Invite MEE6:     https://mee6.xyz → invite to your server');
    console.log('   • Enable leveling, set Level 5 → auto-assign Regular role');
    console.log('   • Set level-up notifications to #level-ups channel');
    console.log('   • Add custom command: !site → https://eli6movies.vercel.app');
    console.log('\n3. Invite Wick:     https://wickbot.com → anti-raid + anti-nuke protection');
    console.log('   • Enable anti-raid mode (auto-lock on mass join)');
    console.log('   • Enable anti-nuke (alert if someone mass-deletes channels/roles)');
    console.log('\n4. Add site link to server description in Server Settings → Overview');
    console.log('5. Upload the ELI6 favicon as server icon (frontend/img/favicon.svg)');
    console.log('6. Add a #rules message and pin it');
    console.log('7. Add server to Discord Discovery once you hit 500 members');
}

main().catch(err => { console.error(err); process.exit(1); });

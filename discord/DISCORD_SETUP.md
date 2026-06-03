# ELI6 Movies — Discord Server Setup

## What the script creates

**9 categories, 26 channels, 7 roles, all permissions wired**

### Roles (top → bottom)
| Role | Color | Purpose |
|------|-------|---------|
| 👑 Owner | Yellow `#E5FF00` | You — full admin |
| ⚡ Admin | Red | Trusted staff |
| 🛡️ Mod | Orange | Moderators |
| 🤖 Bots | Blurple | Bot accounts |
| ⭐ VIP | Gold | Power users, contributors |
| 🔥 Regular | Green | Earned at MEE6 Level 5 |
| ✅ Verified | Blue | Everyone who reacted in #verify-here |

### Channels
```
📢 ANNOUNCEMENTS (read-only for everyone)
  #announcements
  #updates
  #site-status

👋 START HERE (read-only for everyone)
  #rules
  #verify-here  ← Carl-bot reaction gate here
  #get-roles    ← Carl-bot self-roles here

💬 COMMUNITY (Verified+ only)
  #general
  #introductions
  #off-topic

🎬 ELI6 MOVIES (Verified+ only)
  #what-to-watch
  #currently-watching
  #reviews
  #report-broken-source
  #suggestions

🛠️ SUPPORT (Verified+ only)
  #help
  #faq

⭐ VIP LOUNGE (VIP+ only)
  #vip-chat
  #early-access

🤖 BOTS (Verified+ only)
  #bot-commands
  #level-ups

🔊 VOICE
  General
  Watch Together 🎬
  AFK

🛡️ MOD ONLY (Mod+ only)
  #mod-chat
  #mod-logs
  #admin-notes
```

---

## Step 1 — Create a Discord bot (5 min)

1. Go to https://discord.com/developers/applications
2. Click **New Application** → name it `ELI6 Bot`
3. Go to **Bot** tab → click **Reset Token** → copy the token (save it, you only see it once)
4. Scroll down, enable all three **Privileged Gateway Intents**:
   - Presence Intent ✅
   - Server Members Intent ✅
   - Message Content Intent ✅
5. Go to **OAuth2 → URL Generator**:
   - Scopes: `bot` + `applications.commands`
   - Bot permissions: `Administrator`
6. Copy the generated URL and open it in your browser → select your server → Authorize

---

## Step 2 — Create the server (if you don't have one yet)

Either:
- Create it manually in Discord (two clicks) and copy the **Server ID** (right-click server → Copy Server ID, with Developer Mode on)
- Or let the script create it (omit `GUILD_ID`)

---

## Step 3 — Run the setup script

```bash
cd discord
node --version   # needs Node 18+

# If you have an existing server:
DISCORD_TOKEN=your_bot_token GUILD_ID=your_server_id node setup.js

# If you want the bot to create the server:
DISCORD_TOKEN=your_bot_token node setup.js
```

The script takes about 30 seconds (rate-limit safe delays built in).

---

## Step 4 — Invite and configure bots

### Carl-bot (reaction roles + automod + logging)
**Invite:** https://carl.gg → Add to Server

**In the Carl-bot dashboard (carl.gg/manage/YOUR_SERVER_ID):**

**Reaction Roles → #verify-here:**
```
Message: "React with ✅ to verify and unlock the server."
Emoji: ✅ → Role: Verified
```

**Reaction Roles → #get-roles:**
```
🎬 → Movie Lover (notification role)
📺 → TV Addict
🎌 → Anime Fan
⚽ → Sports Fan
🔔 → Site Update Pings
🚨 → Source Down Pings
```

**Automod:**
- Block Discord invite links → delete + warn
- Anti-spam: 5 identical messages in 5s → mute 10 min
- Caps filter: 70%+ caps in 10+ char message → delete
- Mass mention filter: 5+ pings → delete + warn

**Logging → #mod-logs:**
- Deleted messages ✅
- Edited messages ✅
- Kicks/bans ✅
- Role changes ✅

---

### MEE6 (leveling + custom commands)
**Invite:** https://mee6.xyz → Add to Server

**Dashboard settings:**
- Leveling: ON
- Level-up announcement: #level-ups
- Level 5 → auto-assign 🔥 Regular role
- Level 10 → (optional) ping VIP for consideration

**Custom commands:**
| Command | Response |
|---------|----------|
| `!site` | 🎬 Watch free at https://eli6movies.vercel.app |
| `!discord` | https://discord.gg/YOUR_INVITE |
| `!report` | Drop the title + type in #report-broken-source |
| `!trakt` | Connect Trakt: go to Account → Connected Apps on the site |

---

### Wick (anti-raid + anti-nuke)
**Invite:** https://wickbot.com → Add to Server

**Enable:**
- Anti-raid: auto-lockdown if 10+ accounts join in 10s
- Anti-nuke: alert if someone mass-deletes channels/roles/bans
- Verification gate as backup to Carl-bot

---

## Step 5 — Manual finishing touches

1. **Server icon**: upload `frontend/img/trakt-icon.png` or create a proper logo
2. **Server description**: "Free streaming for movies, TV shows, anime, and live sports. eli6movies.vercel.app"
3. **Invite link**: Server Settings → Invites → create a permanent invite, set it as the community link on the site
4. **Rules message** in #rules — copy below:

```
# Rules

1. Be decent. No harassment, hate speech, or personal attacks.
2. No spam, self-promotion, or invite links without permission.
3. Keep things on-topic per channel.
4. Use #bot-commands for bot stuff.
5. Report broken sources in #report-broken-source, not in general.
6. No spoilers without a spoiler tag.

Breaking rules → warning → mute → ban. Mods have final say.
```

5. **Pin the invite** to #announcements once you create it
6. **Add to Discord Discovery** once you hit 500 members (Server Settings → Enable Community → Discovery)

---

## Bot invite links (quick reference)

| Bot | Link | Purpose |
|-----|------|---------|
| Carl-bot | https://carl.gg | Reaction roles, automod, logging |
| MEE6 | https://mee6.xyz | Leveling, custom commands |
| Wick | https://wickbot.com | Anti-raid, anti-nuke |

Optional extras:
| Bot | Link | Purpose |
|-----|------|---------|
| Statbot | https://statbot.net | Server analytics dashboard |
| Hydra | https://hydra.bot | Music in voice channels |

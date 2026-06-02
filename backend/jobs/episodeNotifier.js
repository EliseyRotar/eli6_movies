const axios = require('axios');
const { Resend } = require('resend');
const User = require('../models/User');

const resend = new Resend(process.env.RESEND_API_KEY);
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const FROM_EMAIL   = process.env.MAIL_FROM || 'ELI6 Movies <onboarding@resend.dev>';
const APP_URL      = process.env.APP_URL || 'https://eli6movies.vercel.app';

// Fetch details + latest aired episode for a TV show from TMDB
async function fetchShowInfo(tmdbId) {
    try {
        const { data } = await axios.get(
            `https://api.themoviedb.org/3/tv/${tmdbId}`,
            { params: { api_key: TMDB_API_KEY }, timeout: 8000 }
        );
        return data;
    } catch (_) { return null; }
}

function episodeKey(ep) {
    if (!ep) return null;
    return `S${String(ep.season_number).padStart(2,'0')}E${String(ep.episode_number).padStart(2,'0')}`;
}

function newEpisodeEmail(username, show, ep) {
    const watchUrl = `${APP_URL}/player.html?type=tv&id=${show.id}`;
    const poster   = show.poster_path
        ? `https://image.tmdb.org/t/p/w185${show.poster_path}`
        : '';
    const epTitle  = ep.name ? ` – "${ep.name}"` : '';
    return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#111;font-family:sans-serif;color:#fff">
<div style="max-width:540px;margin:32px auto;background:#1a1a1a;border-radius:12px;overflow:hidden">
  ${poster ? `<img src="${poster}" alt="${show.name}" style="width:100%;max-height:200px;object-fit:cover">` : ''}
  <div style="padding:28px">
    <h1 style="margin:0 0 8px;font-size:20px;color:#e50914">New Episode Available</h1>
    <h2 style="margin:0 0 12px;font-size:16px">${show.name}</h2>
    <p style="margin:0 0 20px;color:#aaa;font-size:14px">
      Hi ${username}, a new episode of <strong>${show.name}</strong> just aired:<br>
      <strong style="color:#fff">${episodeKey(ep)}${epTitle}</strong>
    </p>
    <a href="${watchUrl}" style="display:inline-block;padding:12px 24px;background:#e50914;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Watch Now</a>
  </div>
  <div style="padding:16px 28px;background:#111;font-size:11px;color:#555">
    You received this because you have ${show.name} in your list.
    <a href="${APP_URL}/account.html" style="color:#777">Manage notifications</a>
  </div>
</div></body></html>`;
}

async function run() {
    const results = { checked: 0, emailsSent: 0, errors: [] };

    // Collect all unique TV show IDs across all verified users' myLists
    const users = await User.find({ emailVerified: true, 'myList.0': { $exists: true } })
        .select('username email myList tvNotifications')
        .lean();

    if (!users.length) return results;

    const showUserMap = new Map();
    for (const user of users) {
        for (const item of user.myList) {
            if (item.type !== 'tv') continue;
            if (!showUserMap.has(item.id)) showUserMap.set(item.id, []);
            showUserMap.get(item.id).push({ user, item });
        }
    }

    results.checked = showUserMap.size;
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000); // aired in last 48h

    for (const [showId, entries] of showUserMap) {
        try {
            const show = await fetchShowInfo(showId);
            if (!show) continue;

            const ep = show.last_episode_to_air;
            if (!ep || !ep.air_date) continue;

            const airDate = new Date(ep.air_date);
            if (airDate < cutoff) continue; // episode too old

            const key = episodeKey(ep);

            for (const { user } of entries) {
                const notifs = Array.isArray(user.tvNotifications) ? user.tvNotifications : [];
                const existing = notifs.find(n => n.showId === showId);
                if (existing && existing.lastEpisodeKey === key) continue; // already notified

                try {
                    await resend.emails.send({
                        from:    FROM_EMAIL,
                        to:      user.email,
                        subject: `New episode: ${show.name} ${key}`,
                        html:    newEpisodeEmail(user.username, show, ep),
                    });
                    results.emailsSent++;

                    await User.updateOne(
                        { _id: user._id, 'tvNotifications.showId': showId },
                        { $set: { 'tvNotifications.$.lastEpisodeKey': key } }
                    ).then(r => {
                        if (r.matchedCount === 0) {
                            return User.updateOne(
                                { _id: user._id },
                                { $push: { tvNotifications: { showId, lastEpisodeKey: key } } }
                            );
                        }
                    });
                } catch (emailErr) {
                    results.errors.push(`email to ${user.email}: ${emailErr.message}`);
                }
            }
        } catch (err) {
            results.errors.push(`show ${showId}: ${err.message}`);
        }
    }

    return results;
}

module.exports = { run };

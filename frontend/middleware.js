const BOT_UA = /Googlebot|Twitterbot|Discordbot|TelegramBot|WhatsApp|Slackbot|facebookexternalhit|LinkedInBot|Pinterest|Embedly|redditbot|Applebot|bingbot|DuckDuckBot|YandexBot|Baiduspider|ia_archiver/i;
const WATCH_RE = /^\/watch\/(movie|tv|anime)\/(\d+)/;
const API_BASE = 'https://eli6movies.onrender.com/api';
const SITE = 'https://eli6movies.vercel.app';
const OG_FALLBACK = `${SITE}/img/og-image.png`;

export const config = {
    matcher: ['/watch/movie/:id*', '/watch/tv/:id*', '/watch/anime/:id*'],
};

export default async function middleware(req) {
    const ua = req.headers.get('user-agent') || '';
    if (!BOT_UA.test(ua)) return;

    const m = new URL(req.url).pathname.match(WATCH_RE);
    if (!m) return;

    const [, contentType, id] = m;
    const canonical = `${SITE}/watch/${contentType}/${id}`;

    try {
        let title, description, image, year, ogType;

        if (contentType === 'anime') {
            const res = await fetch(`https://api.jikan.moe/v4/anime/${id}`, {
                signal: AbortSignal.timeout(4000),
            });
            if (!res.ok) return;
            const { data } = await res.json();
            title = data.title_english || data.title || 'Anime';
            description = (data.synopsis || '').replace(/\[.*?\]/g, '').trim().slice(0, 300);
            image = data.images?.jpg?.large_image_url || data.images?.jpg?.image_url || OG_FALLBACK;
            year = String(data.year || '');
            ogType = 'video.tv_show';
        } else {
            const tmdbPath = contentType === 'tv' ? `tv/${id}` : `movie/${id}`;
            const res = await fetch(`${API_BASE}/tmdb/${tmdbPath}`, {
                signal: AbortSignal.timeout(4000),
            });
            if (!res.ok) return;
            const data = await res.json();
            title = data.name || data.title || 'Watch Now';
            description = (data.overview || '').slice(0, 300).trim();
            const imgPath = data.backdrop_path || data.poster_path;
            image = imgPath ? `https://image.tmdb.org/t/p/w1280${imgPath}` : OG_FALLBACK;
            year = contentType === 'tv'
                ? (data.first_air_date || '').slice(0, 4)
                : (data.release_date || '').slice(0, 4);
            ogType = contentType === 'tv' ? 'video.tv_show' : 'video.movie';
        }

        const pageTitle = `${title}${year ? ` (${year})` : ''} — ELI6 Movies`;
        const pageDesc = description || `Watch ${title} free on ELI6 Movies — no sign-up, no ads.`;

        const schemaType = (contentType === 'tv' || contentType === 'anime') ? 'TVSeries' : 'Movie';
        const schema = {
            '@context': 'https://schema.org',
            '@type': schemaType,
            name: title,
            description: pageDesc,
            image,
            url: canonical,
        };

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${h(pageTitle)}</title>
<meta name="description" content="${h(pageDesc)}">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="ELI6 Movies">
<meta property="og:title" content="${h(pageTitle)}">
<meta property="og:description" content="${h(pageDesc)}">
<meta property="og:image" content="${h(image)}">
<meta property="og:url" content="${h(canonical)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${h(pageTitle)}">
<meta name="twitter:description" content="${h(pageDesc)}">
<meta name="twitter:image" content="${h(image)}">
<link rel="canonical" href="${h(canonical)}">
<script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>
<body>
<h1>${h(title)}</h1>
<p>${h(pageDesc)}</p>
<a href="${h(canonical)}">Watch on ELI6 Movies</a>
</body>
</html>`;

        return new Response(html, {
            status: 200,
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'public, max-age=3600, s-maxage=3600',
                'X-Robots-Tag': 'index, follow',
            },
        });
    } catch {
        return;
    }
}

function h(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

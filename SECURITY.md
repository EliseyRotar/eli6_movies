# Security policy

If you think you've found a vulnerability in ELI6 Movies (the website, the API,
or the Android app), please tell us in private first.

## Reporting a vulnerability

Email **1.temp.accoun@gmail.com** with:

- a short description of the issue and the impact you think it has,
- the URL, endpoint, file path, or APK version where you found it,
- the steps to reproduce (a curl command or a screen recording is ideal),
- your handle if you'd like a credit when the fix ships.

Please don't open a public GitHub issue for security problems.

We try to reply within 72 hours. Fixes for high-severity issues usually ship the
same week; lower-severity issues are batched into a regular release.

## Scope

In scope:

- `eli6movies.vercel.app` (frontend)
- `eli6movies.onrender.com` (backend API)
- The official Android APK distributed at
  <https://github.com/EliseyRotar/eli6_movies/releases>

Out of scope:

- Embedded third-party video providers (vidsrc, vixsrc, embed.su, etc.) — those
  are upstream services we proxy, not code we ship.
- Anything that requires you to first compromise a user's device or account.
- Volumetric DoS / brute-force findings that just say "no rate limit" without a
  working bypass.
- Findings that depend on an unpatched browser older than the current stable
  release.

## Safe-harbor

We won't pursue legal action against researchers who:

- act in good faith, avoid privacy violations, and don't degrade the service,
- give us a reasonable window (90 days for most issues, less for actively
  exploited ones) before public disclosure,
- don't access, modify, or exfiltrate data that isn't theirs.

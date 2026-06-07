#!/usr/bin/env node
// Auto-generate `frontend/updates.html` entries from git history.
//
// How it works:
//   1. Read the existing updates.html and find the most recent <span class="release-date">.
//   2. Run `git log` since the day after that date.
//   3. Skip merges, [skip changelog] commits, dependabot, and our own generator commits.
//   4. Classify each commit (feat / fix / perf / sec / i18n / chore / docs).
//   5. Group by date (YYYY-MM-DD, repo-local timezone).
//   6. Build a <div class="release"> block for each new date.
//   7. Prepend the new blocks right after the subtitle. Move the "latest" tag
//      to the newest block.
//   8. Idempotent — running twice produces the same file.
//
// Run with `--dry-run` to print the new HTML instead of writing it.
// Run with `--since YYYY-MM-DD` to override the cutoff.

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const UPDATES_HTML = path.join(ROOT, 'frontend', 'updates.html');

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write([
    'Usage: node scripts/generate-changelog.js [options]',
    '',
    'Walks git history and prepends new entries into frontend/updates.html.',
    '',
    'Options:',
    '  --dry-run            Print the resulting HTML to stdout instead of writing it.',
    '  --since YYYY-MM-DD   Override the cutoff date (default: last date in updates.html).',
    '  --backfill-all       Walk the entire repo history; insert blocks for any date',
    '                       that does not already have one. Hand-written entries are',
    '                       preserved untouched.',
    '  -h, --help           Show this message.',
    '',
    'Commit subjects matching `chore: update changelog` or containing `[skip changelog]`',
    'are ignored so the bot does not surface its own commits.',
    '',
  ].join('\n'));
  process.exit(0);
}

const DRY = args.includes('--dry-run');
const BACKFILL_ALL = args.includes('--backfill-all');
const sinceIdx = args.indexOf('--since');
const SINCE_OVERRIDE = sinceIdx !== -1 ? args[sinceIdx + 1] : null;

// --- helpers ---

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function parseDateText(text) {
  // "June 3, 2026" → "2026-06-03"
  const m = /^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/.exec((text || '').trim());
  if (!m) return null;
  const mi = MONTHS.findIndex(x => x.toLowerCase() === m[1].toLowerCase());
  if (mi === -1) return null;
  const day = parseInt(m[2], 10);
  const yr = parseInt(m[3], 10);
  return `${yr}-${String(mi+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

function formatDateText(iso) {
  // "2026-06-04" → "June 4, 2026"
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m-1]} ${d}, ${y}`;
}

function findAllReleaseDates(html) {
  const re = /<span class="release-date">([^<]+)<\/span>/g;
  const matches = new Set();
  let m;
  while ((m = re.exec(html)) !== null) {
    const iso = parseDateText(m[1]);
    if (iso) matches.add(iso);
  }
  return matches;
}

function findLastReleaseDate(html) {
  const all = [...findAllReleaseDates(html)];
  if (!all.length) return null;
  all.sort();
  return all[all.length - 1];
}

// Read the cursor (last-processed commit SHA) from updates.html if present.
// Marker form: <!-- changelog-cursor: abc1234 -->
const CURSOR_RE = /<!-- changelog-cursor: ([a-f0-9]{7,40}) -->/;
function readCursor(html) {
  const m = CURSOR_RE.exec(html);
  return m ? m[1] : null;
}
function writeCursor(html, sha) {
  if (CURSOR_RE.test(html)) {
    return html.replace(CURSOR_RE, `<!-- changelog-cursor: ${sha} -->`);
  }
  // Place the cursor right after the subtitle so it sits with the changelog body.
  const anchor = '<p class="updates-subtitle">Every update since launch, most recent first.</p>';
  return html.replace(anchor, `${anchor}\n    <!-- changelog-cursor: ${sha} -->`);
}

function gitHeadSha() {
  return execSync(`git -C "${ROOT}" rev-parse HEAD`, { encoding: 'utf8' }).trim();
}

// Returns commits in `range` (e.g. "abc1234..HEAD") or all commits if range is null.
function gitLogRange(range) {
  // Use a unique separator that won't appear in commit messages.
  const SEP = '<<<COMMITSEP>>>';
  const FIELDSEP = '<<<FIELD>>>';
  const rangeArg = range || '';
  const cmd = `git -C "${ROOT}" log ${rangeArg} --no-merges --pretty=format:"%H${FIELDSEP}%ci${FIELDSEP}%s${FIELDSEP}%b${SEP}"`;
  let out;
  try { out = execSync(cmd, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }); }
  catch (e) { console.error('git log failed:', e.message); process.exit(2); }
  return out.split(SEP).map(s => s.trim()).filter(Boolean).map(line => {
    const [hash, ciDate, subject, body] = line.split(FIELDSEP);
    return { hash, ciDate, subject: (subject||'').trim(), body: (body||'').trim() };
  });
}

function gitLogSince(sinceIso) {
  // Use a unique separator that won't appear in commit messages.
  const SEP = '<<<COMMITSEP>>>';
  const FIELDSEP = '<<<FIELD>>>';
  // Special: sinceIso "1970-01-01" means "all history" — git's --since parser
  // doesn't deal well with pre-1980 dates, so omit the flag entirely.
  const sinceArg = (sinceIso === '1970-01-01') ? '' : `--since="${sinceIso} 00:00"`;
  const cmd = `git -C "${ROOT}" log ${sinceArg} --no-merges --pretty=format:"%H${FIELDSEP}%ci${FIELDSEP}%s${FIELDSEP}%b${SEP}"`;
  let out;
  try { out = execSync(cmd, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }); }
  catch (e) { console.error('git log failed:', e.message); process.exit(2); }
  return out.split(SEP).map(s => s.trim()).filter(Boolean).map(line => {
    const [hash, ciDate, subject, body] = line.split(FIELDSEP);
    return { hash, ciDate, subject: (subject||'').trim(), body: (body||'').trim() };
  });
}

function isoDay(ciDate) {
  // "2026-06-04 20:21:42 +0200" → "2026-06-04"
  return (ciDate || '').slice(0, 10);
}

// Filter commits that shouldn't appear on the public changelog.
//
// The `[skip changelog]` marker is matched only against the SUBJECT, not the
// body — otherwise a real commit that just MENTIONS the marker in its body
// (e.g. a feat commit documenting the convention) gets swallowed.
function isSkippable(c) {
  const subj = c.subject;
  if (/\[skip changelog\]/i.test(subj)) return true;
  if (/^(merge|revert|wip|chore: update changelog)\b/i.test(subj)) return true;
  if (/^dependabot\[bot\]/i.test(subj)) return true;
  // Skip non-user-facing meta commits
  if (/^chore\(?:?(deps|deps-dev|ci|release)\b/i.test(subj)) return true;
  return false;
}

// Map conventional-commit type → badge.
function classify(subj) {
  const lower = subj.toLowerCase();
  if (/^feat\b/.test(lower) || /^(add|create|introduce)\b/.test(lower)) return 'new';
  if (/^fix\b/.test(lower)) return 'fix';
  if (/^perf\b/.test(lower)) return 'perf';
  if (/^(sec|security)\b/.test(lower)) return 'sec';
  if (/^i18n\b/.test(lower)) return 'new';
  if (/^(chore|docs|refactor|style|test)\b/.test(lower)) return 'fix'; // surface internal-but-shipped changes as small fixes
  if (/^revert\b/.test(lower)) return 'fix';
  return 'new';
}

// Pretty-print a scope as a display name: "live.js" → "Live page"
const SCOPE_LABELS = {
  'sport.js': 'Sport page',
  'sport.html': 'Sport page',
  'live.js': 'Sport page',
  'live.html': 'Sport page',
  'design.css': 'Design',
  'theme.css': 'Theme',
  'vercel.json': 'Hosting config',
  'sw.js': 'Service worker',
  'en.json': 'Translations',
  'it.json': 'Translations (IT)',
  'ru.json': 'Translations (RU)',
  'player.html': 'Player',
  'player.js': 'Player',
  'account.html': 'Account page',
  'account.js': 'Account page',
  'index.html': 'Home',
  'index.js': 'Home',
  'search.html': 'Search',
  'search.js': 'Search',
  'mylist.html': 'My List',
  'mylist.js': 'My List',
  'analytics.html': 'Analytics',
  'analytics.js': 'Analytics',
  'settings.html': 'Settings',
  'settings.js': 'Settings',
  'updates.html': 'Updates page',
  'i18n.js': 'i18n',
  'components.js': 'Components',
  'auth.js': 'Auth',
  'discord': 'Discord bot',
  'backend': 'Backend',
};

function prettifyScope(scope) {
  if (!scope) return null;
  if (SCOPE_LABELS[scope]) return SCOPE_LABELS[scope];
  // Strip extension and title-case
  return scope.replace(/\.(js|html|css|json|ts)$/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Extract { type, scope, title } from a conventional commit subject.
// Examples:
//   "fix(live.js): drop dark overlay"
//   "feat: add bell reminders"
//   "i18n(it.json): translate reminder strings"
function parseSubject(subj) {
  const m = /^([a-z]+)(?:\(([^)]+)\))?:\s*(.+)$/i.exec(subj);
  if (m) return { type: m[1].toLowerCase(), scope: m[2] || null, title: m[3].trim() };
  return { type: null, scope: null, title: subj };
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]);
}

// Build the HTML for one <li> entry.
function entryHtml(commit) {
  const { type, scope, title } = parseSubject(commit.subject);
  const badge = classify(commit.subject);
  const scopeName = prettifyScope(scope);
  // Capitalize first letter of the title for nicer reading.
  const niceTitle = title.charAt(0).toUpperCase() + title.slice(1);
  const text = scopeName
    ? `<strong>${escapeHtml(scopeName)}</strong> — ${escapeHtml(niceTitle)}`
    : escapeHtml(niceTitle);
  return [
    '        <li class="entry">',
    `          <span class="entry-badge badge-${badge}">${badge}</span>`,
    `          <span class="entry-text">${text}</span>`,
    '        </li>',
  ].join('\n');
}

// Build a full release block for one date.
function releaseBlockHtml(iso, commits, isLatest) {
  const dateText = formatDateText(iso);
  const tag = isLatest ? '\n        <span class="release-tag">latest</span>' : '';
  const entries = commits.map(entryHtml).join('\n');
  return [
    `    <!-- ${dateText} -->`,
    '    <div class="release">',
    '      <div class="release-dot"></div>',
    '      <div class="release-header">',
    `        <span class="release-date">${dateText}</span>${tag}`,
    '      </div>',
    '      <ul class="entry-list">',
    entries,
    '      </ul>',
    '    </div>',
    '',
  ].join('\n');
}

// Strip the "latest" tag from any release block (will be re-added to the new newest).
function stripLatestTag(html) {
  return html.replace(/\s*<span class="release-tag">latest<\/span>/g, '');
}

// --- main ---

if (!fs.existsSync(UPDATES_HTML)) {
  console.error(`Not found: ${UPDATES_HTML}`);
  process.exit(2);
}

const original = fs.readFileSync(UPDATES_HTML, 'utf8');
const existingDates = findAllReleaseDates(original);
const cursor = readCursor(original);

let commits;
if (BACKFILL_ALL) {
  // Walk every commit since the repo started, then filter out any date that
  // already has a release block — preserves hand-written summaries.
  console.error('Backfill mode: walking full git history, skipping dates that already have a release block.');
  console.error(`Already-covered dates (${existingDates.size}): ${[...existingDates].sort().join(', ')}`);
  commits = gitLogSince('1970-01-01').filter(c => !isSkippable(c));
} else if (cursor && !SINCE_OVERRIDE) {
  // Cursor-based: process every commit since the cursor SHA. This is the
  // precise way — works even when multiple commits land on the same day.
  console.error(`Cursor: ${cursor}; collecting commits in ${cursor}..HEAD`);
  commits = gitLogRange(`${cursor}..HEAD`).filter(c => !isSkippable(c));
} else {
  const lastIso = SINCE_OVERRIDE || findLastReleaseDate(original);
  if (!lastIso) {
    console.error('Could not detect a last release date in updates.html. Use --since YYYY-MM-DD or --backfill-all.');
    process.exit(2);
  }
  // Commits AFTER the last release date — same day already covered.
  const sinceDate = new Date(lastIso + 'T00:00:00Z');
  sinceDate.setUTCDate(sinceDate.getUTCDate() + 1);
  const sinceIso = sinceDate.toISOString().slice(0, 10);
  console.error(`Last release date in updates.html: ${lastIso}; no cursor — falling back to --since ${sinceIso}`);
  commits = gitLogSince(sinceIso).filter(c => !isSkippable(c));
}

if (!commits.length) {
  console.error('No new commits to add. Nothing to do.');
  process.exit(0);
}

// Group by ISO date (repo-local TZ from %ci)
const byDay = new Map();
for (const c of commits) {
  const day = isoDay(c.ciDate);
  if (BACKFILL_ALL && existingDates.has(day)) continue; // preserve hand-written
  if (!byDay.has(day)) byDay.set(day, []);
  byDay.get(day).push(c);
}

if (!byDay.size && !BACKFILL_ALL) {
  // In cursor mode we still want to advance the cursor even if no entries were
  // added (e.g. all new commits were skippable). Otherwise we'd reprocess
  // them every run.
  const newCursor = gitHeadSha();
  if (cursor !== newCursor) {
    const updated = writeCursor(original, newCursor);
    if (DRY) { process.stdout.write(updated); process.exit(0); }
    fs.writeFileSync(UPDATES_HTML, updated);
    console.error(`No user-facing commits. Cursor advanced ${cursor || '(none)'} → ${newCursor}.`);
    process.exit(0);
  }
  console.error('Nothing to do.');
  process.exit(0);
}
if (!byDay.size) {
  console.error('All dates with commits are already represented in updates.html. Nothing to do.');
  process.exit(0);
}

// Process newest day first; within day, newest commit first
const orderedDays = [...byDay.keys()].sort().reverse();
for (const d of orderedDays) byDay.get(d).reverse();

let html = BACKFILL_ALL ? original : stripLatestTag(original);
const newCursor = gitHeadSha();

// Build entry HTML for each commit grouped by day.
const newEntriesByDay = new Map();
for (const d of orderedDays) {
  newEntriesByDay.set(d, byDay.get(d).map(entryHtml).join('\n'));
}

// Splits days into: ones whose block already exists (append into it) and
// ones we need to create from scratch.
const daysToAppend = orderedDays.filter(d => existingDates.has(d));
const daysToCreate = orderedDays.filter(d => !existingDates.has(d));

// 1) Append into existing day-blocks (the common case: today's block already
//    exists, just add the new <li>s to its <ul>).
for (const d of daysToAppend) {
  const dateText = formatDateText(d);
  const entries = newEntriesByDay.get(d);
  // Match the block by its date text; capture everything up to the closing
  // </ul> of that block.
  const re = new RegExp(
    `(<span class="release-date">${dateText.replace(/[.*+?^${}()|[\\\]\\\\]/g, '\\\\$&')}</span>[\\s\\S]*?<ul class="entry-list">)([\\s\\S]*?)(\\n\\s*</ul>)`
  );
  if (!re.test(html)) {
    console.error(`Warning: existing block for ${dateText} not found by regex; falling back to new-block insert.`);
    daysToCreate.unshift(d);
    continue;
  }
  html = html.replace(re, (m, head, body, tail) => `${head}${body}\n${entries}${tail}`);
}

// 2) Create new blocks for new days. In normal mode (not backfill), prepend at
//    the top so newest is first; the new top block gets the "latest" tag.
if (daysToCreate.length) {
  const newBlocks = daysToCreate.map((d, i) =>
    releaseBlockHtml(d, byDay.get(d), !BACKFILL_ALL && i === 0)
  );

  let insertAt;
  if (BACKFILL_ALL) {
    // Slot the new (old-dated) blocks right BEFORE the "May 2026" launch sentinel
    // so the existing hand-written newer entries stay at the top and the catch-all
    // launch block stays at the very bottom.
    const launchMarker = '<span class="release-date">May 2026</span>';
    const launchIdx = html.indexOf(launchMarker);
    if (launchIdx !== -1) {
      const blockStart = html.lastIndexOf('<div class="release">', launchIdx);
      const commentStart = html.lastIndexOf('<!--', blockStart);
      insertAt = (commentStart !== -1 && blockStart - commentStart < 200) ? commentStart : blockStart;
    } else {
      insertAt = html.indexOf('</main>');
      if (insertAt === -1) { console.error('Cannot find insertion point. Aborting.'); process.exit(2); }
    }
  } else {
    // Normal mode: insert after subtitle (or after the cursor comment if present)
    const cursorMatch = CURSOR_RE.exec(html);
    if (cursorMatch) {
      insertAt = cursorMatch.index + cursorMatch[0].length;
    } else {
      const anchor = '<p class="updates-subtitle">Every update since launch, most recent first.</p>';
      const idx = html.indexOf(anchor);
      if (idx === -1) {
        console.error('Could not find subtitle anchor. Aborting to avoid corrupting the page.');
        process.exit(2);
      }
      insertAt = idx + anchor.length;
    }
  }

  const prefix = html.slice(0, insertAt);
  const suffix = html.slice(insertAt);
  const joined = newBlocks.join('\n');
  html = BACKFILL_ALL
    ? (prefix + joined + '\n' + suffix.replace(/^\s+/, '    '))
    : (prefix + '\n\n' + joined + suffix.replace(/^\n+/, '\n'));
}

// 3) Advance the cursor to HEAD so we won't reprocess these commits next run.
if (!BACKFILL_ALL) html = writeCursor(html, newCursor);

if (DRY) {
  process.stdout.write(html);
  console.error(`\n[dry-run] Would add ${commits.length} commits across ${orderedDays.length} days (${daysToAppend.length} appended, ${daysToCreate.length} new).`);
  process.exit(0);
}

fs.writeFileSync(UPDATES_HTML, html);
console.error(`Updated ${UPDATES_HTML} — added ${commits.length} commits across ${orderedDays.length} days (${daysToAppend.length} appended, ${daysToCreate.length} new). Cursor → ${newCursor}.`);

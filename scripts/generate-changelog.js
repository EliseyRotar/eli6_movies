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
function isSkippable(c) {
  const subj = c.subject;
  const body = c.body;
  if (/\[skip changelog\]/i.test(subj) || /\[skip changelog\]/i.test(body)) return true;
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
  'live.js': 'Live page',
  'live.html': 'Live page',
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

let sinceIso, commits;
if (BACKFILL_ALL) {
  // Walk every commit since the repo started, then filter out any date that
  // already has a release block — preserves hand-written summaries.
  sinceIso = '1970-01-01';
  console.error('Backfill mode: walking full git history, skipping dates that already have a release block.');
  console.error(`Already-covered dates (${existingDates.size}): ${[...existingDates].sort().join(', ')}`);
} else {
  const lastIso = SINCE_OVERRIDE || findLastReleaseDate(original);
  if (!lastIso) {
    console.error('Could not detect a last release date in updates.html. Use --since YYYY-MM-DD or --backfill-all.');
    process.exit(2);
  }
  // Commits AFTER the last release date — same day already covered.
  const sinceDate = new Date(lastIso + 'T00:00:00Z');
  sinceDate.setUTCDate(sinceDate.getUTCDate() + 1);
  sinceIso = sinceDate.toISOString().slice(0, 10);
  console.error(`Last release date in updates.html: ${lastIso}`);
  console.error(`Collecting commits since: ${sinceIso}`);
}

commits = gitLogSince(sinceIso).filter(c => !isSkippable(c));

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

if (!byDay.size) {
  console.error('All dates with commits are already represented in updates.html. Nothing to do.');
  process.exit(0);
}

// Process newest day first; within day, keep the chronological commit order.
const orderedDays = [...byDay.keys()].sort().reverse();
for (const d of orderedDays) byDay.get(d).reverse();   // newest-commit first within the day

// In backfill mode we never override the "latest" tag — the newest existing
// block keeps it. In normal mode the new top block becomes "latest".
const newBlocks = orderedDays.map((d, i) =>
  releaseBlockHtml(d, byDay.get(d), !BACKFILL_ALL && i === 0)
);

let html = BACKFILL_ALL ? original : stripLatestTag(original);
let insertAt;

if (BACKFILL_ALL) {
  // Slot the new (old-dated) blocks right BEFORE the "May 2026" launch sentinel
  // so the existing hand-written newer entries stay at the top and the catch-all
  // launch block stays at the very bottom.
  const launchMarker = '<span class="release-date">May 2026</span>';
  const launchIdx = html.indexOf(launchMarker);
  if (launchIdx !== -1) {
    // Walk back to the start of the <!-- ... --> comment that precedes the launch block.
    const blockStart = html.lastIndexOf('<div class="release">', launchIdx);
    const commentStart = html.lastIndexOf('<!--', blockStart);
    insertAt = (commentStart !== -1 && blockStart - commentStart < 200) ? commentStart : blockStart;
  } else {
    // No sentinel — insert right before </main>
    insertAt = html.indexOf('</main>');
    if (insertAt === -1) {
      console.error('Cannot find insertion point. Aborting.');
      process.exit(2);
    }
  }
} else {
  const anchor = '<p class="updates-subtitle">Every update since launch, most recent first.</p>';
  const idx = html.indexOf(anchor);
  if (idx === -1) {
    console.error('Could not find subtitle anchor. Aborting to avoid corrupting the page.');
    process.exit(2);
  }
  insertAt = idx + anchor.length;
}

const prefix = html.slice(0, insertAt);
const suffix = html.slice(insertAt);
const joined = newBlocks.join('\n');
const merged = BACKFILL_ALL
  ? (prefix + joined + '\n' + suffix.replace(/^\s+/, '    '))
  : (prefix + '\n\n' + joined + suffix.replace(/^\n+/, '\n'));

if (DRY) {
  process.stdout.write(merged);
  console.error(`\n[dry-run] Would add ${commits.length} commits across ${orderedDays.length} days.`);
  process.exit(0);
}

fs.writeFileSync(UPDATES_HTML, merged);
console.error(`Updated ${UPDATES_HTML} — added ${commits.length} commits across ${orderedDays.length} days.`);

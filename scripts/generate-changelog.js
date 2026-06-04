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
const DRY = args.includes('--dry-run');
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

function findLastReleaseDate(html) {
  const re = /<span class="release-date">([^<]+)<\/span>/g;
  const matches = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    const iso = parseDateText(m[1]);
    if (iso) matches.push(iso);
  }
  if (!matches.length) return null;
  // Return the latest (largest) — the file is supposed to be newest-first
  // but don't assume.
  matches.sort();
  return matches[matches.length - 1];
}

function gitLogSince(sinceIso) {
  // Use a unique separator that won't appear in commit messages.
  const SEP = '<<<COMMITSEP>>>';
  const FIELDSEP = '<<<FIELD>>>';
  const cmd = `git -C "${ROOT}" log --since="${sinceIso} 00:00" --no-merges --pretty=format:"%H${FIELDSEP}%ci${FIELDSEP}%s${FIELDSEP}%b${SEP}"`;
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
const lastIso = SINCE_OVERRIDE || findLastReleaseDate(original);
if (!lastIso) {
  console.error('Could not detect a last release date in updates.html. Use --since YYYY-MM-DD.');
  process.exit(2);
}

// We want commits AFTER the last release date — same day already covered.
const sinceDate = new Date(lastIso + 'T00:00:00Z');
sinceDate.setUTCDate(sinceDate.getUTCDate() + 1);
const sinceIso = sinceDate.toISOString().slice(0, 10);

console.error(`Last release date in updates.html: ${lastIso}`);
console.error(`Collecting commits since: ${sinceIso}`);

const commits = gitLogSince(sinceIso).filter(c => !isSkippable(c));

if (!commits.length) {
  console.error('No new commits to add. Nothing to do.');
  process.exit(0);
}

// Group by ISO date (repo-local TZ from %ci)
const byDay = new Map();
for (const c of commits) {
  const day = isoDay(c.ciDate);
  if (!byDay.has(day)) byDay.set(day, []);
  byDay.get(day).push(c);
}

// Process newest day first; within day, keep the chronological commit order.
const orderedDays = [...byDay.keys()].sort().reverse();
for (const d of orderedDays) byDay.get(d).reverse();   // newest-commit first within the day

const newBlocks = orderedDays.map((d, i) => releaseBlockHtml(d, byDay.get(d), i === 0));

// Insert immediately after the subtitle <p>, replacing the existing "latest" tag elsewhere.
let html = stripLatestTag(original);
const anchor = '<p class="updates-subtitle">Every update since launch, most recent first.</p>';
const idx = html.indexOf(anchor);
if (idx === -1) {
  console.error('Could not find subtitle anchor. Aborting to avoid corrupting the page.');
  process.exit(2);
}
const insertAt = idx + anchor.length;
const prefix = html.slice(0, insertAt);
const suffix = html.slice(insertAt);
const merged = prefix + '\n\n' + newBlocks.join('\n') + suffix.replace(/^\n+/, '\n');

if (DRY) {
  process.stdout.write(merged);
  console.error(`\n[dry-run] Would add ${commits.length} commits across ${orderedDays.length} days.`);
  process.exit(0);
}

fs.writeFileSync(UPDATES_HTML, merged);
console.error(`Updated ${UPDATES_HTML} — added ${commits.length} commits across ${orderedDays.length} days.`);

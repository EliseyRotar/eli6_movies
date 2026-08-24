export const API_BASE_URL = 'https://eli6movies.onrender.com/api';
export const SITE_BASE_URL = 'https://eli6movies.vercel.app';
export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// Debug error reporter endpoint. Set DEBUG_ERRORS_ENDPOINT in your shell (or
// edit this file) to point to a REST endpoint that accepts POST {logs: [...]}.
// Defaults to a local mock so the reporter is always wired up during dev.
export const DEBUG_ERRORS_ENDPOINT: string =
  'http://10.0.2.2:8787/ingest';

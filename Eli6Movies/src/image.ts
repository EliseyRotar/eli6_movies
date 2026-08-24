import { TMDB_IMAGE_BASE } from './config';

export function posterUrl(path?: string, size = 'w500'): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function backdropUrl(path?: string, size = 'w1280'): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

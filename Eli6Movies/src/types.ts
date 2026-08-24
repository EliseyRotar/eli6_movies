export interface CatalogItem {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
  media_type?: string;
  type?: string;
  progress?: number;
}

export interface CatalogResponse {
  results: CatalogItem[];
  page?: number;
  total_pages?: number;
}

export interface Genre {
  id: number;
  name: string;
}

export interface Season {
  season_number: number;
  name?: string;
  episode_count?: number;
  poster_path?: string;
  overview?: string;
}

export interface Episode {
  episode_number: number;
  name?: string;
  overview?: string;
  still_path?: string;
  air_date?: string;
  runtime?: number;
  vote_average?: number;
}

export interface SeasonDetail {
  season_number: number;
  episodes: Episode[];
}

export interface MediaDetails {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average?: number;
  vote_count?: number;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
  tagline?: string;
  runtime?: number;
  episode_run_time?: number[];
  genres?: Genre[];
  status?: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  seasons?: Season[];
  adult?: boolean;
}

export interface UserProfile {
  username?: string;
  email?: string;
  role?: string;
  emailVerified?: boolean;
  myList?: MyListItem[];
}

export interface AuthRequest {
  email: string;
  password: string;
  username?: string;
}

export interface AuthResponse {
  success?: boolean;
  message?: string;
  token?: string;
  user?: UserProfile;
}

export interface MyListItem {
  id: number;
  title: string;
  type: string;
  poster_path?: string;
  overview?: string;
}

export function displayTitle(item: CatalogItem | MediaDetails): string {
  return item.title || item.name || '';
}

export function kind(item: CatalogItem): string {
  return item.type || item.media_type || 'movie';
}

export function year(item: CatalogItem | MediaDetails): string | undefined {
  const d = (item as any).release_date || (item as any).first_air_date;
  return d ? String(d).slice(0, 4) : undefined;
}

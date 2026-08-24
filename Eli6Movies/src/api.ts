import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './config';
import { report } from './logging';
import {
  AuthRequest,
  AuthResponse,
  CatalogItem,
  CatalogResponse,
  MediaDetails,
  MyListItem,
  SeasonDetail,
  UserProfile,
} from './types';

const TOKEN_KEY = 'eli6_jwt';

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string | null): Promise<void> {
  if (token) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } else {
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
}

export async function isLoggedIn(): Promise<boolean> {
  return (await getToken()) != null;
}

async function request<T>(
  path: string,
  options: { method?: string; body?: any; auth?: boolean } = {},
): Promise<T> {
  const { method = 'GET', body, auth = true } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (auth) {
    const token = await getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }
  const url = `${API_BASE_URL}${path}`;
  const started = Date.now();
  console.log(`[api] -> ${method} ${url}`);
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    console.error(`[api] ✗ network error ${method} ${url}`, e);
    report('error', 'api', `network ${method} ${path}`, {
      extra: { method, path, error: e instanceof Error ? e.message : String(e) },
    });
    throw e;
  }
  const ms = Date.now() - started;
  if (!res.ok) {
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      /* ignore */
    }
    console.error(`[api] ✗ ${res.status} ${method} ${url} (${ms}ms)`, data);
    report('error', 'api', `${res.status} ${method} ${path} (${ms}ms)`, {
      extra: { method, path, status: res.status, ms, data },
    });
    const err: any = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  const json = (await res.json()) as T;
  console.log(`[api] ✓ ${res.status} ${method} ${url} (${ms}ms)`);
  return json;
}

// ── Catalog ────────────────────────────────────────────────────────────────
export const catalog = {
  trending: () => request<CatalogResponse>('/tmdb/trending/all/week', { auth: false }),
  popularMovies: (page = 1) =>
    request<CatalogResponse>(`/tmdb/movie/popular?page=${page}`, { auth: false }),
  popularTv: (page = 1) =>
    request<CatalogResponse>(`/tmdb/tv/popular?page=${page}`, { auth: false }),
  topRatedMovies: (page = 1) =>
    request<CatalogResponse>(`/tmdb/movie/top_rated?page=${page}`, { auth: false }),
  topRatedTv: (page = 1) =>
    request<CatalogResponse>(`/tmdb/tv/top_rated?page=${page}`, { auth: false }),
  topAnime: () => request<CatalogItem[]>('/anime/trending', { auth: false }),
  search: (query: string) =>
    request<CatalogResponse>(
      `/tmdb/search/multi?query=${encodeURIComponent(query)}&include_adult=false`,
      { auth: false },
    ),
  movieDetails: (id: number) => request<MediaDetails>(`/tmdb/movie/${id}`, { auth: false }),
  tvDetails: (id: number) => request<MediaDetails>(`/tmdb/tv/${id}`, { auth: false }),
  season: (id: number, season: number) =>
    request<SeasonDetail>(`/tmdb/tv/${id}/season/${season}`, { auth: false }),
};

// ── Auth ────────────────────────────────────────────────────────────────────
export const auth = {
  login: async (email: string, password: string): Promise<UserProfile> => {
    const res = await request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: { email, password } as AuthRequest,
      auth: false,
    });
    if (res.token) {
      await setToken(res.token);
    }
    return res.user || (await user.profile());
  },
  register: async (username: string, email: string, password: string): Promise<UserProfile> => {
    const res = await request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: { username, email, password } as AuthRequest,
      auth: false,
    });
    if (res.token) {
      await setToken(res.token);
    }
    return res.user || (await user.profile());
  },
  logout: async (): Promise<void> => {
    try {
      await request('/auth/logout', { method: 'POST' });
    } catch {
      /* ignore */
    }
    await setToken(null);
  },
};

// ── User ───────────────────────────────────────────────────────────────────
export const user = {
  profile: () => request<UserProfile>('/user/profile'),
  myList: () => request<MyListItem[]>('/user/mylist'),
  addToMyList: (item: MyListItem) =>
    request<MyListItem[]>('/user/mylist', { method: 'POST', body: item }),
  removeFromMyList: (id: number, type: string) =>
    request<MyListItem[]>(`/user/mylist/${id}/${type}`, { method: 'DELETE' }),
  keepWatching: () => request<CatalogItem[]>('/user/keep-watching'),
};

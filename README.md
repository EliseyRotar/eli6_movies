# ELI6 Movies

## Setup (backend)

1. Copia `backend/env.example` in `.env` e compila i valori richiesti (`JWT_SECRET`, `TMDB_API_KEY`, `LIBRETRANSLATE_URL`, ecc.).
2. Installa le dipendenze: `cd backend && npm install`.
3. Avvia in sviluppo: `npm run dev` (porta predefinita `3000`).
4. In produzione, esegui `npm start` dietro un reverse proxy HTTPS (es. nginx) e abilita l’opzione `secure` dei cookie impostando `NODE_ENV=production`.

## API

- Prefissi supportati: `/api` e `/api/v1`.
- Router principali:
    - Auth: `/api/register`, `/api/login`.
    - User: `/api/user/profile`, `/api/user/mylist`, `/api/user/watch-history`, `/api/user/keep-watching`, `/api/user/update`, `/api/user/password`, `/api/user/delete`.
    - Admin: `/api/admin/users`, `/api/admin/users/:id`, `/api/admin/users/:id/reset-password`, `/api/admin/users/:id/role`, `/api/admin/fix-mylist`.
    - Catalogo TMDB: `/api/catalog/movies/:category`, `/api/catalog/tv/:category`, `/api/catalog/trending/:mediaType/:timeWindow`, `/api/catalog/movies/details/:id`, `/api/catalog/movies/:id/credits`, `/api/catalog/anime/*`, `/api/catalog/vidsrc/:type`.
    - Traduzioni: `/api/translation/translate`, `/api/translation/translate-batch`, `/api/translation/languages`.

## Note

- Il frontend va servito staticamente (es. nginx). Il backend Express non espone file statici.
- Rate limit, CORS, cache e timeouts sono configurabili via variabili d’ambiente.

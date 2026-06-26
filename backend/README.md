# Backend Superset (TypeScript)

Backend Express in TypeScript che fa da ponte tra il frontend e le API di Apache Superset. Custodisce le
credenziali admin e non le espone mai al browser: rilascia solo *guest token* a vita breve.

## Struttura

```
src/
├── config/env.ts            # carica e valida le variabili d'ambiente (unico punto che legge process.env)
├── superset/
│   ├── auth.ts              # getSupersetTokens(): login admin → access_token + CSRF + cookie
│   └── client.ts            # SUPERSET_URL + helper readHeaders()/writeHeaders()
├── services/
│   ├── dashboard.service.ts # tutte le chiamate Superset lato dashboard (list, build, filtri, permalink…)
│   ├── chart.service.ts     # list chart (owner) + esecuzione query (chart/data)
│   └── filterState.store.ts # persistenza su file dell'ultimo stato filtri per dashboard+utente
├── controllers/             # adattano req/res → service (sottili)
├── routes/                  # mapping URL → controller (+ /health)
├── middleware/errorHandler.ts # asyncHandler + error handler centralizzato
├── errors.ts                # HttpError (status + payload)
├── types.ts                 # DTO condivisi
├── app.ts                   # factory Express (cors, json, routes sotto /api, errorHandler)
└── server.ts                # avvio
data/filterStates.json       # store filtri (chiave: "<dashboardId>:<userId>")
```

## Configurazione (`.env`)

Copia `.env.example` in `.env`:

| Variabile                 | Default                  | Descrizione |
|---------------------------|--------------------------|-------------|
| `PORT`                    | `5000`                   | Porta del backend |
| `SUPERSET_URL`            | `http://localhost:8088`  | Istanza Superset |
| `SUPERSET_ADMIN_USER`     | `admin`                  | Utente admin Superset |
| `SUPERSET_ADMIN_PASSWORD` | `admin`                  | Password admin |
| `EMBED_TRINO_SERVER`      | `server_x`               | Default Trino server per il guest user |
| `EMBED_USER_DB`           | `4cosite_000415_it`      | Default DB tenant per il guest user |

## Comandi

```bash
npm install
npm run dev        # tsx watch (hot reload)
npm run build      # compila in dist/ (tsc)
npm start          # esegue dist/server.js
npm run typecheck  # solo type-check
```

## API

Base path: `/api`. In caso di errore la risposta è `{ "error": <messaggio | body Superset> }`.

### Health
- `GET /api/health` → `{ status: "ok" }`

### Dashboards (`/api/dashboards`)

| Metodo · Path | Descrizione | API Superset usate |
|---|---|---|
| `GET /` | Dashboard non pubblicate | `GET /dashboard/?q={published=false}` |
| `POST /guest-token` | Guest token per l'embedding. Body: `{ dashboardId, trinoServer?, userDb? }` | `GET /dashboard/:id/embedded`, `PUT …/embedded` (reset allowed_domains), `POST /security/guest_token/` |
| `POST /build` | Aggiunge/rimuove chart e ricostruisce il layout. Body: `{ dashboardId, chartIds[], removeIds[] }` → `{ id, token }` | `GET·PUT /chart/:id`, `GET /dashboard/:id/charts`, `PUT /dashboard/:id` (position_json), guest token |
| `GET /:id/charts` | Chart presenti nella dashboard | `GET /dashboard/:id/charts` |
| `GET /:id/native-filters` | Filtri nativi configurati | `GET /dashboard/:id` (`json_metadata.native_filter_configuration`) |
| `POST /:id/set-filter-default` | Default di un filtro. Body: `{ filterName, timeRange }` | `GET` + `PUT /dashboard/:id` (json_metadata) |
| `POST /:id/permalink` | Crea/riusa un permalink per uno stato filtri. Body: `{ dataMask }` o `{ filterId, timeRange }` → `{ key }` | `POST /dashboard/:id/permalink` |
| `GET /:id/filter-state?userId=` | Ultimo stato filtri salvato | (file store) |
| `POST /:id/filter-state` | Salva lo stato filtri. Body: `{ dataMask, userId }` | (file store) — invalida la cache permalink |
| `GET /:id/filter-options/:filterId` | Valori distinti di un filtro nativo | `GET /dashboard/:id` + `POST /chart/data` (groupby) |
| `POST /:id/screenshot` | **Export PDF — step 1**: genera lo screenshot, ritorna `{ digest, imageUrl, taskStatus }`. Body opzionale `{ dataMask }` per riflettere i filtri | `POST /dashboard/:id/cache_dashboard_screenshot/` |
| `GET /:id/screenshot/:digest/pdf` | **Export PDF — step 2**: fa polling finché lo screenshot è pronto e restituisce il PDF (`application/pdf`, attachment) | `GET /dashboard/:id/screenshot/:digest/?download_format=pdf` |

### Charts (`/api/charts`)

| Metodo · Path | Descrizione | API Superset usate |
|---|---|---|
| `GET /` | Chart di cui l'admin è owner | `GET /me/`, `GET /chart/?q={owners=userId}` |
| `GET /:id/data?trinoServer=&userDb=` | Esegue la query del chart | `GET /chart/:id` (query_context) + `POST /chart/data?trino_server=…&user_db=…` |

## Note di pulizia rispetto alla POC originale

- La logica di tutti gli handler è stata portata dai vecchi `controllers/*.js` + `services/superset.service.js`,
  riorganizzata a strati (config → superset → services → controllers → routes) con tipi, JSDoc ed error handler
  centralizzato.
- Il vecchio `proxy.routes.js` (intercettava le chiamate `filter_state` iniettando uno script nell'iframe) **è
  stato rimosso**: era codice morto, mai montato in `server.js`. Il salvataggio dei filtri avviene ora in modo
  esplicito via `getDashboardPermalink` lato SDK + `POST /:id/filter-state`.
- Nel flusso `build`, il guest token usa lo stesso utente multi-tenant del flusso `guest-token` (la POC usava un
  generico `guest_user`), così l'embedding dopo un build mostra i dati del tenant corretto.
```

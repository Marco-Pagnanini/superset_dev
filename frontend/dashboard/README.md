# Dashboard (Next.js)

Frontend in **Next.js (App Router, TypeScript)** con **Tailwind v4 + shadcn/ui**. Incorpora i chart di Apache
Superset tramite l'**embedded SDK** e ne pilota le funzionalità tramite il backend TypeScript.

## Struttura

```
app/
├── layout.tsx              # layout root (Server Component) → <AppShell>
├── globals.css             # token shadcn + Tailwind v4
├── page.tsx                # Home: panoramica + flusso embedding + mappa funzionalità
├── embed/page.tsx          # embedding dashboard (carica SupersetDashboard senza SSR)
├── charts/page.tsx         # esplora chart: lista + esecuzione query
├── filters/page.tsx        # filtri nativi: valori + set default
└── settings/page.tsx       # configurazione (env NEXT_PUBLIC_*)
components/
├── app-shell.tsx           # guscio client: SidebarProvider + header + contenuto
├── app-sidebar.tsx         # navigazione (next/link + usePathname)
├── superset/
│   ├── SupersetDashboard.tsx # embed + guest token + salva/ripristina filtri
│   ├── ChartDrawer.tsx       # pannello laterale (shadcn Sheet) aggiungi/rimuovi chart
│   └── chart-previews.tsx    # anteprime SVG per viz_type
└── ui/                     # componenti shadcn (riusati dalla versione Vite)
lib/
├── api.ts                  # client fetch tipizzato verso il backend (+ URL da env)
├── superset-config.ts      # SUPERSET_UI_CONFIG (opzioni SDK + CSS iniettato nell'iframe)
└── types.ts                # tipi condivisi
```

## Configurazione (`.env.local`)

Copia `.env.example` in `.env.local`. Le variabili sono `NEXT_PUBLIC_*` perché lette nel browser:

| Variabile                  | Default                     | Descrizione |
|----------------------------|-----------------------------|-------------|
| `NEXT_PUBLIC_API_URL`      | `http://localhost:5000/api` | Base URL del backend |
| `NEXT_PUBLIC_SUPERSET_URL` | `http://localhost:8088`     | Dominio Superset (per l'iframe dell'SDK) |
| `NEXT_PUBLIC_USER_ID`      | `4cosite_000415_it`         | Utente per salvataggio/ripristino filtri (TODO: auth reale) |

## Comandi

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # build di produzione
npm start       # serve la build
```

## Come funziona l'embedding (lato client)

- L'embedded SDK (`@superset-ui/embedded-sdk`) gira **solo nel browser**: `app/embed/page.tsx` carica
  `SupersetDashboard` con `next/dynamic` e `ssr: false`.
- `embedDashboard({ id, supersetDomain, mountPoint, fetchGuestToken, dashboardUiConfig })` monta l'iframe.
  `fetchGuestToken` riusa il primo token già ottenuto e ne richiede di nuovi al backend per i refresh.
- `dashboardUiConfig` (`lib/superset-config.ts`) nasconde titolo/tab, mostra i filtri ed **inietta CSS dentro
  l'iframe** per uniformare i chart al tema della dashboard.
- **Salvataggio filtri**: catena di fallback → `getDashboardPermalink()` (SDK) → `getDataMask()` (SDK) →
  ultimo `dataMask` osservato via `observeDataMask`. Il risultato viene salvato sul backend e ripristinato al
  ricaricamento come `urlParams.permalink_key`.

## Note rispetto alla POC `frontend/test`

- Stesse funzionalità, reimplementate con **shadcn/ui** al posto di Chakra UI e con **App Router** al posto di
  react-router.
- Gli URL hardcoded (`localhost:8088`, `localhost:5000`, `USER_ID`) sono ora variabili d'ambiente.
- **Fix**: nel `build`, l'embedding usa sempre `NEXT_PUBLIC_SUPERSET_URL`; la POC puntava erroneamente al
  backend (`localhost:5000`).

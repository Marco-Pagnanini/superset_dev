'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { embedDashboard } from '@superset-ui/embedded-sdk';
import { Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SUPERSET_UI_CONFIG } from '@/lib/superset-config';
import {
  listDashboards,
  fetchGuestToken,
  buildDashboard,
  getSavedFilterState,
  saveFilterState,
  getPermalinkKey,
  requestDashboardScreenshot,
  downloadDashboardPdf,
  SUPERSET_DOMAIN,
} from '@/lib/api';
import type { Dashboard, DataMask } from '@/lib/types';
import ChartDrawer from './ChartDrawer';

/** Metodi dell'istanza EmbeddedDashboard che usiamo (alcuni opzionali per versione). */
interface EmbeddedDashboard {
  getDashboardPermalink?: (anchor: string) => Promise<string>;
  getDataMask?: () => Promise<DataMask>;
  observeDataMask?: (cb: (dm: DataMask) => void) => void;
}

export default function SupersetDashboard() {
  const dashboardRef = useRef<HTMLDivElement>(null);
  const dashboardInstRef = useRef<EmbeddedDashboard | null>(null);
  const latestDataMaskRef = useRef<DataMask | null>(null);

  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [selectedDashboardId, setSelectedDashboardId] = useState<number | null>(null);
  const [building, setBuilding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfMsg, setPdfMsg] = useState<string | null>(null);

  useEffect(() => {
    listDashboards()
      .then(setDashboards)
      .catch(() => setError('Errore nel caricamento delle dashboard'));
  }, []);

  /** Monta l'iframe della dashboard con una data uiConfig, gestendo il refresh del token. */
  const embedWithConfig = useCallback(async (dashboardId: number, uiConfig: typeof SUPERSET_UI_CONFIG) => {
    const first = await fetchGuestToken(dashboardId);
    if (first.error) throw new Error(typeof first.error === 'string' ? first.error : JSON.stringify(first.error));

    let cachedToken: string | null = first.token;
    dashboardInstRef.current = null;
    latestDataMaskRef.current = null;

    const dashboardPromise = embedDashboard({
      id: first.id,
      supersetDomain: SUPERSET_DOMAIN,
      mountPoint: dashboardRef.current as HTMLElement,
      fetchGuestToken: async () => {
        // Il primo token l'abbiamo già; per i refresh successivi lo richiediamo.
        if (cachedToken) {
          const t = cachedToken;
          cachedToken = null;
          return t;
        }
        const d = await fetchGuestToken(dashboardId);
        return d.token;
      },
      dashboardUiConfig: uiConfig,
      debug: true,
    });

    dashboardPromise.then((dashboardElement) => {
      dashboardInstRef.current = dashboardElement as EmbeddedDashboard;
      // observeDataMask tiene aggiornato un ref con l'ultimo stato filtri: lo usiamo come
      // fallback a getDataMask(), non sempre esposto lato iframe a seconda della versione.
      (dashboardElement as EmbeddedDashboard).observeDataMask?.((dataMaskConfig: DataMask) => {
        if (!dataMaskConfig || Object.keys(dataMaskConfig).length === 0) return;
        latestDataMaskRef.current = dataMaskConfig;
      });
    });

    return dashboardPromise;
  }, []);

  /** Carica una dashboard, ripristinando l'eventuale stato filtri salvato. */
  const loadDashboard = async (id: number) => {
    if (!id) return;
    setError(null);
    setSelectedDashboardId(id);
    if (dashboardRef.current) dashboardRef.current.innerHTML = '';
    setLoading(true);

    try {
      const saved = await getSavedFilterState(id);

      let uiConfig = SUPERSET_UI_CONFIG;
      if (saved && Object.keys(saved).length > 0) {
        if ((saved as any).permalink_key) {
          // Formato nuovo: abbiamo già la key dal SDK getDashboardPermalink.
          uiConfig = { ...SUPERSET_UI_CONFIG, urlParams: { permalink_key: (saved as any).permalink_key } } as typeof SUPERSET_UI_CONFIG;
        } else {
          // Legacy: dataMask grezzo → convertilo in permalink key via API.
          const key = await getPermalinkKey(id, saved);
          if (key) uiConfig = { ...SUPERSET_UI_CONFIG, urlParams: { permalink_key: key } } as typeof SUPERSET_UI_CONFIG;
        }
      }

      await embedWithConfig(id, uiConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  /** Aggiunge/rimuove chart, ricostruisce il layout e ri-embedda. */
  const handleBuild = async (chartIds: number[], removeIds: number[] = []) => {
    if (!selectedDashboardId) {
      setError('Seleziona prima una dashboard');
      return;
    }
    try {
      setError(null);
      setBuilding(true);
      if (dashboardRef.current) dashboardRef.current.innerHTML = '';

      const data = await buildDashboard(selectedDashboardId, chartIds, removeIds);

      let cachedToken: string | null = data.token;
      await embedDashboard({
        id: data.id,
        // FIX: il vecchio frontend/test puntava qui al backend (5000); usiamo sempre il dominio Superset.
        supersetDomain: SUPERSET_DOMAIN,
        mountPoint: dashboardRef.current as HTMLElement,
        fetchGuestToken: async () => {
          if (cachedToken) {
            const t = cachedToken;
            cachedToken = null;
            return t;
          }
          const d = await fetchGuestToken(selectedDashboardId);
          return d.token;
        },
        dashboardUiConfig: SUPERSET_UI_CONFIG,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBuilding(false);
    }
  };

  /** Cattura lo stato filtri corrente e lo salva (permalink → getDataMask → cache observeDataMask). */
  const handleSaveFilters = async () => {
    setSaveMsg(null);
    try {
      const dashboard = dashboardInstRef.current;
      if (!dashboard) {
        setSaveMsg('Dashboard non pronta');
        return;
      }

      let payload: DataMask | null = null;

      // 1) Preferito: il SDK genera un permalink dello stato corrente.
      try {
        const permalinkUrl = await dashboard.getDashboardPermalink?.('');
        const m = permalinkUrl && permalinkUrl.match(/\/p\/([^/?#]+)/);
        if (m) payload = { permalink_key: m[1] };
      } catch {
        /* non supportato in questa versione */
      }

      // 2) Fallback: getDataMask del SDK.
      if (!payload) {
        try {
          const dm = await dashboard.getDataMask?.();
          if (dm && Object.keys(dm).length > 0) payload = dm;
        } catch {
          /* non supportato */
        }
      }

      // 3) Fallback: ultimo stato osservato via observeDataMask.
      if (!payload && latestDataMaskRef.current && Object.keys(latestDataMaskRef.current).length > 0) {
        payload = latestDataMaskRef.current;
      }

      if (!payload) {
        setSaveMsg('Niente da salvare. Interagisci con almeno un filtro e riprova.');
        return;
      }

      await saveFilterState(selectedDashboardId as number, payload);
      setSaveMsg('✓ Filtri salvati');
    } catch (e) {
      setSaveMsg('Errore: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  /** Cattura il dataMask grezzo corrente (per riflettere i filtri nel PDF). */
  const getCurrentDataMask = async (): Promise<DataMask | undefined> => {
    const dashboard = dashboardInstRef.current;
    try {
      const dm = await dashboard?.getDataMask?.();
      if (dm && Object.keys(dm).length > 0) return dm;
    } catch {
      /* non supportato */
    }
    if (latestDataMaskRef.current && Object.keys(latestDataMaskRef.current).length > 0) {
      return latestDataMaskRef.current;
    }
    return undefined;
  };

  /** Export PDF: chiede lo screenshot (→ digest) e poi scarica il PDF. */
  const handleDownloadPdf = async () => {
    if (!selectedDashboardId) return;
    setPdfMsg(null);
    setPdfBusy(true);
    try {
      const dataMask = await getCurrentDataMask();
      const { digest } = await requestDashboardScreenshot(selectedDashboardId, dataMask);
      await downloadDashboardPdf(selectedDashboardId, digest);
      setPdfMsg('✓ PDF scaricato');
    } catch (e) {
      setPdfMsg('Errore: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setPdfBusy(false);
    }
  };

  const busy = loading || building;

  return (
    <div className="flex h-[calc(100svh-4rem)] flex-col gap-3 p-4">
      <ChartDrawer dashboardId={selectedDashboardId} onBuild={handleBuild} building={building} />

      <select
        defaultValue=""
        onChange={(e) => loadDashboard(Number(e.target.value))}
        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="" disabled hidden>
          -- Seleziona una dashboard --
        </option>
        {dashboards.map((d) => (
          <option key={d.id} value={d.id}>
            {d.title}
          </option>
        ))}
      </select>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {selectedDashboardId && !loading && (
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleSaveFilters}>
            Salva filtri correnti
          </Button>
          {saveMsg && (
            <span className={`text-sm ${saveMsg.startsWith('Errore') ? 'text-destructive' : 'text-green-600'}`}>{saveMsg}</span>
          )}

          <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={pdfBusy}>
            {pdfBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {pdfBusy ? 'Generazione PDF...' : 'Scarica PDF'}
          </Button>
          {pdfMsg && (
            <span className={`text-sm ${pdfMsg.startsWith('Errore') ? 'text-destructive' : 'text-green-600'}`}>{pdfMsg}</span>
          )}
        </div>
      )}

      {busy && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{building ? 'Aggiornamento layout...' : 'Caricamento...'}</span>
        </div>
      )}

      <div
        ref={dashboardRef}
        className="superset-embed flex-1 overflow-auto rounded-md border bg-muted/30"
        style={{ display: busy ? 'none' : 'block' }}
      />
    </div>
  );
}

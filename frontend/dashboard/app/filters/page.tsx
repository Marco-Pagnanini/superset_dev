'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { listDashboards, getNativeFilters, getFilterOptions, setFilterDefault } from '@/lib/api';
import type { Dashboard, NativeFilter, FilterOptionsResponse } from '@/lib/types';

export default function FiltersPage() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [dashboardId, setDashboardId] = useState<number | null>(null);
  const [filters, setFilters] = useState<NativeFilter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stato per i valori di un filtro
  const [options, setOptions] = useState<Record<string, FilterOptionsResponse>>({});
  const [optionsLoading, setOptionsLoading] = useState<string | null>(null);

  // Stato per "imposta default"
  const [timeRange, setTimeRange] = useState('Last week');
  const [defaultMsg, setDefaultMsg] = useState<string | null>(null);

  useEffect(() => {
    listDashboards()
      .then(setDashboards)
      .catch((e) => setError(e.message));
  }, []);

  const loadFilters = async (id: number) => {
    setDashboardId(id);
    setFilters([]);
    setOptions({});
    setDefaultMsg(null);
    setError(null);
    setLoading(true);
    try {
      setFilters(await getNativeFilters(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const loadOptions = async (filterId: string) => {
    if (!dashboardId) return;
    setOptionsLoading(filterId);
    try {
      const opts = await getFilterOptions(dashboardId, filterId);
      setOptions((prev) => ({ ...prev, [filterId]: opts }));
    } catch (e) {
      setOptions((prev) => ({ ...prev, [filterId]: { values: [`Errore: ${e instanceof Error ? e.message : e}`], columnName: '', datasetId: 0 } }));
    } finally {
      setOptionsLoading(null);
    }
  };

  const applyDefault = async (filterName: string) => {
    if (!dashboardId) return;
    setDefaultMsg(null);
    try {
      const res = await setFilterDefault(dashboardId, filterName, timeRange);
      setDefaultMsg(`✓ Default "${res.timeRange}" impostato per "${res.filterName}"`);
    } catch (e) {
      setDefaultMsg('Errore: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Filtri nativi</h1>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">
        Ispeziona i filtri nativi di una dashboard, leggine i valori e imposta un default (es. time range).
      </p>

      <select
        defaultValue=""
        onChange={(e) => loadFilters(Number(e.target.value))}
        className="mb-4 rounded-md border border-input bg-background px-3 py-2 text-sm"
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

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Caricamento filtri...
        </div>
      )}

      {dashboardId && !loading && (
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">timeRange (per "imposta default")</label>
            <Input value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="h-8 w-56" />
          </div>
          {defaultMsg && (
            <span className={`text-sm ${defaultMsg.startsWith('Errore') ? 'text-destructive' : 'text-green-600'}`}>{defaultMsg}</span>
          )}
        </div>
      )}

      <div className="space-y-3">
        {filters.map((f) => (
          <div key={f.id} className="rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{f.name}</p>
                <span className="font-mono text-[11px] text-muted-foreground">{f.filterType} · {f.id}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => loadOptions(f.id)} disabled={optionsLoading === f.id}>
                  {optionsLoading === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Vedi valori'}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => applyDefault(f.name)}>
                  Imposta default
                </Button>
              </div>
            </div>

            {options[f.id] && (
              <div className="mt-3 border-t pt-3">
                <p className="mb-1 text-xs text-muted-foreground">
                  Colonna <span className="font-mono">{options[f.id].columnName || '—'}</span> ({options[f.id].values.length} valori)
                </p>
                <div className="flex flex-wrap gap-1">
                  {options[f.id].values.slice(0, 50).map((v, i) => (
                    <span key={i} className="rounded bg-muted px-2 py-0.5 text-xs">{String(v)}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        {dashboardId && !loading && filters.length === 0 && (
          <p className="text-sm text-muted-foreground">Nessun filtro nativo configurato su questa dashboard.</p>
        )}
      </div>
    </div>
  );
}

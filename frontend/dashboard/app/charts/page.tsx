'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { listCharts, getChartData } from '@/lib/api';
import type { Chart, ChartDataResponse } from '@/lib/types';

/** Estrae le righe tabellari dalla risposta /chart/data, se presenti. */
function extractRows(data: unknown): Record<string, unknown>[] | null {
  const rows = (data as any)?.result?.[0]?.data;
  return Array.isArray(rows) ? rows : null;
}

export default function ChartsPage() {
  const [charts, setCharts] = useState<Chart[]>([]);
  const [selected, setSelected] = useState<Chart | null>(null);
  const [trinoServer, setTrinoServer] = useState('');
  const [userDb, setUserDb] = useState('');
  const [result, setResult] = useState<ChartDataResponse | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCharts()
      .then(setCharts)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingList(false));
  }, []);

  const runQuery = async (chart: Chart) => {
    setSelected(chart);
    setResult(null);
    setError(null);
    setLoadingData(true);
    try {
      const data = await getChartData(chart.id, {
        trinoServer: trinoServer || undefined,
        userDb: userDb || undefined,
      });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingData(false);
    }
  };

  const rows = useMemo(() => (result ? extractRows(result.data) : null), [result]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Esplora chart</h1>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">
        Elenca i chart di cui sei owner ed esegui la loro query.{' '}
        <span className="font-mono text-xs">GET /charts</span> ·{' '}
        <span className="font-mono text-xs">GET /charts/:id/data</span>
      </p>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">trinoServer</label>
          <Input value={trinoServer} onChange={(e) => setTrinoServer(e.target.value)} placeholder="(default backend)" className="h-8 w-48" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">userDb</label>
          <Input value={userDb} onChange={(e) => setUserDb(e.target.value)} placeholder="(default backend)" className="h-8 w-48" />
        </div>
        <p className="text-xs text-muted-foreground">Parametri multi-tenant Trino passati alla query.</p>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 md:grid-cols-[20rem_1fr]">
        {/* Lista chart */}
        <div className="rounded-lg border bg-card">
          <div className="border-b px-3 py-2 text-sm font-semibold">Chart ({charts.length})</div>
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {loadingList && (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {charts.map((c) => (
              <button
                key={c.id}
                onClick={() => runQuery(c)}
                className={`mb-1 flex w-full flex-col rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
                  selected?.id === c.id ? 'bg-accent' : ''
                }`}
              >
                <span className="font-medium">{c.title}</span>
                <span className="font-mono text-[11px] text-muted-foreground">{c.viz_type}</span>
              </button>
            ))}
            {!loadingList && charts.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted-foreground">Nessun chart</p>}
          </div>
        </div>

        {/* Risultato */}
        <div className="rounded-lg border bg-card p-4">
          {!selected && <p className="text-sm text-muted-foreground">Seleziona un chart per eseguirne la query.</p>}
          {loadingData && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Esecuzione query...
            </div>
          )}
          {result && !loadingData && (
            <>
              <div className="mb-3">
                <h2 className="font-semibold">{result.slice_name}</h2>
                <span className="font-mono text-xs text-muted-foreground">{result.viz_type}</span>
              </div>
              {rows && rows.length > 0 ? (
                <div className="max-h-[55vh] overflow-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead className="sticky top-0 bg-muted">
                      <tr>
                        {Object.keys(rows[0]).map((k) => (
                          <th key={k} className="border-b px-2 py-1 text-left font-medium">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 200).map((r, i) => (
                        <tr key={i} className="hover:bg-accent/50">
                          {Object.keys(rows[0]).map((k) => (
                            <td key={k} className="border-b px-2 py-1">{String(r[k])}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <pre className="max-h-[55vh] overflow-auto rounded bg-muted p-3 text-xs">{JSON.stringify(result.data, null, 2)}</pre>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

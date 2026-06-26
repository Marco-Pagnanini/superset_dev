'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { listCharts, getDashboardCharts } from '@/lib/api';
import type { Chart } from '@/lib/types';
import { VIZ_META, PREVIEWS } from './chart-previews';

interface ChartCardProps {
  chart: Chart;
  selected: boolean;
  existing: boolean;
  removing: boolean;
  onToggle: (chart: Chart) => void;
}

function ChartCard({ chart, selected, existing, removing, onToggle }: ChartCardProps) {
  const meta = VIZ_META[chart.viz_type] ?? { label: chart.viz_type, badgeClass: 'bg-gray-100 text-gray-700' };
  const preview = PREVIEWS[chart.viz_type];

  // Stato visivo: rimozione (rosso) > già presente (verde) > selezionato (blu) > default.
  let cardClass = 'border-border bg-card hover:border-blue-300';
  let badgeClass = meta.badgeClass;
  let badgeLabel = meta.label;
  let circle = <span className="block h-5 w-5 rounded-full border-2 border-muted-foreground/30" />;

  if (existing && removing) {
    cardClass = 'border-red-400 bg-red-50 hover:border-red-500';
    badgeClass = 'bg-red-100 text-red-700';
    badgeLabel = 'Da rimuovere';
    circle = <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">✕</span>;
  } else if (existing) {
    cardClass = 'border-green-300 bg-green-50 hover:border-red-300';
    badgeClass = 'bg-green-100 text-green-700';
    badgeLabel = 'Già presente';
    circle = <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-400 text-[10px] text-white">✓</span>;
  } else if (selected) {
    cardClass = 'border-blue-400 bg-blue-50';
    circle = <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] text-white">✓</span>;
  }

  return (
    <button
      type="button"
      onClick={() => onToggle(chart)}
      className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all ${cardClass}`}
    >
      <div className="shrink-0 rounded-md bg-muted p-1">
        {preview ?? (
          <div className="flex h-[50px] w-[80px] items-center justify-center rounded-md bg-muted-foreground/10 text-xs text-muted-foreground">
            N/A
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-semibold text-foreground">{chart.title}</p>
        <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${badgeClass}`}>{badgeLabel}</span>
      </div>
      <div className="shrink-0">{circle}</div>
    </button>
  );
}

interface ChartDrawerProps {
  dashboardId: number | null;
  onBuild: (chartIds: number[], removeIds: number[]) => void;
  building: boolean;
}

export default function ChartDrawer({ dashboardId, onBuild, building }: ChartDrawerProps) {
  const [open, setOpen] = useState(false);
  const [charts, setCharts] = useState<Chart[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Chart[]>([]);
  const [existingIds, setExistingIds] = useState<Set<number>>(new Set());
  const [toRemove, setToRemove] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setSelected([]);
    setToRemove(new Set());
    Promise.all([listCharts(), dashboardId ? getDashboardCharts(dashboardId) : Promise.resolve([] as Chart[])])
      .then(([allCharts, existingCharts]) => {
        setCharts(allCharts);
        setExistingIds(new Set(existingCharts.map((c) => c.id)));
      })
      .catch(() => setError('Errore nel caricamento dei chart'))
      .finally(() => setLoading(false));
  }, [open, dashboardId]);

  const toggleChart = (chart: Chart) => {
    setSelected((prev) => (prev.find((c) => c.id === chart.id) ? prev.filter((c) => c.id !== chart.id) : [...prev, chart]));
  };

  const toggleRemove = (chart: Chart) => {
    setToRemove((prev) => {
      const next = new Set(prev);
      if (next.has(chart.id)) next.delete(chart.id);
      else next.add(chart.id);
      return next;
    });
  };

  const handleBuild = () => {
    onBuild(
      selected.map((c) => c.id),
      [...toRemove],
    );
    setOpen(false);
  };

  const hasChanges = selected.length > 0 || toRemove.size > 0;

  return (
    <>
      {/* Linguetta verticale fissa sul lato destro */}
      <Button
        onClick={() => setOpen(true)}
        size="sm"
        className="fixed top-1/2 right-0 z-10 origin-right -translate-y-1/2 -rotate-90 rounded-b-none px-5"
      >
        Charts {selected.length > 0 && `(${selected.length})`}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
          <SheetHeader className="border-b">
            <SheetTitle>Scegli i chart</SheetTitle>
          </SheetHeader>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {loading && (
              <div className="flex justify-center pt-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {!loading && !error && (
              <>
                {charts.map((chart) => (
                  <ChartCard
                    key={chart.id}
                    chart={chart}
                    selected={!!selected.find((c) => c.id === chart.id)}
                    existing={existingIds.has(chart.id)}
                    removing={toRemove.has(chart.id)}
                    onToggle={existingIds.has(chart.id) ? toggleRemove : toggleChart}
                  />
                ))}
                {charts.length === 0 && <p className="pt-8 text-center text-muted-foreground">Nessun chart trovato</p>}
              </>
            )}
          </div>

          {hasChanges && (
            <SheetFooter className="border-t">
              <Button className="w-full" disabled={building} onClick={handleBuild}>
                {building ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Aggiornamento...
                  </>
                ) : (
                  [selected.length > 0 && `Aggiungi ${selected.length}`, toRemove.size > 0 && `Rimuovi ${toRemove.size}`]
                    .filter(Boolean)
                    .join(' · ')
                )}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

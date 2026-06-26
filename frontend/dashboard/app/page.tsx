import Link from 'next/link';
import { LayoutDashboard, BarChart3, SlidersHorizontal, ArrowRight } from 'lucide-react';

const features = [
  {
    href: '/embed',
    icon: LayoutDashboard,
    title: 'Embed dashboard',
    desc: 'Seleziona una dashboard, montala via guest token, componi i chart e salva lo stato dei filtri.',
    endpoints: ['GET /dashboards', 'POST /dashboards/guest-token', 'POST /dashboards/build', 'GET·POST /dashboards/:id/filter-state'],
  },
  {
    href: '/charts',
    icon: BarChart3,
    title: 'Esplora chart',
    desc: 'Elenca i tuoi chart ed esegui la loro query passando i parametri multi-tenant Trino.',
    endpoints: ['GET /charts', 'GET /charts/:id/data'],
  },
  {
    href: '/filters',
    icon: SlidersHorizontal,
    title: 'Filtri nativi',
    desc: 'Ispeziona i filtri nativi di una dashboard, leggine i valori e imposta un default.',
    endpoints: ['GET /dashboards/:id/native-filters', 'GET /dashboards/:id/filter-options/:filterId', 'POST /dashboards/:id/set-filter-default'],
  },
];

const flow = [
  'Il frontend chiede al backend un guest token per la dashboard scelta.',
  'Il backend si autentica come admin su Superset (login + CSRF), legge l’embed UUID e crea il guest token.',
  'Il frontend passa il token all’embedded SDK, che monta l’iframe della dashboard.',
  'Le interazioni con i filtri emettono dataMask: lo stato può essere salvato e ripristinato via permalink.',
];

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl p-6 md:p-10">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Superset Dashboard</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Dashboard Next.js che incorpora i chart di Apache Superset tramite l’embedded SDK, con un backend
          TypeScript che fa da ponte verso le API di Superset. Questa pagina riassume le funzionalità e come sono
          collegate al backend.
        </p>
      </header>

      <section className="mb-10 rounded-xl border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Come funziona l’embedding</h2>
        <ol className="space-y-3">
          {flow.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {i + 1}
              </span>
              <span className="text-muted-foreground">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {features.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className="group flex flex-col rounded-xl border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-accent"
          >
            <f.icon className="mb-3 h-6 w-6 text-primary" />
            <h3 className="flex items-center gap-1 font-semibold">
              {f.title}
              <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
            </h3>
            <p className="mt-1 flex-1 text-sm text-muted-foreground">{f.desc}</p>
            <ul className="mt-3 space-y-1">
              {f.endpoints.map((e) => (
                <li key={e} className="font-mono text-[11px] text-muted-foreground/80">{e}</li>
              ))}
            </ul>
          </Link>
        ))}
      </section>
    </div>
  );
}

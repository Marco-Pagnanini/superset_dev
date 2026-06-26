'use client';

import { API_BASE, SUPERSET_DOMAIN, USER_ID } from '@/lib/api';

const rows = [
  { label: 'NEXT_PUBLIC_API_URL', value: API_BASE, desc: 'Base URL del backend Superset' },
  { label: 'NEXT_PUBLIC_SUPERSET_URL', value: SUPERSET_DOMAIN, desc: 'Dominio Superset usato dall’embedded SDK' },
  { label: 'NEXT_PUBLIC_USER_ID', value: USER_ID, desc: 'Utente per salvataggio/ripristino filtri (TODO: auth reale)' },
];

export default function SettingsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Impostazioni</h1>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">
        Configurazione corrente (variabili d’ambiente <span className="font-mono text-xs">NEXT_PUBLIC_*</span>, definite in{' '}
        <span className="font-mono text-xs">.env.local</span>).
      </p>

      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Variabile</th>
              <th className="px-4 py-2 text-left font-medium">Valore</th>
              <th className="px-4 py-2 text-left font-medium">Descrizione</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t">
                <td className="px-4 py-2 font-mono text-xs">{r.label}</td>
                <td className="px-4 py-2 font-mono text-xs">{r.value}</td>
                <td className="px-4 py-2 text-muted-foreground">{r.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

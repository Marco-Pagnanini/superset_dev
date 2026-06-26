'use client';

import dynamic from 'next/dynamic';

// L'embedded SDK di Superset funziona solo nel browser: lo carichiamo senza SSR.
const SupersetDashboard = dynamic(() => import('@/components/superset/SupersetDashboard'), { ssr: false });

export default function EmbedPage() {
  return <SupersetDashboard />;
}

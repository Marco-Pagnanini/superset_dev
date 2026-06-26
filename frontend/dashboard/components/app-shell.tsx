'use client';

import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';

/**
 * Guscio applicativo (client): sidebar + header + area contenuto.
 * Vive in un componente client perché `SidebarProvider` usa React context/hook;
 * il layout root resta invece un Server Component.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <span className="font-semibold">Superset Dashboard</span>
        </header>
        <main className="min-h-[calc(100svh-4rem)]">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

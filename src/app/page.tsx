"use client";

import { Dashboard } from '@/components/Dashboard';
import { LoggerProvider } from '@/hooks/useLogger';
import { AdminTerminal } from '@/components/AdminTerminal';

export default function Home() {
  return (
    <LoggerProvider>
      <main>
        <Dashboard />
      </main>
      <AdminTerminal />
    </LoggerProvider>
  );
}

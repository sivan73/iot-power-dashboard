"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { RelayCard } from './RelayCard';
import { Toast, ToastMessage } from './Toast';
import { Lightbulb, Fan, AirVent, Server, Wind, Droplets, Tv, Cpu, Loader2 } from 'lucide-react';
import { useLogger } from '@/hooks/useLogger';
import type { useRelayActivity } from '@/hooks/useRelayActivity';

const RELAY_CONFIG = [
  { id: 1, name: 'Main Lights',   pin: 'V0', icon: Lightbulb },
  { id: 2, name: 'Ceiling Fan',   pin: 'V1', icon: Fan       },
  { id: 3, name: 'HVAC System',   pin: 'V2', icon: AirVent   },
  { id: 4, name: 'Server Rack',   pin: 'V3', icon: Server    },
  { id: 5, name: 'Exhaust Fan',   pin: 'V4', icon: Wind      },
  { id: 6, name: 'Water Pump',    pin: 'V5', icon: Droplets  },
  { id: 7, name: 'Media Center',  pin: 'V6', icon: Tv        },
  { id: 8, name: 'Control Board', pin: 'V8', icon: Cpu       },
];

type RelayActivityHook = ReturnType<typeof import('@/hooks/useRelayActivity').useRelayActivity>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns current time formatted as HH:MM:SS */
const timeNow = () =>
  new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

/**
 * Build the internal Blynk proxy URL.
 * All requests go to /api/blynk — the server keeps the token secret.
 */
function buildProxyUrl(action: 'get' | 'update', pins: string[], value?: string): string {
  const params = new URLSearchParams({ action });
  pins.forEach(pin => params.append('pin', pin));
  if (action === 'update' && value !== undefined) params.set('value', value);
  return `/api/blynk?${params.toString()}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SmartControlCenter({ relayActivity }: { relayActivity: RelayActivityHook }) {
  const { recordToggle } = relayActivity;
  const [error, setError]               = useState<string | null>(null);
  const [toasts, setToasts]             = useState<ToastMessage[]>([]);
  const [syncedStates, setSyncedStates] = useState<Record<string, boolean>>({});
  const [isSyncing, setIsSyncing]       = useState(true);
  const { addLog, setBlynkStatus }      = useLogger();

  const addToast = useCallback((message: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type: 'error' }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ─── Sync Logic ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const syncStates = async (isInitial = false) => {
      // Diagnostic: show whether the public token env var was injected at build time
      if (isInitial) {
        const pubToken = process.env.NEXT_PUBLIC_BLYNK_TOKEN;
        addLog(
          `[${timeNow()}] DEBUG: NEXT_PUBLIC_BLYNK_TOKEN = ${pubToken ? `"${pubToken.slice(0, 6)}…" (injected ✓)` : '[MISSING – check .env.local]'}`
        );
      }

      const url = buildProxyUrl('get', RELAY_CONFIG.map(r => r.pin));
      addLog(`[${timeNow()}] FETCH: Sync → ${url}`);

      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const newState: Record<string, boolean> = {};
        let hasChanged = false;

        RELAY_CONFIG.forEach(r => {
          const fetchedValue = data[r.pin] === '1' || data[r.pin] === 1;
          newState[r.pin] = fetchedValue;
          if (syncedStates[r.pin] !== fetchedValue) hasChanged = true;
        });

        if (hasChanged || isInitial) {
          if (!isInitial && hasChanged) {
            addLog(`[${timeNow()}] SYNC: External state change detected via Blynk Cloud.`);
          }
          setSyncedStates(newState);
        }

        setBlynkStatus('CONNECTED');
      } catch (err) {
        console.error('Blynk sync error:', err);
        addLog(`[${timeNow()}] CRITICAL: Blynk sync failed — ${(err as Error).message}`);
        setBlynkStatus('DISCONNECTED');
      } finally {
        if (isInitial) setIsSyncing(false);
      }
    };

    syncStates(true);
    const interval = setInterval(() => syncStates(false), 5000);
    return () => clearInterval(interval);
  }, [syncedStates, addLog, setBlynkStatus]);

  // ─── Toggle Handler ──────────────────────────────────────────────────────────
  const handleToggle = async (id: number, pin: string, newState: boolean): Promise<boolean> => {
    setError(null);
    const targetValue = newState ? '1' : '0';
    const t = timeNow();

    addLog(`[${t}] COMMAND: Sending ${pin} ${newState ? 'High' : 'Low'} to Blynk Cloud...`);

    // If token genuinely missing from env (BLYNK_TOKEN server-side not set),
    // the API route will return a 500 — we'll catch it below. Simulate locally
    // only if we have ZERO token at all (local dev without .env.local).
    const pubToken = process.env.NEXT_PUBLIC_BLYNK_TOKEN;
    if (!pubToken) {
      addLog(`[${t}] DEBUG: NEXT_PUBLIC_BLYNK_TOKEN missing — running simulated toggle.`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return true;
    }

    try {
      // 1. Update Phase — POST through proxy
      const updateUrl = buildProxyUrl('update', [pin], targetValue);
      addLog(`[${t}] COMMAND: → ${updateUrl}`);

      const response = await fetch(updateUrl);
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${response.status}`);
      }

      // 2. Mandatory 2 s delay for physical relay settle
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 3. Verification Phase — read back the pin
      const getUrl = buildProxyUrl('get', [pin]);
      addLog(`[${t}] COMMAND: ✓ Verifying → ${getUrl}`);

      const vResponse = await fetch(getUrl);
      if (!vResponse.ok) throw new Error('Blynk verification failed');

      const vText = await vResponse.text();
      // Blynk single-pin GET returns plain text like ["1"] or "1"
      const confirmed = vText.includes(targetValue);

      if (confirmed) {
        addLog(`[${t}] SUCCESS: Confirmed ${pin} is ${newState ? 'High' : 'Low'}.`);
        setBlynkStatus('CONNECTED');
        const relay = RELAY_CONFIG.find(r => r.pin === pin);
        if (relay) recordToggle(pin, relay.name, newState ? 'ON' : 'OFF');
        return true;
      } else {
        addLog(`[${t}] CRITICAL: Hardware mismatch on ${pin}. Expected ${targetValue}, got ${vText.trim()}`);
        setBlynkStatus('DISCONNECTED');
        throw new Error('Blynk state mismatch. Device may be offline.');
      }
    } catch (err: any) {
      console.error('Blynk relay error:', err);
      addLog(`[${t}] CRITICAL: Blynk timeout or connection failure — ${err.message}`);
      setBlynkStatus('DISCONNECTED');
      setError(err.message || 'Blynk transition failed.');
      return false;
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  if (isSyncing) {
    return (
      <section className="mt-8 flex items-center justify-center h-[200px]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
          <span className="text-zinc-500 font-mono text-sm tracking-widest">SYNCING BLYNK UPLINK...</span>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="mt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white tracking-wider font-mono flex items-center">
            <span className="w-2 h-2 rounded-full bg-neon-cyan glow-cyan mr-3" />
            SMART CONTROL CENTER
          </h2>
          {error && (
            <span className="text-neon-red text-sm font-mono bg-neon-red/10 px-3 py-1 rounded-full border border-neon-red/20">
              Error: {error}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {RELAY_CONFIG.map((relay) => (
            <RelayCard
              key={relay.id}
              id={relay.id}
              name={relay.name}
              pin={relay.pin}
              icon={relay.icon}
              onToggle={handleToggle}
              onError={addToast}
              initialState={syncedStates[relay.pin]}
            />
          ))}
        </div>
      </section>

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

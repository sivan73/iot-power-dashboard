"use client";

import { useState, useCallback } from 'react';

export interface RelayEvent {
  timestamp: number;    // unix ms
  pin: string;
  name: string;
  action: 'ON' | 'OFF';
}

export interface RelayStats {
  pin: string;
  name: string;
  onCount: number;
  offCount: number;
  totalOnMs: number;     // sum of on durations
  lastOnAt: number | null;
  events: RelayEvent[];  // last 50 events
}

const STORAGE_KEY = 'relay_activity_store';
const MAX_EVENTS = 50;

function loadStore(): Record<string, RelayStats> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStore(store: Record<string, RelayStats>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {}
}

export function useRelayActivity() {
  const [store, setStore] = useState<Record<string, RelayStats>>(loadStore);

  const recordToggle = useCallback((pin: string, name: string, action: 'ON' | 'OFF') => {
    const now = Date.now();
    setStore(prev => {
      const current = prev[pin] ?? {
        pin, name, onCount: 0, offCount: 0,
        totalOnMs: 0, lastOnAt: null, events: []
      };

      const newEvent: RelayEvent = { timestamp: now, pin, name, action };
      const events = [...current.events, newEvent].slice(-MAX_EVENTS);

      let totalOnMs = current.totalOnMs;
      let lastOnAt = current.lastOnAt;

      if (action === 'ON') {
        lastOnAt = now;
      } else if (action === 'OFF' && lastOnAt !== null) {
        totalOnMs += now - lastOnAt;
        lastOnAt = null;
      }

      const updated: RelayStats = {
        ...current,
        name,
        onCount:  action === 'ON'  ? current.onCount + 1  : current.onCount,
        offCount: action === 'OFF' ? current.offCount + 1 : current.offCount,
        totalOnMs,
        lastOnAt,
        events,
      };

      const newStore = { ...prev, [pin]: updated };
      saveStore(newStore);
      return newStore;
    });
  }, []);

  const clearActivity = useCallback(() => {
    setStore({});
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const allStats = Object.values(store);

  return { store, allStats, recordToggle, clearActivity };
}

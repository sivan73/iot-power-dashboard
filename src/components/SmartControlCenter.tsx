"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { RelayCard } from './RelayCard';
import { Toast, ToastMessage } from './Toast';
import { Lightbulb, Fan, AirVent, Server, Wind, Droplets, Tv, Cpu, Loader2 } from 'lucide-react';
import { useLogger } from '@/hooks/useLogger';
import type { useRelayActivity } from '@/hooks/useRelayActivity';

const RELAY_CONFIG = [
  { id: 1, name: 'Main Lights', pin: 'V0', icon: Lightbulb },
  { id: 2, name: 'Ceiling Fan', pin: 'V1', icon: Fan },
  { id: 3, name: 'HVAC System', pin: 'V2', icon: AirVent },
  { id: 4, name: 'Server Rack', pin: 'V3', icon: Server },
  { id: 5, name: 'Exhaust Fan', pin: 'V4', icon: Wind },
  { id: 6, name: 'Water Pump', pin: 'V5', icon: Droplets },
  { id: 7, name: 'Media Center', pin: 'V6', icon: Tv },
  { id: 8, name: 'Control Board', pin: 'V8', icon: Cpu },
];

type RelayActivityHook = ReturnType<typeof import('@/hooks/useRelayActivity').useRelayActivity>;

export function SmartControlCenter({ relayActivity }: { relayActivity: RelayActivityHook }) {
  const { recordToggle } = relayActivity;
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [syncedStates, setSyncedStates] = useState<Record<string, boolean>>({});
  const { addLog, setBlynkStatus } = useLogger();

  const addToast = useCallback((message: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type: 'error' }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);
  const [isSyncing, setIsSyncing] = useState(true);

  // Sync Logic: Get initial state and poll continuously
  useEffect(() => {
    const syncStates = async (isInitial = false) => {
      const token = process.env.NEXT_PUBLIC_BLYNK_TOKEN;
      if (!token) {
        if (isInitial) setIsSyncing(false);
        return;
      }

      try {
        const pinsQuery = RELAY_CONFIG.map(r => r.pin).join('&');
        const baseUrl = process.env.NEXT_PUBLIC_BLYNK_BASE_URL || 'https://blynk.cloud/external/api';
        const url = `${baseUrl}/get?token=${token}&${pinsQuery}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Sync failed');
        
        const data = await response.json();
        const newState: Record<string, boolean> = {};
        let hasChanged = false;

        RELAY_CONFIG.forEach(r => {
          const fetchedValue = data[r.pin] === "1" || data[r.pin] === 1;
          newState[r.pin] = fetchedValue;
          if (syncedStates[r.pin] !== fetchedValue) {
            hasChanged = true;
          }
        });

        if (hasChanged || isInitial) {
          if (!isInitial && hasChanged) {
            const timeNow = new Date().toLocaleTimeString([], { hour12: false });
            addLog(`[${timeNow}] SYNC: External state change detected via Blynk Cloud.`);
          }
          setSyncedStates(newState);
        }
        
        setBlynkStatus('CONNECTED');
      } catch (err) {
        console.error('Blynk sync error:', err);
        setBlynkStatus('DISCONNECTED');
      } finally {
        if (isInitial) setIsSyncing(false);
      }
    };

    // Initial sync
    syncStates(true);

    // Continuous polling every 5 seconds
    const interval = setInterval(() => syncStates(false), 5000);
    return () => clearInterval(interval);
  }, [syncedStates, addLog, setBlynkStatus]);

  const handleToggle = async (id: number, pin: string, newState: boolean): Promise<boolean> => {
    setError(null);
    const token = process.env.NEXT_PUBLIC_BLYNK_TOKEN;
    
    const targetValue = newState ? "1" : "0";
    
    const timeNow = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    addLog(`[${timeNow}] COMMAND: Sending ${pin} ${newState ? 'High' : 'Low'} to Blynk Cloud...`);

    if (!token) {
      console.warn('Blynk Token missing. Simulating 2s verification.');
      await new Promise(resolve => setTimeout(resolve, 2000));
      return true;
    }

    try {
      // 1. Blynk Update Phase
      const baseUrl = process.env.NEXT_PUBLIC_BLYNK_BASE_URL || 'https://blynk.cloud/external/api';
      const updateUrl = `${baseUrl}/update?token=${token}&${pin}=${targetValue}`;
      const response = await fetch(updateUrl);
      
      if (!response.ok) throw new Error('Blynk update failed');

      // 2. Mandatory 2s delay for True State feel
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 3. Verification Phase (Blynk Get)
      const getUrl = `${baseUrl}/get?token=${token}&${pin}`;
      const vResponse = await fetch(getUrl);
      if (!vResponse.ok) throw new Error('Blynk verification failed');
      
      const vValue = await vResponse.text();

      if (vValue === targetValue) {
        addLog(`[${timeNow}] SUCCESS: Confirmed ${pin} is ${newState ? 'High' : 'Low'}.`);
        setBlynkStatus('CONNECTED');
        // Record relay toggle in activity store
        const relay = RELAY_CONFIG.find(r => r.pin === pin);
        if (relay) recordToggle(pin, relay.name, newState ? 'ON' : 'OFF');
        return true;
      } else {
        addLog(`[${timeNow}] CRITICAL: Hardware mismatch on ${pin}.`);
        setBlynkStatus('DISCONNECTED');
        throw new Error('Blynk state mismatch. Device may be offline.');
      }

    } catch (err: any) {
      console.error('Blynk relay error:', err);
      addLog(`[${timeNow}] CRITICAL: Blynk timeout or connection failure.`);
      setBlynkStatus('DISCONNECTED');
      setError(err.message || 'Blynk transition failed.');
      return false;
    }
  };

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
            <span className="w-2 h-2 rounded-full bg-neon-cyan glow-cyan mr-3"></span>
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

      {/* Toast Notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

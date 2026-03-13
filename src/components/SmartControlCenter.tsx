"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { RelayCard } from './RelayCard';
import { Toast, ToastMessage } from './Toast';
import { Lightbulb, Fan, AirVent, Server, Wind, Droplets, Tv, Cpu, Loader2 } from 'lucide-react';

const RELAY_CONFIG = [
  { id: 1, name: 'Main Lights', pin: 'V1', icon: Lightbulb },
  { id: 2, name: 'Ceiling Fan', pin: 'V2', icon: Fan },
  { id: 3, name: 'HVAC System', pin: 'V3', icon: AirVent },
  { id: 4, name: 'Server Rack', pin: 'V4', icon: Server },
  { id: 5, name: 'Exhaust Fan', pin: 'V5', icon: Wind },
  { id: 6, name: 'Water Pump', pin: 'V6', icon: Droplets },
  { id: 7, name: 'Media Center', pin: 'V7', icon: Tv },
  { id: 8, name: 'Control Board', pin: 'V8', icon: Cpu },
];

export function SmartControlCenter() {
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [syncedStates, setSyncedStates] = useState<Record<string, boolean>>({});

  const addToast = useCallback((message: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type: 'error' }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);
  const [isSyncing, setIsSyncing] = useState(true);

  // Sync Logic: Get initial state from Blynk
  useEffect(() => {
    const syncStates = async () => {
      const token = process.env.NEXT_PUBLIC_BLYNK_TOKEN;
      if (!token) {
        setIsSyncing(false);
        return;
      }

      try {
        const pins = RELAY_CONFIG.map(r => r.pin).join(',');
        const url = `https://blynk.cloud/external/api/get?token=${token}&${pins}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Sync failed');
        
        // Blynk GET returns simple values for multiple pins if requested this way
        // or a JSON if complex. With multiple params, it's usually better to check response
        const data = await response.json();
        const newState: Record<string, boolean> = {};
        RELAY_CONFIG.forEach(r => {
          newState[r.pin] = data[r.pin] === "1" || data[r.pin] === 1;
        });
        setSyncedStates(newState);
      } catch (err) {
        console.error('Blynk sync error:', err);
      } finally {
        setIsSyncing(false);
      }
    };

    syncStates();
  }, []);

  const handleToggle = async (id: number, pin: string, newState: boolean): Promise<boolean> => {
    setError(null);
    const token = process.env.NEXT_PUBLIC_BLYNK_TOKEN;
    
    const targetValue = newState ? "1" : "0";

    if (!token) {
      console.warn('Blynk Token missing. Simulating 2s verification.');
      await new Promise(resolve => setTimeout(resolve, 2000));
      return true;
    }

    try {
      // 1. Blynk Update Phase
      const updateUrl = `https://blynk.cloud/external/api/update?token=${token}&${pin}=${targetValue}`;
      const response = await fetch(updateUrl);
      
      if (!response.ok) throw new Error('Blynk update failed');

      // 2. Mandatory 2s delay for True State feel
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 3. Verification Phase (Blynk Get)
      const getUrl = `https://blynk.cloud/external/api/get?token=${token}&${pin}`;
      const vResponse = await fetch(getUrl);
      if (!vResponse.ok) throw new Error('Blynk verification failed');
      
      const vValue = await vResponse.text();

      if (vValue === targetValue) {
        return true;
      } else {
        throw new Error('Blynk state mismatch. Device may be offline.');
      }

    } catch (err: any) {
      console.error('Blynk relay error:', err);
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

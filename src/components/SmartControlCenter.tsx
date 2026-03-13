import React, { useState } from 'react';
import { RelayCard } from './RelayCard';
import { Lightbulb, Fan, AirVent, Server, Wind, Droplets, Tv, Cpu } from 'lucide-react';

const RELAY_CONFIG = [
  { id: 1, name: 'Main Lights', field: 'field1', icon: Lightbulb },
  { id: 2, name: 'Ceiling Fan', field: 'field2', icon: Fan },
  { id: 3, name: 'HVAC System', field: 'field3', icon: AirVent },
  { id: 4, name: 'Server Rack', field: 'field4', icon: Server },
  { id: 5, name: 'Exhaust Fan', field: 'field5', icon: Wind },
  { id: 6, name: 'Water Pump', field: 'field6', icon: Droplets },
  { id: 7, name: 'Media Center', field: 'field7', icon: Tv },
  { id: 8, name: 'Control Board', field: 'field8', icon: Cpu },
];

export function SmartControlCenter() {
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async (id: number, field: string, newState: boolean): Promise<boolean> => {
    setError(null);
    const writeKey = process.env.NEXT_PUBLIC_THINGSPEAK_WRITE_API_KEY;
    const channelId = process.env.NEXT_PUBLIC_THINGSPEAK_CHANNEL_ID;
    
    // ThingSpeak API expects 1 for ON, 0 for OFF
    const targetValue = newState ? "1" : "0";

    if (!writeKey || !channelId) {
      console.warn('ThingSpeak credentials missing. Simulating 2s verification.');
      // Mandatory 2-second visibility for the spinner as requested
      await new Promise(resolve => setTimeout(resolve, 2000));
      return true; // Simulate success
    }

    try {
      // 1. Write Phase
      const writeUrl = `https://api.thingspeak.com/update?api_key=${writeKey}&${field}=${targetValue}`;
      const writeResponse = await fetch(writeUrl, { method: 'GET' });
      
      if (!writeResponse.ok) throw new Error('Write failed');
      const writeResult = await writeResponse.text();
      if (writeResult === '0') throw new Error('Rate limit exceeded (15s).');

      // 2. Wait Phase (Mandatory 2s for spinner visibility and propagation)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 3. Verification Phase (Read API)
      const readUrl = `https://api.thingspeak.com/channels/${channelId}/feeds/last.json`;
      const readResponse = await fetch(readUrl);
      if (!readResponse.ok) throw new Error('Verification read failed');
      
      const readData = await readResponse.json();
      const verifiedValue = readData[field];

      // Return true only if the server confirms the state
      if (verifiedValue === targetValue) {
        return true;
      } else {
        throw new Error('State verification mismatched. Server did not update.');
      }

    } catch (err: any) {
      console.error('Relay verification error:', err);
      setError(err.message || 'Verification failed.');
      return false;
    }
  };

  return (
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
            field={relay.field}
            icon={relay.icon}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </section>
  );
}

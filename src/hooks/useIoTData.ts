"use client";

import { useState, useEffect } from 'react';
import { useLogger } from '@/hooks/useLogger';

export interface IoTData {
  voltage: number;
  current: number;
  power: number;
  consumption: number;
  runtime: string | number;
  toggleCount: number;
  isLive: boolean;
  isStale: boolean;
  
  // Historical data for charts (max 50 points)
  history: {
    voltage: number[];
    current: number[];
    power: number[];
    consumption: number[];
    labels: string[];
  };
}

const defaultHistory = {
  voltage: Array(50).fill(230),
  current: Array(50).fill(0.5),
  power: Array(50).fill(115),
  consumption: Array(50).fill(10450.5),
  labels: Array(50).fill(''),
};

const defaultData: IoTData = {
  voltage: 230,
  current: 0.5,
  power: 115,
  consumption: 10450.5,
  runtime: '--h --m',
  toggleCount: 0,
  isLive: false,
  isStale: false,
  history: defaultHistory,
};

export function useIoTData() {
  const [data, setData] = useState<IoTData>(() => {
    // Attempt to load cached history on mount
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('iot_telemetry_cache');
        if (cached) return JSON.parse(cached);
      } catch (e) {
        console.error('Failed to parse cache', e);
      }
    }
    return defaultData;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const { addLog, setThingSpeakStatus, setLastDataReceivedAt } = useLogger();

  useEffect(() => {
    const channelId = process.env.NEXT_PUBLIC_THINGSPEAK_CHANNEL_ID;
    const readApiKey = process.env.NEXT_PUBLIC_THINGSPEAK_READ_API_KEY;

    let simulationInterval: NodeJS.Timeout | null = null;

    const startSimulation = () => {
      if (simulationInterval) return;
      
      let tick = 0;
      simulationInterval = setInterval(() => {
        tick++;
        setData(prev => {
          // 1% Jitter function
          const jitter = () => 1 + (Math.random() * 0.02 - 0.01);
          
          const baseVoltage = 230 + Math.sin(tick * 0.2) * 2; 
          const newVoltage = (baseVoltage + (Math.random() * 0.4 - 0.2)) * jitter();
          const baseCurrent = 0.5 + Math.cos(tick * 0.15) * 0.05;
          const newCurrent = Math.max(0.1, (baseCurrent + (Math.random() * 0.02 - 0.01)) * jitter());
          const newPower = newVoltage * newCurrent;
          const incrementWh = newPower * (16 / 3600); // 16s interval sync
          
          const timeStr = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
          
          const limitHist = (arr: any[], newVal: any) => [...arr.slice(1), newVal];

          const newData = {
            ...prev,
            voltage: newVoltage,
            current: newCurrent,
            power: newPower,
            consumption: prev.consumption + incrementWh,
            toggleCount: prev.toggleCount + (Math.random() > 0.9 ? 1 : 0),
            isLive: false,
            isStale: false,
            history: {
              voltage: limitHist(prev.history.voltage, newVoltage),
              current: limitHist(prev.history.current, newCurrent),
              power: limitHist(prev.history.power, newPower),
              consumption: limitHist(prev.history.consumption, prev.consumption + incrementWh),
              labels: limitHist(prev.history.labels, timeStr)
            }
          };
          
          localStorage.setItem('iot_telemetry_cache', JSON.stringify(newData));
          return newData;
        });
      }, 16000);
    };

    // If no credentials, go straight to simulation
    if (!channelId) {
      setLoading(false);
      startSimulation();
      return () => {
        if (simulationInterval) clearInterval(simulationInterval);
      };
    }

    let hasFetchedInitial = false;

    const fetchData = async () => {
      try {
        const timeNow = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        addLog(`[${timeNow}] FETCH: Requesting telemetry from Channel...`);
        
        // Fetch 50 on first load, then only 1 point to save API overhead
        const resultsCount = hasFetchedInitial ? 1 : 50;
        const url = `https://api.thingspeak.com/channels/${channelId}/feeds.json?results=${resultsCount}${readApiKey ? `&api_key=${readApiKey}` : ''}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const json = await response.json();
        
        if (json.feeds && json.feeds.length > 0) {
          if (simulationInterval) {
            clearInterval(simulationInterval);
            simulationInterval = null;
          }
          
          hasFetchedInitial = true;
          const latestFeed = json.feeds[json.feeds.length - 1];
          
          // Check for stale data (>20s old)
          const feedTime = new Date(latestFeed.created_at).getTime();
          const ageMs = Date.now() - feedTime;
          const isStale = ageMs > 20000;
          
          setData(prev => {
            const getVal = (field: any, fallback: number) => field ? parseFloat(field) : fallback;
            const newVoltage = getVal(latestFeed.field1, prev.voltage);
            const newCurrent = getVal(latestFeed.field2, prev.current);
            const newPower = getVal(latestFeed.field3, prev.power);
            const newConsumption = getVal(latestFeed.field4, prev.consumption);
            const newRuntime = latestFeed.field5 || prev.runtime;
            const newToggleCount = getVal(latestFeed.field6, prev.toggleCount);
            
            if (!isStale || !prev.isLive) {
              addLog(`[${timeNow}] SUCCESS: Received V:${newVoltage.toFixed(1)} I:${newCurrent.toFixed(1)}.`);
            }
            setThingSpeakStatus('ONLINE');
            setLastDataReceivedAt(feedTime);
            
            const processHistory = (feeds: any[]) => {
              // If we fetched 50, recreate arrays. If 1, append.
              if (feeds.length > 1) {
                const mapField = (fieldName: string, fallback: number[]) => {
                  const mapped = feeds.map(f => f[fieldName] ? parseFloat(f[fieldName]) : null).filter(v => v !== null);
                  if (mapped.length === 0) return fallback;
                  // pad to 50
                  while(mapped.length < 50) mapped.unshift(mapped[0]);
                  return mapped.slice(-50);
                };
                
                return {
                  voltage: mapField('field1', prev.history.voltage),
                  current: mapField('field2', prev.history.current),
                  power: mapField('field3', prev.history.power),
                  consumption: mapField('field4', prev.history.consumption),
                  labels: feeds.map(f => new Date(f.created_at).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })).slice(-50)
                };
              } else {
                const limitHist = (arr: any[], newVal: any) => [...arr.slice(1), newVal];
                const timeStr = new Date(latestFeed.created_at).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
                return {
                  voltage: limitHist(prev.history.voltage, newVoltage),
                  current: limitHist(prev.history.current, newCurrent),
                  power: limitHist(prev.history.power, newPower),
                  consumption: limitHist(prev.history.consumption, newConsumption),
                  labels: limitHist(prev.history.labels, timeStr)
                };
              }
            };
            
            const newHistory = processHistory(json.feeds);

            const newData = {
              voltage: newVoltage,
              current: newCurrent,
              power: newPower,
              consumption: newConsumption,
              runtime: newRuntime,
              toggleCount: newToggleCount,
              isLive: true,
              isStale,
              history: newHistory,
            };
            
            localStorage.setItem('iot_telemetry_cache', JSON.stringify(newData));
            return newData;
          });
          setError(null);
        } else {
          startSimulation();
        }
      } catch (err: any) {
        console.error("ThingSpeak fetch error", err);
        const timeNow = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        addLog(`[${timeNow}] CRITICAL: ThingSpeak timeout. Switching to Dummy Data.`);
        setThingSpeakStatus('OFFLINE');
        startSimulation();
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Use EXACTLY 16000ms polling to create 1-second buffer after ThingSpeak 15s limit
    const interval = setInterval(fetchData, 16000);

    return () => {
      clearInterval(interval);
      if (simulationInterval) clearInterval(simulationInterval);
    };
  }, [addLog, setThingSpeakStatus, setLastDataReceivedAt]);

  return { data, loading, error };
}

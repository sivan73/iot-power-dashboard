import { useState, useEffect } from 'react';

export interface IoTData {
  voltage: number;
  current: number;
  power: number;
  consumption: number;
  runtime: string | number;
  toggleCount: number;
  isLive: boolean;
}

const defaultData: IoTData = {
  voltage: 230,
  current: 0.5,
  power: 115,
  consumption: 10450.5,
  runtime: '14h 23m',
  toggleCount: 42,
  isLive: false,
};

export function useIoTData() {
  const [data, setData] = useState<IoTData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

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
          const incrementWh = newPower * (15 / 3600); // 15s interval sync
          
          return {
            ...prev,
            voltage: newVoltage,
            current: newCurrent,
            power: newPower,
            consumption: prev.consumption + incrementWh,
            toggleCount: prev.toggleCount + (Math.random() > 0.9 ? 1 : 0),
            isLive: false
          };
        });
      }, 15000);
    };

    // If no credentials, go straight to simulation
    if (!channelId) {
      setLoading(false);
      startSimulation();
      return () => {
        if (simulationInterval) clearInterval(simulationInterval);
      };
    }

    const url = `https://api.thingspeak.com/channels/${channelId}/feeds.json?results=50${readApiKey ? `&api_key=${readApiKey}` : ''}`;

    const fetchData = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const json = await response.json();
        
        if (json.feeds && json.feeds.length > 0) {
          if (simulationInterval) {
            clearInterval(simulationInterval);
            simulationInterval = null;
          }
          
          const latestFeed = json.feeds[json.feeds.length - 1];
          setData(prev => ({
            voltage: latestFeed.field1 ? parseFloat(latestFeed.field1) : prev.voltage,
            current: latestFeed.field2 ? parseFloat(latestFeed.field2) : prev.current,
            power: latestFeed.field3 ? parseFloat(latestFeed.field3) : prev.power,
            consumption: latestFeed.field4 ? parseFloat(latestFeed.field4) : prev.consumption,
            runtime: latestFeed.field5 ? latestFeed.field5 : prev.runtime,
            toggleCount: latestFeed.field6 ? parseFloat(latestFeed.field6) : prev.toggleCount,
            isLive: true
          }));
          setError(null);
        } else {
          // Empty feeds - start simulation fallback
          startSimulation();
        }
      } catch (err: any) {
        console.error("ThingSpeak fetch error, falling back to simulation:", err);
        startSimulation();
        // We don't set error state here because we want the UI to remain functional with simulation
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 15000);

    return () => {
      clearInterval(interval);
      if (simulationInterval) clearInterval(simulationInterval);
    };
  }, []);

  return { data, loading, error };
}

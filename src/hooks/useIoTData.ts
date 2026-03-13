import { useState, useEffect } from 'react';

export interface IoTData {
  voltage: number;
  current: number;
  power: number;
  consumption: number;
  runtime: string | number;
  toggleCount: number;
}

const defaultData: IoTData = {
  voltage: 230,
  current: 3.2,
  power: 736,
  consumption: 10450.5,
  runtime: '14h 23m',
  toggleCount: 42,
};

export function useIoTData() {
  const [data, setData] = useState<IoTData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const channelId = process.env.NEXT_PUBLIC_THINGSPEAK_CHANNEL_ID;
    const readApiKey = process.env.NEXT_PUBLIC_THINGSPEAK_READ_API_KEY;

    // Dummy Data Fallback for Demo
    if (!channelId) {
      setLoading(false);
      let tick = 0;
      const intervalInfo = setInterval(() => {
        tick++;
        setData(prev => {
          const baseVoltage = 230 + Math.sin(tick * 0.2) * 15; 
          const newVoltage = baseVoltage + (Math.random() * 4 - 2);
          const baseCurrent = 2.5 + Math.cos(tick * 0.15) * 2;
          const newCurrent = Math.max(0.2, baseCurrent + (Math.random() * 0.5 - 0.25));
          const newPower = newVoltage * newCurrent;
          const incrementWh = newPower * (2 / 3600);
          return {
            ...prev,
            voltage: newVoltage,
            current: newCurrent,
            power: newPower,
            consumption: prev.consumption + incrementWh,
            toggleCount: prev.toggleCount + (Math.random() > 0.8 ? 1 : 0),
          };
        });
      }, 2000);
      return () => clearInterval(intervalInfo);
    }

    // ThingSpeak Polling Logic
    const url = `https://api.thingspeak.com/channels/${channelId}/feeds.json?results=1${readApiKey ? `&api_key=${readApiKey}` : ''}`;

    const fetchData = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const json = await response.json();
        
        if (json.feeds && json.feeds.length > 0) {
          const latestFeed = json.feeds[0];
          
          setData(prev => ({
            voltage: latestFeed.field1 ? parseFloat(latestFeed.field1) : prev.voltage,
            current: latestFeed.field2 ? parseFloat(latestFeed.field2) : prev.current,
            power: latestFeed.field3 ? parseFloat(latestFeed.field3) : prev.power,
            consumption: latestFeed.field4 ? parseFloat(latestFeed.field4) : prev.consumption,
            runtime: latestFeed.field5 ? latestFeed.field5 : prev.runtime,
            toggleCount: latestFeed.field6 ? parseFloat(latestFeed.field6) : prev.toggleCount,
          }));
        }
        setError(null);
      } catch (err: any) {
        console.error("ThingSpeak fetch error:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchData();

    // Poll every 15 seconds (ThingSpeak free tier limit is widely respected as ~15s)
    const interval = setInterval(fetchData, 15000);

    return () => clearInterval(interval);
  }, []);

  return { data, loading, error };
}

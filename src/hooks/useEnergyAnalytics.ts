import { useState, useEffect } from 'react';
import { IoTData } from './useIoTData';

export interface EnergyAnalytics {
  toggleCount: number;
  runtimeSeconds: number;
  formattedRuntime: string;
}

export function useEnergyAnalytics() {
  const [analytics, setAnalytics] = useState<EnergyAnalytics>({
    toggleCount: 0,
    runtimeSeconds: 0,
    formattedRuntime: '0h 0m',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const channelId = process.env.NEXT_PUBLIC_THINGSPEAK_CHANNEL_ID;
    const readApiKey = process.env.NEXT_PUBLIC_THINGSPEAK_READ_API_KEY;

    if (!channelId) {
      // Dummy data fallback logic matching the previous hook structure
      setLoading(false);
      let simRuntime = 0;
      let simToggles = 42;
      
      const intervalInfo = setInterval(() => {
        // Apply micro-jitter to simulation consistency
        const jitter = () => 1 + (Math.random() * 0.02 - 0.01);
        
        simRuntime += 15 * jitter(); 
        if (Math.random() > 0.9) simToggles += 1;
        
        const hours = Math.floor(simRuntime / 3600);
        const minutes = Math.floor((simRuntime % 3600) / 60);

        setAnalytics({
          toggleCount: simToggles,
          runtimeSeconds: simRuntime,
          formattedRuntime: `${hours > 0 ? `${hours}h ` : ''}${minutes}m`,
        });
      }, 2000);
      return () => clearInterval(intervalInfo);
    }

    const url = `https://api.thingspeak.com/channels/${channelId}/feeds.json?results=50${readApiKey ? `&api_key=${readApiKey}` : ''}`;

    const fetchAnalytics = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const json = await response.json();

        if (json.feeds && json.feeds.length > 0) {
          let toggles = 0;
          let runtimeSecs = 0;

          const feeds = json.feeds;
          
          for (let i = 1; i < feeds.length; i++) {
            const prevFeed = feeds[i - 1];
            const currFeed = feeds[i];
            
            // Assuming power is mapped to field3 like in useIoTData
            const prevPower = prevFeed.field3 ? parseFloat(prevFeed.field3) : 0;
            const currPower = currFeed.field3 ? parseFloat(currFeed.field3) : 0;

            // 1. Calculate Toggles: When power crosses the 5W threshold upwards
            if (prevPower <= 5 && currPower > 5) {
              toggles++;
            }

            // 2. Calculate Runtime: Time spent while power is > 5W
            if (currPower > 5) {
              const prevTime = new Date(prevFeed.created_at).getTime();
              const currTime = new Date(currFeed.created_at).getTime();
              
              // Only add if time difference is reasonable (e.g. less than an hour)
              // to prevent huge gaps from inflating runtime
              const diffMs = currTime - prevTime;
              if (diffMs > 0 && diffMs < 3600000) {
                runtimeSecs += Math.floor(diffMs / 1000);
              }
            }
          }

          const hours = Math.floor(runtimeSecs / 3600);
          const minutes = Math.floor((runtimeSecs % 3600) / 60);

          setAnalytics({
            toggleCount: toggles,
            runtimeSeconds: runtimeSecs,
            formattedRuntime: `${hours > 0 ? `${hours}h ` : ''}${minutes}m`,
          });
        }
        setError(null);
      } catch (err: any) {
        console.error("Energy Analytics fetch error:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
    
    // Poll for historical updates every 15 seconds
    const interval = setInterval(fetchAnalytics, 15000);

    return () => clearInterval(interval);
  }, []);

  return { analytics, loading, error };
}

import { useState, useEffect } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { db } from '../lib/firebase';

export interface IoTData {
  voltage: number;
  current: number;
  power: number;
  consumption: number; // Added consumption (Wh)
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
    if (!db) {
      setLoading(false);
      let tick = 0;
      const intervalInfo = setInterval(() => {
        tick++;
        setData(prev => {
          // Voltage swings slightly around 230V
          const baseVoltage = 230 + Math.sin(tick * 0.2) * 15; 
          const newVoltage = baseVoltage + (Math.random() * 4 - 2);
          
          // Current swings between ~1A and ~5A. 
          // At 230V * 1A = 230W (Safe). 
          // At 230V * 5A = 1150W (Overload > 800W).
          // This ensures the dashboard will frequently transition in and out of the Overload state.
          const baseCurrent = 2.5 + Math.cos(tick * 0.15) * 2;
          const newCurrent = Math.max(0.2, baseCurrent + (Math.random() * 0.5 - 0.25));
          
          const newPower = newVoltage * newCurrent;
          
          // Simulate energy increment depending on tick
          const incrementWh = newPower * (2 / 3600); // 2s interval in hours
          return {
            ...prev,
            voltage: newVoltage,
            current: newCurrent,
            power: newPower,
            consumption: prev.consumption + incrementWh,
            toggleCount: prev.toggleCount + (Math.random() > 0.8 ? 1 : 0), // More frequent toggles
          };
        });
      }, 2000);
      return () => clearInterval(intervalInfo);
    }

    const dataRef = ref(db as any, '/');
    const unsubscribe = onValue(
      dataRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          setData(prev => ({
            voltage: val.voltage ?? 0,
            current: val.current ?? 0,
            power: val.power ?? 0,
            consumption: val.consumption ?? prev.consumption + ((val.power ?? 0) * (2/3600)),
            runtime: val.runtime ?? '0h 0m',
            toggleCount: val.toggleCount ?? 0,
          }));
        }
        setLoading(false);
      },
      (err) => {
        console.error("Firebase subscription error:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      off(dataRef, 'value', unsubscribe);
    };
  }, []);

  return { data, loading, error };
}

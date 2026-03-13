"use client";

import { useState, useEffect, useRef } from 'react';

const SESSION_KEY = 'session_power_wh';

export function useSessionPower(currentPowerW: number) {
  const lastTickRef = useRef<number>(Date.now());
  const [totalWh, setTotalWh] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    return parseFloat(sessionStorage.getItem(SESSION_KEY) || '0');
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const dtHours = (now - lastTickRef.current) / 3_600_000;
      lastTickRef.current = now;

      setTotalWh(prev => {
        const next = prev + currentPowerW * dtHours;
        sessionStorage.setItem(SESSION_KEY, next.toFixed(4));
        return next;
      });
    }, 5000); // integrate every 5 seconds

    return () => clearInterval(interval);
  }, [currentPowerW]);

  // Format as kWh if large
  const formatted = totalWh >= 1000
    ? `${(totalWh / 1000).toFixed(3)} kWh`
    : `${totalWh.toFixed(2)} Wh`;

  return { totalWh, formatted };
}

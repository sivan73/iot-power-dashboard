"use client";

import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to monitor live power and trigger a safety shutdown
 * if the load exceeds 360W for more than 5 minutes.
 */
export function useAutoCutoff(currentPower: number, onShutdown: () => void) {
  const [isEmergency, setIsEmergency] = useState(false);
  const [overloadTime, setOverloadTime] = useState(0); // seconds in overload
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const OVERLOAD_THRESHOLD = 360;
    const TIME_LIMIT = 300; // 5 minutes (300 seconds)

    if (currentPower > OVERLOAD_THRESHOLD && !isEmergency) {
      // Start or continue counting if not already in emergency
      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          setOverloadTime(prev => {
            const next = prev + 1;
            if (next >= TIME_LIMIT) {
              triggerShutdown();
            }
            return next;
          });
        }, 1000);
      }
    } else {
      // Reset timer if power drops below threshold
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setOverloadTime(0);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentPower, isEmergency]);

  const triggerShutdown = () => {
    setIsEmergency(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    onShutdown();
  };

  const resetEmergency = () => {
    setIsEmergency(false);
    setOverloadTime(0);
  };

  return { isEmergency, overloadTime, resetEmergency };
}

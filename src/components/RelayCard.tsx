"use client";

import React, { useState, useEffect } from 'react';
import { LucideIcon, Loader2, Clock } from 'lucide-react';

export interface RelayCardProps {
  id: number;
  name: string;
  pin: string;
  icon: LucideIcon;
  initialState?: boolean;
  onToggle: (id: number, pin: string, newState: boolean) => Promise<boolean>;
  onError?: (message: string) => void;
}

export function RelayCard({ id, name, pin, icon: Icon, initialState = false, onToggle, onError }: RelayCardProps) {
  const [isActive, setIsActive] = useState(initialState);
  const [isVerifying, setIsVerifying] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [activeDuration, setActiveDuration] = useState(0);

  // Load persistence from localStorage on mount
  useEffect(() => {
    const savedStart = localStorage.getItem(`relay_start_${pin}`);
    if (savedStart) {
      setStartTime(parseInt(savedStart));
      setIsActive(true);
    }
  }, [pin]);

  // Blynk Sync: when initialState becomes true from server, seed a timer if none exists
  useEffect(() => {
    if (initialState) {
      const savedStart = localStorage.getItem(`relay_start_${pin}`);
      if (!savedStart) {
        // No local timestamp → relay was ON before this session; start counting from now
        const now = Date.now();
        localStorage.setItem(`relay_start_${pin}`, now.toString());
        setStartTime(now);
      }
      setIsActive(true);
    }
  }, [initialState, pin]);

  // Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && startTime) {
      setActiveDuration(Math.floor((Date.now() - startTime) / 1000));
      interval = setInterval(() => {
        setActiveDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else if (!isActive) {
      setActiveDuration(0);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isActive, startTime]);

  const handleToggle = async () => {
    if (isVerifying) return;

    const newState = !isActive;

    // --- OPTIMISTIC UI: flip immediately ---
    setIsActive(newState);
    if (newState) {
      const now = Date.now();
      setStartTime(now);
      localStorage.setItem(`relay_start_${pin}`, now.toString());
    } else {
      localStorage.removeItem(`relay_start_${pin}`);
      setStartTime(null);
    }

    setIsVerifying(true);
    const success = await onToggle(id, pin, newState);
    setIsVerifying(false);

    if (!success) {
      // --- REVERT on failure ---
      setIsActive(!newState);
      if (!newState) {
        // was turning OFF but failed → restore timer
        const saved = localStorage.getItem(`relay_start_${pin}`);
        if (saved) setStartTime(parseInt(saved));
      } else {
        // was turning ON but failed → clear
        localStorage.removeItem(`relay_start_${pin}`);
        setStartTime(null);
      }
      onError?.('Hardware Connection Error');
    }
  };

  // Zero-pad helper
  const pad = (n: number) => String(n).padStart(2, '0');

  // Format as HH:MM:SS
  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  return (
    <div className={`glass-panel rounded-xl p-5 flex flex-col justify-between transition-all duration-300 ${isActive ? 'border-neon-cyan/30 bg-white/5' : 'border-white/5 bg-transparent'}`}>
      
      {/* Header: Icon & Toggle */}
      <div className="flex justify-between items-start mb-6">
        <div className={`p-3 rounded-lg ${isActive ? 'bg-neon-cyan/20 text-neon-cyan glow-cyan' : 'bg-white/5 text-zinc-500'}`}>
          <Icon size={24} />
        </div>
        
        {/* Custom Tailwind Toggle */}
        <button 
          onClick={handleToggle}
          disabled={isVerifying}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none 
            ${isActive ? 'bg-neon-cyan shadow-[0_0_10px_#00f0ff]' : 'bg-zinc-700'} 
            ${isVerifying ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          aria-pressed={isActive}
        >
          {isVerifying ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 size={12} className="text-white animate-spin" />
            </div>
          ) : (
            <span 
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${isActive ? 'translate-x-6' : 'translate-x-1'}`}
            />
          )}
        </button>
      </div>
      
      {/* Body: Appliance Name & Status */}
      <div>
        <h3 className="text-zinc-300 font-semibold mb-2">{name}</h3>
        
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-neon-green glow-green animate-pulse' : 'bg-zinc-600'}`}></span>
            <span className={`text-xs font-mono tracking-wider ${isActive ? 'text-neon-green' : 'text-zinc-500'}`}>
              {isActive ? 'ACTIVE' : 'IDLE'}
            </span>
          </div>
          
          {/* Duration Timer */}
          <div className={`flex items-center gap-1.5 ${isActive ? 'text-neon-cyan' : 'text-zinc-600'}`}>
            <Clock size={11} className={isActive ? 'opacity-70' : 'opacity-40'} />
            <span className={`text-xs font-mono tracking-widest tabular-nums ${isActive ? 'text-neon-cyan' : 'text-zinc-600'}`}>
              {isActive ? formatDuration(activeDuration) : '--:--:--'}
            </span>
          </div>
        </div>
      </div>
      
    </div>
  );
}

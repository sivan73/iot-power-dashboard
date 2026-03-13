import React, { useState, useEffect } from 'react';
import { LucideIcon } from 'lucide-react';

export interface RelayCardProps {
  id: number;
  name: string;
  field: string;
  icon: LucideIcon;
  initialState?: boolean;
  onToggle: (id: number, field: string, newState: boolean) => Promise<boolean>;
}

export function RelayCard({ id, name, field, icon: Icon, initialState = false, onToggle }: RelayCardProps) {
  const [isActive, setIsActive] = useState(initialState);
  const [isPending, setIsPending] = useState(false);
  
  // Timer state
  const [activeDuration, setActiveDuration] = useState(0);

  // Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isActive) {
      interval = setInterval(() => {
        setActiveDuration(prev => prev + 1);
      }, 1000);
    } else {
      setActiveDuration(0); // Reset timer when turned off
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive]);

  const handleToggle = async () => {
    if (isPending) return;
    
    const newState = !isActive;
    setIsPending(true);
    
    // Optimistic UI update
    setIsActive(newState);
    
    const success = await onToggle(id, field, newState);
    
    if (!success) {
      // Revert on failure
      setIsActive(!newState);
    }
    
    setIsPending(false);
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
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
          disabled={isPending}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isActive ? 'bg-neon-cyan shadow-[0_0_10px_#00f0ff]' : 'bg-zinc-700'} ${isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          aria-pressed={isActive}
        >
          <span 
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${isActive ? 'translate-x-6' : 'translate-x-1'}`}
          />
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
          <div className="text-xs font-mono text-zinc-400">
            {isActive ? formatDuration(activeDuration) : '--:--'}
          </div>
        </div>
      </div>
      
    </div>
  );
}

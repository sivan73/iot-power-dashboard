import { LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

interface StatusCardProps {
  title: string;
  value: string | number;
  unit: string;
  icon: LucideIcon;
  status: 'safe' | 'warning' | 'danger';
  pulseOnChange?: boolean;
}

export function StatusCard({ title, value, unit, icon: Icon, status, pulseOnChange = false }: StatusCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (pulseOnChange) {
      setIsUpdating(true);
      const timer = setTimeout(() => setIsUpdating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [value, pulseOnChange]);

  // Determine neon accent based on status
  const glowClass = 
    status === 'safe' ? 'glow-cyan text-neon-cyan border-neon-cyan/30' : 
    status === 'danger' ? 'glow-red text-neon-red border-neon-red/30' : 
    'glow-amber text-neon-amber border-neon-amber/30';
  
  const textGlowClass = 
    status === 'safe' ? 'text-glow-cyan text-neon-cyan' : 
    status === 'danger' ? 'text-glow-red text-neon-red' : 
    'text-glow-amber text-neon-amber';

  const pulseClass = isUpdating ? 'scale-[1.02] brightness-125 transition-transform duration-150' : 'scale-100 transition-transform duration-300';

  return (
    <div className={`glass-panel rounded-xl p-6 flex flex-col justify-between items-start ${pulseClass} hover:border-white/20 relative overflow-hidden group`}>
      {/* Subtle top border glow based on status */}
      <div className={`absolute top-0 left-0 w-full h-1 ${glowClass} opacity-70 group-hover:opacity-100 transition-opacity`} />
      
      <div className="flex items-center justify-between w-full mb-4">
        <h3 className="text-zinc-400 text-xs font-semibold tracking-[0.2em] uppercase">{title}</h3>
        <div className={`p-2 rounded-lg bg-black/40 border border-white/5 ${textGlowClass}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      
      <div className="flex items-baseline space-x-1 mt-2">
        <span className={`text-4xl font-bold tracking-tight text-white`}>
          {typeof value === 'number' ? value.toFixed(1) : value}
        </span>
        <span className="text-zinc-500 text-base font-medium ml-1">{unit}</span>
      </div>
    </div>
  );
}

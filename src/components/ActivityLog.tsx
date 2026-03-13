import { Activity, Clock, ToggleRight } from 'lucide-react';

interface ActivityLogProps {
  runtime: string | number;
  toggleCount: number;
}

export function ActivityLog({ runtime, toggleCount }: ActivityLogProps) {
  return (
    <div className="glass-panel rounded-xl p-6 h-full flex flex-col hover:border-white/20 transition-colors">
      <div className="flex items-center mb-6">
        <Activity className="w-5 h-5 text-neon-cyan mr-2" />
        <h3 className="text-zinc-400 text-sm font-medium tracking-wider uppercase">System Activity Log</h3>
      </div>
      
      <div className="space-y-4">
        {/* Runtime Item */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-black/40 border border-zinc-800/50 hover:border-zinc-700 transition-colors">
          <div className="flex items-center space-x-4">
            <div className="p-2 rounded-md bg-zinc-900">
              <Clock className="w-4 h-4 text-zinc-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-300">Total Runtime</p>
              <p className="text-xs text-zinc-500">Duration since last restart</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono text-neon-green text-glow-green font-bold">{runtime}</p>
          </div>
        </div>

        {/* Toggle Count Item */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-black/40 border border-zinc-800/50 hover:border-zinc-700 transition-colors">
          <div className="flex items-center space-x-4">
            <div className="p-2 rounded-md bg-zinc-900">
              <ToggleRight className="w-4 h-4 text-zinc-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-300">Toggle Operations</p>
              <p className="text-xs text-zinc-500">Relay switch count</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono font-bold text-white">{toggleCount} <span className="text-zinc-500 text-xs font-sans">times</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}

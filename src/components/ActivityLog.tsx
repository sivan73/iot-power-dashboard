"use client";

import React, { useState } from 'react';
import { Activity, Clock, ToggleRight, BarChart2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import type { RelayStats, RelayEvent } from '@/hooks/useRelayActivity';

interface ActivityLogProps {
  runtime: string | number;
  toggleCount: number;
  relayActivity: {
    allStats: RelayStats[];
    clearActivity: () => void;
  };
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}h ${pad(m)}m ${pad(sec)}s`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// Mini bar chart component for on/off counts
function RelayBar({ stats, maxCount }: { stats: RelayStats; maxCount: number }) {
  const onPct = maxCount > 0 ? (stats.onCount / maxCount) * 100 : 0;
  const offPct = maxCount > 0 ? (stats.offCount / maxCount) * 100 : 0;
  const totalMs = stats.totalOnMs + (stats.lastOnAt ? Date.now() - stats.lastOnAt : 0);
  const shortName = stats.name.split(' ')[0]; // e.g. "Main"

  return (
    <div className="flex items-center gap-3 py-1.5 group hover:bg-white/3 rounded-lg px-2 transition-colors">
      <span className="text-zinc-400 text-xs font-mono w-16 truncate" title={stats.name}>{shortName}</span>
      <div className="flex-1 flex flex-col gap-0.5">
        {/* ON bar */}
        <div className="flex items-center gap-2">
          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-1.5 bg-neon-green rounded-full shadow-[0_0_4px_rgba(57,255,20,0.6)] transition-all duration-700"
              style={{ width: `${onPct}%` }}
            />
          </div>
          <span className="text-neon-green text-xs font-mono tabular-nums w-5 text-right">{stats.onCount}</span>
        </div>
        {/* OFF bar */}
        <div className="flex items-center gap-2">
          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-1.5 bg-zinc-500 rounded-full transition-all duration-700"
              style={{ width: `${offPct}%` }}
            />
          </div>
          <span className="text-zinc-500 text-xs font-mono tabular-nums w-5 text-right">{stats.offCount}</span>
        </div>
      </div>
      <span className="text-[10px] text-zinc-600 font-mono tabular-nums w-16 text-right">
        {formatDuration(totalMs)}
      </span>
    </div>
  );
}

export function ActivityLog({ runtime, toggleCount, relayActivity }: ActivityLogProps) {
  const { allStats, clearActivity } = relayActivity;
  const [showEvents, setShowEvents] = useState(false);

  const maxCount = allStats.length > 0
    ? Math.max(...allStats.flatMap(s => [s.onCount, s.offCount]), 1)
    : 1;

  // Collect all events, sorted newest first
  const allEvents: RelayEvent[] = allStats
    .flatMap(s => s.events)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 50);

  const totalOnCount = allStats.reduce((acc, s) => acc + s.onCount, 0);
  const totalOffCount = allStats.reduce((acc, s) => acc + s.offCount, 0);

  return (
    <div className="glass-panel rounded-xl p-6 h-full flex flex-col hover:border-white/20 transition-colors">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center">
          <Activity className="w-5 h-5 text-neon-cyan mr-2" />
          <h3 className="text-zinc-400 text-sm font-medium tracking-wider uppercase">System Activity Log</h3>
        </div>
        {allStats.length > 0 && (
          <button
            onClick={clearActivity}
            className="flex items-center gap-1 text-xs text-zinc-600 hover:text-neon-red transition-colors px-2 py-1 rounded hover:bg-neon-red/10"
          >
            <Trash2 size={11} /> Clear
          </button>
        )}
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-black/40 border border-zinc-800/50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3 h-3 text-zinc-500" />
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Runtime</span>
          </div>
          <div className="font-mono text-neon-green text-glow-green font-bold text-sm">{runtime}</div>
        </div>
        <div className="bg-black/40 border border-zinc-800/50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <ToggleRight className="w-3 h-3 text-zinc-500" />
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Total ON</span>
          </div>
          <div className="font-mono font-bold text-white text-sm">{totalOnCount} <span className="text-zinc-600 text-xs">times</span></div>
        </div>
        <div className="bg-black/40 border border-zinc-800/50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <BarChart2 className="w-3 h-3 text-zinc-500" />
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Total OFF</span>
          </div>
          <div className="font-mono font-bold text-white text-sm">{totalOffCount} <span className="text-zinc-600 text-xs">times</span></div>
        </div>
      </div>

      {/* Per-relay bar chart */}
      {allStats.length > 0 ? (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-mono">
              Relay Toggle Breakdown &nbsp;
              <span className="text-neon-green">█ ON</span>&nbsp;
              <span className="text-zinc-500">█ OFF</span>
            </span>
          </div>
          <div className="space-y-0 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
            {allStats.map(s => (
              <RelayBar key={s.pin} stats={s} maxCount={maxCount} />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-zinc-700 font-mono text-xs italic">
          No relay activity recorded yet. Toggle a relay to start tracking.
        </div>
      )}

      {/* Expandable Event Timeline */}
      {allEvents.length > 0 && (
        <div className="border-t border-white/5 pt-3 mt-auto">
          <button
            onClick={() => setShowEvents(p => !p)}
            className="flex items-center gap-2 text-xs text-zinc-600 hover:text-zinc-300 transition-colors w-full font-mono tracking-wider uppercase"
          >
            {showEvents ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Event Timeline ({allEvents.length})
          </button>

          {showEvents && (
            <div className="mt-3 max-h-40 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
              {allEvents.map((ev, i) => (
                <div key={i} className="flex items-center gap-3 text-xs py-1 border-b border-white/3 last:border-0">
                  <span className="text-zinc-600 font-mono tabular-nums">{formatTime(ev.timestamp)}</span>
                  <span
                    className={`w-8 text-center rounded-sm px-1 font-mono font-bold text-[10px] ${
                      ev.action === 'ON'
                        ? 'bg-neon-green/20 text-neon-green'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {ev.action}
                  </span>
                  <span className="text-zinc-300 flex-1">{ev.name}</span>
                  <span className="text-zinc-700 font-mono">{ev.pin}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

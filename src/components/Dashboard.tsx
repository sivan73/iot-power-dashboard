"use client";

import { Zap, Activity, BatteryCharging, ChevronRight, AlertTriangle, Clock, Power } from 'lucide-react';
import { useIoTData } from '../hooks/useIoTData';
import { useEnergyAnalytics } from '../hooks/useEnergyAnalytics';
import { StatusCard } from './StatusCard';
import { TelemetryChart } from './TelemetryChart';
import { ActivityLog } from './ActivityLog';

export function Dashboard() {
  const { data, loading: iotLoading, error: iotError } = useIoTData();
  const { analytics, loading: analyticsLoading, error: analyticsError } = useEnergyAnalytics();

  if (iotLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-[var(--background)]">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-2 border-white/10 border-t-neon-cyan rounded-full animate-spin glow-cyan mb-6"></div>
          <p className="text-neon-cyan text-glow-cyan font-mono uppercase tracking-[0.3em] text-sm">Initializing Telemetry...</p>
        </div>
      </div>
    );
  }

  if (iotError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-[var(--background)]">
        <div className="glass-panel border-neon-red/50 glow-red p-8 rounded-xl max-w-md w-full text-center">
          <Activity className="w-12 h-12 text-neon-red mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-wider">Telemetry Failure</h2>
          <p className="text-zinc-400 mb-6 text-sm">{iotError.message}</p>
          <div className="mt-4 p-3 bg-red-950/30 rounded-lg border border-red-500/20 text-xs text-red-200/70 font-mono text-left">
            ERR_CONNECTION_REFUSED<br />
            Check uplink database configuration.
          </div>
        </div>
      </div>
    );
  }

  // Determine status based on thresholds
  const getVoltageStatus = (v: number) => v > 240 ? 'danger' : v < 200 ? 'warning' : 'safe';
  const getCurrentStatus = (c: number) => c > 10 ? 'danger' : c > 7 ? 'warning' : 'safe';
  const getPowerStatus = (p: number) => p > 800 ? 'danger' : p > 700 ? 'warning' : 'safe';

  const isOverload = data.power > 800;

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-all duration-500 box-border ${isOverload
        ? 'border-[6px] md:border-[8px] border-neon-red shadow-[inset_0_0_120px_rgba(255,7,58,0.2)]'
        : 'border-[6px] md:border-[8px] border-transparent'
      }`}>
      {isOverload && (
        <div className="bg-red-950/90 border-b border-neon-red text-white px-4 py-3 w-full text-center font-bold tracking-[0.4em] uppercase animate-pulse flex items-center justify-center shadow-[0_0_30px_rgba(255,7,58,0.3)] z-50">
          <AlertTriangle className="w-5 h-5 mr-3 text-neon-red" />
          WARNING: OVERLOAD
        </div>
      )}
      <div className="flex-grow p-4 md:p-6 lg:p-8">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between border-b border-white/10 pb-6">
          <div className="flex items-center mb-4 md:mb-0">
            <div className={`w-12 h-12 rounded-full glass-panel flex items-center justify-center mr-4 ${isOverload ? 'glow-red border-neon-red/50' : 'glow-cyan border-neon-cyan/20'} transition-colors duration-300`}>
              <Zap className={`w-6 h-6 ${isOverload ? 'text-neon-red animate-ping' : 'text-neon-cyan'}`} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-[0.1em] uppercase flex items-center">
                Power <span className={`${isOverload ? 'text-neon-red text-glow-red' : 'text-neon-cyan text-glow-cyan'} transition-colors duration-300 ml-2`}>Monitor</span>
              </h1>
              <p className="text-zinc-500 text-xs mt-1 uppercase tracking-[0.3em] flex items-center">
                Global Energy Monitoring <ChevronRight className="w-3 h-3 ml-1" />
              </p>
            </div>
          </div>
          <div className="flex items-center">
            <div className={`flex items-center space-x-3 glass-panel px-5 py-2.5 rounded-full ${isOverload ? 'border-neon-red/30' : ''}`}>
              <div className={`w-2 h-2 rounded-full ${!data.isLive ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]' : isOverload ? 'bg-neon-red glow-red' : 'bg-neon-green glow-green'} animate-pulse`}></div>
              <span className={`text-xs font-mono tracking-wider ${!data.isLive ? 'text-amber-500/90' : isOverload ? 'text-neon-red' : 'text-zinc-300'}`}>
                {!data.isLive ? 'SIMULATED MODE' : isOverload ? 'SYSTEM OVERLOAD' : 'LIVE UPLINK'}
              </span>
              <span className="text-[10px] text-zinc-600 font-mono ml-2 border-l border-white/10 pl-3">Uplink: {data.isLive ? 'ACTIVE' : 'STABLE'}</span>
            </div>
          </div>
        </header>

        <main className="max-w-[1600px] mx-auto space-y-6">
          {/* Live Status Glass Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatusCard
              title="Grid Voltage"
              value={data.voltage}
              unit="V"
              icon={Activity}
              status={getVoltageStatus(data.voltage)}
              pulseOnChange={true} // Pulse on voltage updates
            />
            <StatusCard
              title="Phase Current"
              value={data.current}
              unit="A"
              icon={Zap}
              status={getCurrentStatus(data.current)}
            />
            <StatusCard
              title="Power"
              value={data.power}
              unit="W"
              icon={BatteryCharging}
              status={getPowerStatus(data.power)}
            />
          </div>

          {/* Telemetry Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TelemetryChart
              title="Voltage Output"
              currentValue={data.voltage}
              unit="V"
              colorHex="#00f0ff"
              glowClass="glow-cyan"
              yAxisMin={200}
              isLive={data.isLive}
            />
            <TelemetryChart
              title="Current Draw"
              currentValue={data.current}
              unit="A"
              colorHex="#39ff14"
              glowClass="glow-green"
              yAxisMin={0}
              isLive={data.isLive}
            />
            <TelemetryChart
              title="Instantaneous Power"
              currentValue={data.power}
              unit="W"
              colorHex={isOverload ? "#ff073a" : "#ffb000"}
              glowClass={isOverload ? "glow-red" : "glow-amber"}
              yAxisMin={0}
              isLive={data.isLive}
            />
            <div className="grid grid-cols-1 gap-6">
              <TelemetryChart
                title="Energy Consumed"
                currentValue={data.consumption}
                unit="Wh"
                colorHex="#ff073a"
                glowClass="glow-red"
                isLive={data.isLive}
              />
            </div>
          </div>

          {/* Usage Statistics & Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t border-white/5">
            <div className="lg:col-span-2">
              <ActivityLog runtime={analytics.formattedRuntime} toggleCount={analytics.toggleCount} />
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="glass-panel p-5 rounded-xl border border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-zinc-500 text-xs font-mono tracking-wider mb-1">ANALYTICS / RUNTIME</h3>
                  <div className="text-2xl font-bold text-white tracking-widest">{analyticsLoading ? '...' : analytics.formattedRuntime}</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center glow-cyan">
                  <Clock className="w-5 h-5 text-neon-cyan" />
                </div>
              </div>
              <div className="glass-panel p-5 rounded-xl border border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-zinc-500 text-xs font-mono tracking-wider mb-1">ANALYTICS / TOGGLES</h3>
                  <div className="text-2xl font-bold text-white tracking-widest">{analyticsLoading ? '...' : analytics.toggleCount}</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-neon-amber/10 border border-neon-amber/20 flex items-center justify-center glow-amber">
                  <Power className="w-5 h-5 text-neon-amber" />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

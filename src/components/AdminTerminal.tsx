"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useLogger } from '@/hooks/useLogger';
import { Download, Trash2, Terminal as TerminalIcon, X, Maximize2, Minimize2 } from 'lucide-react';

export function AdminTerminal() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { logs, clearLogs, thingSpeakStatus, blynkStatus, lastDataReceivedAt } = useLogger();
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Esp32 active if data received in the last 30 seconds
  const isEsp32Active = lastDataReceivedAt ? (Date.now() - lastDataReceivedAt < 30000) : false;

  // Global hotkey listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyA') {
        e.preventDefault();
        setIsExpanded(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-scroll to bottom of logs when new logs arrive
  useEffect(() => {
    if (isExpanded && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isExpanded]);

  const handleDownload = () => {
    const blob = new Blob([logs.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iot_admin_logs_${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isExpanded) {
    return (
      <button 
        onDoubleClick={() => setIsExpanded(true)}
        className="fixed bottom-4 left-4 z-50 group flex items-center space-x-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-[#00FF41]/20 hover:border-[#00FF41]/50 transition-all duration-500 shadow-lg hover:shadow-[0_0_15px_rgba(0,255,65,0.2)] active:scale-95 group overflow-hidden"
        title="Double-click or press Ctrl+Shift+A to open Admin Terminal"
      >
        <div className="absolute inset-0 bg-[#00FF41]/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
        <div className="relative flex items-center space-x-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00FF41] animate-pulse shadow-[0_0_8px_#00FF41]" />
          <span className="text-[9px] font-mono text-[#00FF41]/50 group-hover:text-[#00FF41] tracking-[0.2em] uppercase font-bold transition-colors">
            Dev_Console
          </span>
          <TerminalIcon size={10} className="text-[#00FF41]/40 group-hover:text-[#00FF41] transition-colors" />
        </div>
      </button>
    );
  }

  return (
    <div className={`fixed left-0 w-full z-50 bg-black/95 backdrop-blur-md border-t border-[#00FF41]/40 shadow-[0_0_15px_rgba(0,255,65,0.2)] flex flex-col font-mono text-[#00FF41] transition-all duration-300 ease-in-out ${isFullscreen ? 'top-0 h-screen' : 'bottom-0 h-80'}`}>
      
      {/* Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-0 mix-blend-overlay opacity-30" />

      {/* Terminal Header */}
      <div className="relative z-10 flex items-center justify-between px-4 py-2 border-b border-[#00FF41]/20 bg-[#00FF41]/5">
        <div className="flex items-center space-x-6 text-xs drop-shadow-[0_0_5px_#00FF41]">
          <div className="flex items-center text-white/90 font-bold uppercase tracking-widest">
            <TerminalIcon size={14} className="mr-2 text-[#00FF41]" />
            Admin Terminal
          </div>
          <div className="h-4 w-px bg-[#00FF41]/30 mx-2" />
          
          {/* Status Indicators */}
          <div className="flex space-x-4">
            <span className="flex items-center">
              THINGSPEAK: 
              <span className={`ml-1 ${thingSpeakStatus === 'ONLINE' ? 'text-[#00FF41]' : 'text-red-500'} animate-pulse`}>
                [{thingSpeakStatus}]
              </span>
            </span>
            <span className="flex items-center">
              BLYNK CLOUD: 
              <span className={`ml-1 ${blynkStatus === 'CONNECTED' ? 'text-[#00FF41]' : 'text-red-500'} animate-pulse`}>
                [{blynkStatus}]
              </span>
            </span>
            <span className="flex items-center">
              ESP32 NODE: 
              <span className={`ml-1 ${isEsp32Active ? 'text-[#00FF41]' : 'text-zinc-500'} animate-pulse`}>
                [{isEsp32Active ? 'ACTIVE' : 'INACTIVE'}]
              </span>
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3 text-xs">
          <button 
            onClick={clearLogs}
            className="flex items-center px-2 py-1 hover:bg-[#00FF41]/20 rounded transition-colors"
          >
            <Trash2 size={12} className="mr-1" /> Clear
          </button>
          <button 
            onClick={handleDownload}
            className="flex items-center px-2 py-1 hover:bg-[#00FF41]/20 rounded transition-colors"
          >
            <Download size={12} className="mr-1" /> Export
          </button>
          <div className="h-4 w-px bg-[#00FF41]/30 mx-1" />
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 hover:bg-[#00FF41]/20 rounded transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button 
            onClick={() => setIsExpanded(false)}
            className="p-1 hover:bg-red-500/20 text-red-500 rounded transition-colors ml-1"
            title="Close Terminal"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Logs Output */}
      <div className="relative z-10 flex-grow p-4 overflow-y-auto text-xs sm:text-sm whitespace-pre-wrap">
        {logs.length === 0 ? (
          <div className="text-[#00FF41]/50 italic">System ready. Waiting for events...</div>
        ) : (
          logs.map((log, index) => {
            // Apply specific coloring based on log content
            let colorClass = 'text-[#00FF41]';
            if (log.includes('CRITICAL:')) colorClass = 'text-red-500 drop-shadow-[0_0_3px_rgba(239,68,68,0.8)]';
            if (log.includes('SUCCESS:')) colorClass = 'text-[#00FF41] font-bold drop-shadow-[0_0_3px_rgba(0,255,65,0.8)]';
            if (log.includes('COMMAND:')) colorClass = 'text-cyan-400 drop-shadow-[0_0_3px_rgba(34,211,238,0.8)]';
            if (log.includes('FETCH:')) colorClass = 'text-zinc-400';

            return (
              <div key={index} className={`mb-1 ${colorClass} opacity-90 hover:opacity-100 hover:bg-white/5`}>
                {log}
              </div>
            );
          })
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}

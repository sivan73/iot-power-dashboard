"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ServiceStatus = 'ONLINE' | 'OFFLINE' | 'CONNECTED' | 'DISCONNECTED' | 'ACTIVE' | 'INACTIVE' | 'UNKNOWN';

interface LoggerContextType {
  logs: string[];
  addLog: (msg: string) => void;
  clearLogs: () => void;
  thingSpeakStatus: ServiceStatus;
  setThingSpeakStatus: (status: ServiceStatus) => void;
  blynkStatus: ServiceStatus;
  setBlynkStatus: (status: ServiceStatus) => void;
  lastDataReceivedAt: number | null;
  setLastDataReceivedAt: (time: number | null) => void;
}

const LoggerContext = createContext<LoggerContextType | undefined>(undefined);

export function LoggerProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<string[]>([]);
  const [thingSpeakStatus, setThingSpeakStatus] = useState<ServiceStatus>('UNKNOWN');
  const [blynkStatus, setBlynkStatus] = useState<ServiceStatus>('UNKNOWN');
  const [lastDataReceivedAt, setLastDataReceivedAt] = useState<number | null>(null);

  const addLog = useCallback((msg: string) => {
    setLogs((prev) => {
      const newLogs = [...prev, msg];
      if (newLogs.length > 100) {
        return newLogs.slice(newLogs.length - 100);
      }
      return newLogs;
    });
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return (
    <LoggerContext.Provider
      value={{
        logs,
        addLog,
        clearLogs,
        thingSpeakStatus,
        setThingSpeakStatus,
        blynkStatus,
        setBlynkStatus,
        lastDataReceivedAt,
        setLastDataReceivedAt,
      }}
    >
      {children}
    </LoggerContext.Provider>
  );
}

export function useLogger() {
  const context = useContext(LoggerContext);
  if (context === undefined) {
    throw new Error('useLogger must be used within a LoggerProvider');
  }
  return context;
}

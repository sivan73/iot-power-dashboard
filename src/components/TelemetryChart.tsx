"use client";

import { useEffect, useState, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

interface TelemetryChartProps {
  title: string;
  currentValue: number;
  dataPoints: number[];
  labels: string[];
  colorHex: string;
  glowClass: string;
  unit: string;
  yAxisMin?: number;
  isLive?: boolean;
  isStale?: boolean;
}

export function TelemetryChart({ title, currentValue, dataPoints, labels, colorHex, glowClass, unit, yAxisMin, isLive = true, isStale = false }: TelemetryChartProps) {

  const data = {
    labels,
    datasets: [
      {
        fill: true,
        label: `${title} (${unit})`,
        data: dataPoints,
        borderColor: colorHex,
        backgroundColor: `${colorHex}15`, // append low opacity hex
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointBackgroundColor: colorHex,
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: colorHex,
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 15000,
      easing: 'linear' as const,
    },
    scales: {
      y: {
        min: yAxisMin,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.4)',
          font: {
            family: 'monospace',
            size: 10,
          }
        },
        border: { display: false }
      },
      x: {
        grid: { display: false },
        ticks: {
          color: 'rgba(255, 255, 255, 0.4)',
          maxRotation: 0,
          maxTicksLimit: 4,
          font: {
            family: 'monospace',
            size: 10,
          }
        },
        border: { display: false }
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 15, 20, 0.9)',
        titleColor: '#fff',
        bodyColor: colorHex,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        callbacks: {
          label: function(context: any) {
            return `${context.parsed.y.toFixed(1)} ${unit}`;
          }
        }
      },
    },
  };

  return (
    <div className="glass-panel rounded-xl p-5 h-[280px] flex flex-col group transition-colors hover:border-white/20 relative overflow-hidden">
      {!isLive && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
          <span className="text-white/5 text-4xl font-bold tracking-[0.5em] uppercase -rotate-12 border-4 border-white/5 px-8 py-4">
            Simulated Data
          </span>
        </div>
      )}
      {isStale && isLive && (
        <div className="absolute top-2 right-2 z-20 bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[10px] font-mono px-2 py-1 rounded shadow-sm backdrop-blur-sm animate-pulse">
          Data Stale - Waiting for Hardware
        </div>
      )}
      <h3 className="text-zinc-400 text-xs font-semibold tracking-[0.2em] uppercase mb-4 flex items-center justify-between relative z-10">
        <div className="flex items-center">
          <span className={`w-2 h-2 rounded-full ${glowClass} animate-pulse mr-2 bg-[${colorHex}]`} style={{ backgroundColor: colorHex }}></span>
          {title}
        </div>
        <span className="font-mono text-white text-sm">{currentValue.toFixed(1)} {unit}</span>
      </h3>
      <div className="flex-grow w-full relative z-10">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}


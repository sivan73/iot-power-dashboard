"use client";

import { useEffect, useState } from 'react';
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
  colorHex: string;
  glowClass: string;
  unit: string;
  yAxisMin?: number;
}

export function TelemetryChart({ title, currentValue, colorHex, glowClass, unit, yAxisMin }: TelemetryChartProps) {
  const [dataPoints, setDataPoints] = useState<number[]>(Array(20).fill(currentValue || 0));
  const [labels, setLabels] = useState<string[]>(Array(20).fill(''));

  // Update chart data when currentValue changes
  useEffect(() => {
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    setDataPoints(prev => {
      // Handle the initial zero-fill state by setting everything to current value on first valid read
      if (prev[19] === 0 && currentValue > 0) {
        return Array(20).fill(currentValue);
      }
      return [...prev.slice(1), currentValue];
    });
    
    setLabels(prev => {
      const newLabels = [...prev.slice(1), time];
      return newLabels;
    });
  }, [currentValue]);

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
        tension: 0.3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 300,
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
    <div className="glass-panel rounded-xl p-5 h-[280px] flex flex-col group transition-colors hover:border-white/20">
      <h3 className="text-zinc-400 text-xs font-semibold tracking-[0.2em] uppercase mb-4 flex items-center justify-between">
        <div className="flex items-center">
          <span className={`w-2 h-2 rounded-full ${glowClass} animate-pulse mr-2 bg-[${colorHex}]`} style={{ backgroundColor: colorHex }}></span>
          {title}
        </div>
        <span className="font-mono text-white text-sm">{currentValue.toFixed(1)} {unit}</span>
      </h3>
      <div className="flex-grow w-full relative">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}

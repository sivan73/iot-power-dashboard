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
  colorHex: string;
  glowClass: string;
  unit: string;
  yAxisMin?: number;
  isLive?: boolean;
}

export function TelemetryChart({ title, currentValue, colorHex, glowClass, unit, yAxisMin, isLive = true }: TelemetryChartProps) {
  const [dataPoints, setDataPoints] = useState<number[]>(Array(50).fill(currentValue || 0));
  const [labels, setLabels] = useState<string[]>(Array(50).fill(''));
  const [displayValue, setDisplayValue] = useState(currentValue);
  
  // Refs for animation loop
  const prevValueRef = useRef(currentValue);
  const targetValueRef = useRef(currentValue);
  const animationStartTimeRef = useRef<number | null>(null);
  const requestRef = useRef<number | undefined>(undefined);
  
  // Configuration
  const ANIMATION_DURATION = 2000; // 2 seconds

  const animate = (time: DOMHighResTimeStamp) => {
    if (animationStartTimeRef.current === null) {
      animationStartTimeRef.current = time;
    }
    
    const elapsed = time - animationStartTimeRef.current;
    let progress = Math.min(elapsed / ANIMATION_DURATION, 1);
    
    // Smooth easing function (easeOutQuad)
    progress = 1 - (1 - progress) * (1 - progress);
    
    const start = prevValueRef.current;
    const end = targetValueRef.current;
    const currentInterpolated = start + (end - start) * progress;
    
    setDisplayValue(currentInterpolated);
    
    // Periodically update the chart arrays to "draw" the connection
    // For 50 points, we update every few samples to bridge the 15s gap
    if (elapsed % 300 < 20) {
      const timeStr = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      setDataPoints(prev => {
        if (prev.length > 0 && prev[49] === 0 && currentInterpolated > 0) {
          return Array(50).fill(currentInterpolated);
        }
        return [...prev.slice(1), currentInterpolated];
      });
      
      setLabels(prev => {
        return [...prev.slice(1), timeStr];
      });
    }

    if (progress < 1) {
      requestRef.current = requestAnimationFrame((t) => animate(t));
    } else {
      // Animation complete
      prevValueRef.current = end;
      animationStartTimeRef.current = null;
    }
  };

  useEffect(() => {
    // When a new prop comes in, set the new target and restart animation
    targetValueRef.current = currentValue;
    animationStartTimeRef.current = null; // reset timer
    
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    
    const tick = (time: DOMHighResTimeStamp) => {
       animate(time);
    };
    
    requestRef.current = requestAnimationFrame(tick);
    
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
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
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 2000,
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
      <h3 className="text-zinc-400 text-xs font-semibold tracking-[0.2em] uppercase mb-4 flex items-center justify-between relative z-10">
        <div className="flex items-center">
          <span className={`w-2 h-2 rounded-full ${glowClass} animate-pulse mr-2 bg-[${colorHex}]`} style={{ backgroundColor: colorHex }}></span>
          {title}
        </div>
        <span className="font-mono text-white text-sm">{displayValue.toFixed(1)} {unit}</span>
      </h3>
      <div className="flex-grow w-full relative z-10">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}


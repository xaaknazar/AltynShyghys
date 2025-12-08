'use client';

import { formatNumber, TARGETS } from '@/lib/utils';

interface SpeedIndicatorProps {
  currentSpeed: number;
  status: 'normal' | 'warning' | 'danger';
  lastUpdate: string;
}

export default function SpeedIndicator({ currentSpeed, status, lastUpdate }: SpeedIndicatorProps) {
  const percentage = (currentSpeed / TARGETS.hourly) * 100;
  
  const statusConfig = {
    normal: {
      color: 'text-industrial-success',
      glow: 'shadow-[0_0_30px_rgba(0,255,136,0.4)]',
      gradient: 'from-industrial-success/20 to-transparent',
    },
    warning: {
      color: 'text-industrial-warning',
      glow: 'shadow-[0_0_30px_rgba(255,184,0,0.4)]',
      gradient: 'from-industrial-warning/20 to-transparent',
    },
    danger: {
      color: 'text-industrial-danger',
      glow: 'shadow-[0_0_30px_rgba(255,51,102,0.4)]',
      gradient: 'from-industrial-danger/20 to-transparent',
    },
  };

  const config = statusConfig[status];

  return (
    <div className="relative">
      <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} blur-3xl opacity-50`} />
      
      <div className="relative bg-industrial-darker/80 backdrop-blur-sm rounded-2xl border border-industrial-blue/30 p-8 md:p-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg md:text-xl font-display text-gray-400 tracking-wider">
            ТЕКУЩАЯ ПОДАЧА
          </h2>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${config.color} animate-pulse`} />
            <span className="text-sm text-gray-500 font-mono">
              {new Date(lastUpdate).toLocaleTimeString('ru-RU', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
        </div>

        <div className="mb-8">
          <div className={`text-6xl md:text-8xl font-display font-bold ${config.color} ${config.glow} glow-pulse`}>
            {formatNumber(currentSpeed, 1)}
            <span className="text-3xl md:text-5xl ml-2 text-gray-500">т/ч</span>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400 font-mono">
              Норма: {TARGETS.hourly} т/ч
            </span>
            <span className={`text-sm font-mono font-bold ${config.color}`}>
              {formatNumber(percentage, 0)}%
            </span>
          </div>
          <div className="h-3 bg-industrial-dark rounded-full overflow-hidden border border-industrial-blue/30">
            <div
              className={`h-full bg-gradient-to-r ${config.color.replace('text-', 'from-')} to-transparent transition-all duration-1000 ease-out`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-industrial-dark/50 rounded-lg p-3 border border-industrial-blue/20">
            <div className="text-xs text-gray-500 mb-1">Норма</div>
            <div className="text-lg font-mono text-industrial-success">
              ≥{TARGETS.hourly * 0.9}
            </div>
          </div>
          <div className="bg-industrial-dark/50 rounded-lg p-3 border border-industrial-blue/20">
            <div className="text-xs text-gray-500 mb-1">Предупр.</div>
            <div className="text-lg font-mono text-industrial-warning">
              {TARGETS.hourly * 0.8}-{TARGETS.hourly * 0.9}
            </div>
          </div>
          <div className="bg-industrial-dark/50 rounded-lg p-3 border border-industrial-blue/20">
            <div className="text-xs text-gray-500 mb-1">Критич.</div>
            <div className="text-lg font-mono text-industrial-danger">
              &lt;{TARGETS.hourly * 0.8}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
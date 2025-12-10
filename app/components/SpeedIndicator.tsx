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
      glow: 'shadow-[0_0_20px_rgba(0,255,136,0.3)]',
      gradient: 'from-industrial-success/20 to-transparent',
    },
    warning: {
      color: 'text-industrial-warning',
      glow: 'shadow-[0_0_20px_rgba(255,184,0,0.3)]',
      gradient: 'from-industrial-warning/20 to-transparent',
    },
    danger: {
      color: 'text-industrial-danger',
      glow: 'shadow-[0_0_20px_rgba(255,51,102,0.3)]',
      gradient: 'from-industrial-danger/20 to-transparent',
    },
  };

  const config = statusConfig[status];

  return (
    <div className="relative">
      <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} blur-2xl opacity-40`} />

      <div className="relative bg-industrial-darker/80 backdrop-blur-sm rounded-xl border border-industrial-blue/30 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-display text-gray-400 tracking-wider">
            ТЕКУЩАЯ ПОДАЧА
          </h2>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${config.color} animate-pulse`} />
            <span className="text-xs text-gray-500 font-mono">
              {new Date(lastUpdate).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className={`text-4xl font-display font-bold ${config.color} ${config.glow}`}>
              {formatNumber(currentSpeed, 1)}
              <span className="text-xl ml-2 text-gray-500">т/ч</span>
            </div>
            <div className="text-xs text-gray-400 font-mono mt-1">
              Норма: {TARGETS.hourly} т/ч
            </div>
          </div>

          <div className="flex-1 max-w-xs">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-400 font-mono">Выполнение</span>
              <span className={`text-sm font-mono font-bold ${config.color}`}>
                {formatNumber(percentage, 0)}%
              </span>
            </div>
            <div className="h-2 bg-industrial-dark rounded-full overflow-hidden border border-industrial-blue/30">
              <div
                className={`h-full bg-gradient-to-r ${config.color.replace('text-', 'from-')} to-transparent transition-all duration-1000 ease-out`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
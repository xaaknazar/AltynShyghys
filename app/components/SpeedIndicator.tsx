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
      <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} blur-3xl opacity-30`} />

      <div className="relative bg-gradient-to-br from-industrial-darker/95 to-industrial-dark/90 backdrop-blur-sm rounded-2xl border-2 border-industrial-blue/30 p-8">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-display text-gray-400 tracking-wider">
            ТЕКУЩАЯ ПОДАЧА
          </h2>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${config.color} animate-pulse ${config.glow}`} />
            <span className="text-xs text-gray-400 font-mono">
              {new Date(lastUpdate).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>

        {/* Основное значение - центрировано */}
        <div className="text-center mb-6">
          <div className={`text-7xl font-display font-bold ${config.color} ${config.glow} inline-block`}>
            {formatNumber(currentSpeed, 1)}
          </div>
          <span className="text-3xl ml-3 text-gray-500 font-display">т/ч</span>
          <div className="text-sm text-gray-400 font-mono mt-3">
            Норма: {TARGETS.hourly} т/ч • Выполнение: <span className={`font-bold ${config.color}`}>{formatNumber(percentage, 0)}%</span>
          </div>
        </div>

        {/* Прогресс-бар */}
        <div className="relative">
          <div className="h-4 bg-industrial-dark rounded-full overflow-hidden border-2 border-industrial-blue/40 shadow-inner">
            <div
              className={`h-full transition-all duration-1000 ease-out ${
                status === 'normal' ? 'bg-gradient-to-r from-industrial-success to-green-400' :
                status === 'warning' ? 'bg-gradient-to-r from-industrial-warning to-yellow-400' :
                'bg-gradient-to-r from-industrial-danger to-red-400'
              }`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            >
              <div className="h-full w-full opacity-50 bg-gradient-to-r from-transparent via-white to-transparent animate-pulse" />
            </div>
          </div>

          {/* Маркер нормы на прогресс-баре */}
          <div className="absolute top-0 h-6 w-0.5 bg-gray-400 -mt-1" style={{ left: '100%' }}>
            <div className="absolute -top-1 -left-2 w-5 h-5 border-2 border-gray-400 rounded-full bg-industrial-dark" />
          </div>
        </div>
      </div>
    </div>
  );
}
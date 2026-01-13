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

  const statusColors = {
    normal: {
      text: 'text-emerald-500',
      bg: 'bg-emerald-50',
      gradient: 'bg-gradient-to-r from-emerald-500 to-green-400'
    },
    warning: {
      text: 'text-amber-500',
      bg: 'bg-amber-50',
      gradient: 'bg-gradient-to-r from-amber-500 to-yellow-400'
    },
    danger: {
      text: 'text-rose-500',
      bg: 'bg-rose-50',
      gradient: 'bg-gradient-to-r from-rose-500 to-red-400'
    }
  };

  const colors = statusColors[status];

  return (
    <div className="relative">
      <div className="relative bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 md:p-8 shadow-sm">
        {/* Заголовок */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-4 sm:mb-6">
          <h2 className="text-sm sm:text-base md:text-lg font-display text-slate-700 tracking-wider">
            ТЕКУЩАЯ ПОДАЧА
          </h2>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${colors.text.replace('text-', 'bg-')} animate-pulse`} />
            <span className="text-xs text-slate-600 font-mono">
              {new Date(lastUpdate).toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </span>
          </div>
        </div>

        {/* Основное значение - центрировано */}
        <div className="text-center mb-4 sm:mb-6">
          <div className="whitespace-nowrap">
            <span className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold ${colors.text}`}>
              {formatNumber(currentSpeed, 1)}
            </span>
            <span className="text-xl sm:text-2xl md:text-3xl ml-2 sm:ml-3 text-slate-500 font-display">т/ч</span>
          </div>
          <div className="text-xs sm:text-sm text-slate-600 font-mono mt-2 sm:mt-3">
            <span className="block sm:inline whitespace-nowrap">Норма: {TARGETS.hourly} т/ч</span>
            <span className="hidden sm:inline"> • </span>
            <span className="block sm:inline">Выполнение: <span className={`font-bold ${colors.text}`}>{formatNumber(percentage, 0)}%</span></span>
          </div>
        </div>

        {/* Прогресс-бар */}
        <div className="relative">
          <div className="h-3 sm:h-4 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
            <div
              className={`h-full transition-all duration-1000 ease-out ${colors.gradient}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            >
              <div className="h-full w-full opacity-30 bg-gradient-to-r from-transparent via-white to-transparent animate-pulse" />
            </div>
          </div>

          {/* Маркер нормы на прогресс-баре */}
          <div className="absolute top-0 h-5 sm:h-6 w-0.5 bg-slate-400 -mt-1" style={{ left: '100%' }}>
            <div className="absolute -top-1 -left-1.5 sm:-left-2 w-4 h-4 sm:w-5 sm:h-5 border-2 border-slate-400 rounded-full bg-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
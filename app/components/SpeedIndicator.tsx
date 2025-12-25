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
      <div className="relative bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-display text-slate-700 tracking-wider">
            ТЕКУЩАЯ ПОДАЧА
          </h2>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${colors.text.replace('text-', 'bg-')} animate-pulse`} />
            <span className="text-xs text-slate-600 font-mono">
              {new Date(lastUpdate).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>

        {/* Основное значение - центрировано */}
        <div className="text-center mb-6">
          <div className={`text-7xl font-display font-bold ${colors.text} inline-block`}>
            {formatNumber(currentSpeed, 1)}
          </div>
          <span className="text-3xl ml-3 text-slate-500 font-display">т/ч</span>
          <div className="text-sm text-slate-600 font-mono mt-3">
            Норма: {TARGETS.hourly} т/ч • Выполнение: <span className={`font-bold ${colors.text}`}>{formatNumber(percentage, 0)}%</span>
          </div>
        </div>

        {/* Прогресс-бар */}
        <div className="relative">
          <div className="h-4 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
            <div
              className={`h-full transition-all duration-1000 ease-out ${colors.gradient}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            >
              <div className="h-full w-full opacity-30 bg-gradient-to-r from-transparent via-white to-transparent animate-pulse" />
            </div>
          </div>

          {/* Маркер нормы на прогресс-баре */}
          <div className="absolute top-0 h-6 w-0.5 bg-slate-400 -mt-1" style={{ left: '100%' }}>
            <div className="absolute -top-1 -left-2 w-5 h-5 border-2 border-slate-400 rounded-full bg-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
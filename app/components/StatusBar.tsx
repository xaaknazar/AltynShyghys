'use client';

/**
 * StatusBar - индикатор статуса производства в верхней части экрана
 * Отображает текущее состояние: OK / WARNING / CRITICAL
 */

interface StatusBarProps {
  status: 'ok' | 'warning' | 'critical';
  deviation: number; // отклонение от плана в тоннах
  deviationPercent: number; // отклонение от плана в %
  lastUpdate: Date;
}

export default function StatusBar({
  status,
  deviation,
  deviationPercent,
  lastUpdate
}: StatusBarProps) {
  const statusConfig = {
    ok: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      label: 'НОРМА',
      icon: '✓'
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      label: 'ВНИМАНИЕ',
      icon: '⚠'
    },
    critical: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      label: 'КРИТИЧНО',
      icon: '✕'
    }
  };

  const config = statusConfig[status];
  const isPositive = deviation >= 0;

  return (
    <div className={`${config.bg} border-b-2 ${config.border}`}>
      <div className="container mx-auto px-4 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          {/* Статус */}
          <div className="flex items-center gap-4">
            <div className={`${config.text} text-2xl font-bold w-10 h-10 flex items-center justify-center`}>
              {config.icon}
            </div>
            <div>
              <div className={`${config.text} text-sm font-semibold tracking-wider uppercase`}>
                {config.label}
              </div>
              <div className="text-xs text-slate-600 font-mono mt-0.5">
                Статус производства
              </div>
            </div>
          </div>

          {/* Отклонение от плана */}
          <div className="flex items-center gap-6">
            <div>
              <div className="text-xs text-slate-600 uppercase tracking-wider font-semibold mb-1">
                Отклонение от плана
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold tabular-nums ${
                  isPositive ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {isPositive ? '+' : ''}{deviation.toFixed(1)}
                </span>
                <span className="text-sm text-slate-600">т</span>
                <span className={`text-lg font-semibold tabular-nums ml-2 ${
                  isPositive ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  ({isPositive ? '+' : ''}{deviationPercent.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Время обновления */}
          <div className="ml-auto">
            <div className="text-xs text-slate-600 uppercase tracking-wider font-semibold mb-1">
              Обновлено
            </div>
            <div className="text-sm font-mono text-slate-700">
              {lastUpdate.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

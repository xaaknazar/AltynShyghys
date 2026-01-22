'use client';

/**
 * KPIMetricCard - минималистичная карточка для отображения ключевой метрики
 * Enterprise/FinTech стиль с фокусом на данные
 */

interface KPIMetricCardProps {
  label: string;
  value: number;
  unit: string;
  trend?: 'up' | 'down' | 'neutral';
  target?: number;
  format?: 'decimal' | 'integer';
  status?: 'normal' | 'warning' | 'critical';
}

export default function KPIMetricCard({
  label,
  value,
  unit,
  trend,
  target,
  format = 'decimal',
  status = 'normal'
}: KPIMetricCardProps) {
  const formattedValue = format === 'integer'
    ? value.toFixed(0)
    : value.toFixed(1);

  const statusColors = {
    normal: 'border-slate-200',
    warning: 'border-amber-300 bg-amber-50/30',
    critical: 'border-red-300 bg-red-50/30'
  };

  const trendIcons = {
    up: '↑',
    down: '↓',
    neutral: '→'
  };

  const trendColors = {
    up: 'text-emerald-600',
    down: 'text-red-600',
    neutral: 'text-slate-500'
  };

  // Вычисляем процент выполнения плана
  const completion = target ? (value / target) * 100 : null;

  return (
    <div className={`bg-white border-2 ${statusColors[status]} rounded-lg p-5 transition-all hover:shadow-md`}>
      {/* Заголовок */}
      <div className="text-xs uppercase tracking-wider font-semibold text-slate-600 mb-3">
        {label}
      </div>

      {/* Значение */}
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-4xl font-bold tabular-nums text-slate-900">
          {formattedValue}
        </span>
        <span className="text-lg text-slate-600 font-medium">
          {unit}
        </span>
        {trend && (
          <span className={`text-2xl ml-2 ${trendColors[trend]}`}>
            {trendIcons[trend]}
          </span>
        )}
      </div>

      {/* Целевое значение и процент */}
      {target && completion !== null && (
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className="text-xs text-slate-500 font-mono">
            План: {target.toFixed(0)} {unit}
          </span>
          <span className={`text-sm font-semibold tabular-nums ${
            completion >= 100 ? 'text-emerald-600' :
            completion >= 80 ? 'text-amber-600' :
            'text-red-600'
          }`}>
            {completion.toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  );
}

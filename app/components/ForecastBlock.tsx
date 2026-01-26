'use client';

/**
 * ForecastBlock - прогноз производства до конца суток
 * Визуальный акцент на разнице с планом
 */

interface ForecastBlockProps {
  forecast: number; // прогноз производства до конца суток, т
  plan: number; // плановое значение, т
  confidence: 'high' | 'medium' | 'low'; // уверенность прогноза
  hoursRemaining: number; // часов до конца суток
}

export default function ForecastBlock({
  forecast,
  plan,
  confidence,
  hoursRemaining
}: ForecastBlockProps) {
  const difference = forecast - plan;
  const differencePercent = (difference / plan) * 100;
  const isPositive = difference >= 0;

  const confidenceConfig = {
    high: { label: 'Высокая', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    medium: { label: 'Средняя', color: 'text-amber-600', bg: 'bg-amber-50' },
    low: { label: 'Низкая', color: 'text-red-600', bg: 'bg-red-50' }
  };

  const conf = confidenceConfig[confidence];

  return (
    <div className="bg-white border-2 border-slate-200 rounded-lg p-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm uppercase tracking-wider font-semibold text-slate-700">
          Прогноз до конца суток
        </h3>
      </div>

      {/* Основные цифры */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Прогноз */}
        <div>
          <div className="text-xs text-slate-600 uppercase tracking-wider font-semibold mb-2">
            Прогноз
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums text-slate-900">
              {forecast.toFixed(0)}
            </span>
            <span className="text-sm text-slate-600">т</span>
          </div>
        </div>

        {/* План */}
        <div>
          <div className="text-xs text-slate-600 uppercase tracking-wider font-semibold mb-2">
            План
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums text-slate-700">
              {plan.toFixed(0)}
            </span>
            <span className="text-sm text-slate-600">т</span>
          </div>
        </div>
      </div>

      {/* Разница с планом - визуальный акцент */}
      <div className={`${isPositive ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'} border-2 rounded-lg p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-slate-600 mb-1">
              Отклонение от плана
            </div>
            <div className="flex items-baseline gap-3">
              <span className={`text-2xl font-bold tabular-nums ${
                isPositive ? 'text-emerald-700' : 'text-red-700'
              }`}>
                {isPositive ? '+' : ''}{difference.toFixed(0)} т
              </span>
              <span className={`text-xl font-semibold tabular-nums ${
                isPositive ? 'text-emerald-600' : 'text-red-600'
              }`}>
                ({isPositive ? '+' : ''}{differencePercent.toFixed(1)}%)
              </span>
            </div>
          </div>
          <div className={`text-4xl ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
            {isPositive ? '↑' : '↓'}
          </div>
        </div>
      </div>

      {/* Дополнительная информация */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
        <span>До конца суток: {hoursRemaining}ч</span>
        <span className="font-mono">
          Требуется: {((plan - (forecast - difference)) / hoursRemaining).toFixed(1)} т/ч
        </span>
      </div>
    </div>
  );
}

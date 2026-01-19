'use client';

import { ThirtyMinuteData, TARGETS, formatNumber } from '@/lib/utils';

interface CurrentDayChartProps {
  data: ThirtyMinuteData[];
}

export default function CurrentDayChart({ data }: CurrentDayChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-display text-slate-700 tracking-wider mb-6">
          ГРАФИК ТЕКУЩИХ СУТОК (30-МИНУТНЫЕ ИНТЕРВАЛЫ)
        </h3>
        <div className="text-center text-gray-500 py-8">
          Нет данных за текущие сутки
        </div>
      </div>
    );
  }

  // Находим максимальное значение для нормализации высоты
  const speeds = data.map((d) => d.averageSpeed);
  const maxSpeed = Math.max(...speeds, TARGETS.hourly * 1.2);

  // Вычисляем позиции точек
  const points = data.map((interval, index) => {
    const x = (index / (data.length - 1 || 1)) * 100; // процент от ширины
    const y = 100 - ((interval.averageSpeed / maxSpeed) * 100); // процент от высоты (инвертированный)
    const isAboveNorm = interval.averageSpeed >= TARGETS.hourly;
    const isNearNorm = interval.averageSpeed >= TARGETS.hourly * 0.8;

    return {
      x,
      y,
      interval,
      color: isAboveNorm ? '#10b981' : isNearNorm ? '#f59e0b' : '#ef4444',
    };
  });

  // Создаем SVG путь для линии
  const linePath = points
    .map((point, index) => {
      const command = index === 0 ? 'M' : 'L';
      return `${command} ${point.x} ${point.y}`;
    })
    .join(' ');

  // Позиция линии нормы
  const normLineY = 100 - ((TARGETS.hourly / maxSpeed) * 100);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <h3 className="text-base font-display text-slate-700 tracking-wide mb-6 font-semibold">
        ГРАФИК ТЕКУЩИХ СУТОК (30-МИНУТНЫЕ ИНТЕРВАЛЫ)
      </h3>

      {/* График */}
      <div className="relative bg-slate-50 rounded-lg p-6 border border-slate-100">
        {/* Контейнер SVG для линий */}
        <svg
          className="absolute inset-6 w-[calc(100%-48px)] h-80"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* Линия нормы */}
          <line
            x1="0"
            y1={normLineY}
            x2="100"
            y2={normLineY}
            stroke="#f59e0b"
            strokeWidth="0.3"
            strokeDasharray="2,2"
            opacity="0.6"
          />

          {/* Линия графика */}
          <path
            d={linePath}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="0.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Метка нормы */}
        <div
          className="absolute right-2 text-xs text-amber-700 font-mono font-semibold bg-white px-2 py-0.5 rounded border border-amber-200"
          style={{ top: `calc(24px + ${normLineY}% * 0.8 - 12px)` }}
        >
          {TARGETS.hourly} т/ч
        </div>

        {/* Точки */}
        <div className="relative h-80">
          {points.map((point: typeof points[0], index: number) => (
            <div
              key={index}
              className="absolute group"
              style={{
                left: `${point.x}%`,
                top: `${point.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {/* Точка */}
              <div
                className="w-2 h-2 rounded-full border-2 border-white cursor-pointer hover:w-3 hover:h-3 transition-all z-10 relative"
                style={{ backgroundColor: point.color }}
              />

              {/* Всплывающая подсказка */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
                <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg whitespace-nowrap">
                  <div className="text-xs text-slate-500 mb-1 font-mono font-semibold">
                    {point.interval.time}
                  </div>
                  <div className="text-base font-bold text-blue-600">
                    {formatNumber(point.interval.averageSpeed, 1)} т/ч
                  </div>
                  <div className="text-xs text-slate-600 mt-1.5">
                    Произведено: {formatNumber(point.interval.totalProduction, 1)} т
                  </div>
                  <div className="text-xs text-slate-500">
                    Записей: {point.interval.recordCount}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Легенда */}
      <div className="flex items-center justify-center gap-8 mt-6 text-xs text-slate-600 font-medium">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
          <span>≥ {TARGETS.hourly} т/ч (норма)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
          <span>≥ {TARGETS.hourly * 0.8} т/ч</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-rose-500"></div>
          <span>&lt; {TARGETS.hourly * 0.8} т/ч</span>
        </div>
      </div>
    </div>
  );
}

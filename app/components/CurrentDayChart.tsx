'use client';

import { ThirtyMinuteData, TARGETS, formatNumber } from '@/lib/utils';

interface CurrentDayChartProps {
  data: ThirtyMinuteData[];
}

export default function CurrentDayChart({ data }: CurrentDayChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white border-2 border-corporate-neutral-200 rounded-2xl p-8 shadow-card-lg">
        <h3 className="text-xl font-display font-semibold text-corporate-neutral-900 tracking-tight mb-6">
          График текущих суток — 30-минутные интервалы
        </h3>
        <div className="text-center text-corporate-neutral-500 py-12 bg-corporate-neutral-50 rounded-xl">
          <svg className="w-16 h-16 mx-auto mb-4 text-corporate-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-sm font-medium">Нет данных за текущие сутки</p>
        </div>
      </div>
    );
  }

  // Находим максимальное значение для нормализации высоты
  const speeds = data.map((d) => d.averageSpeed);
  const maxSpeed = Math.max(...speeds, TARGETS.hourly * 1.2);

  // Вычисляем позиции точек с корпоративными цветами
  const points = data.map((interval, index) => {
    const x = (index / (data.length - 1 || 1)) * 100; // процент от ширины
    const y = 100 - ((interval.averageSpeed / maxSpeed) * 100); // процент от высоты (инвертированный)
    const isAboveNorm = interval.averageSpeed >= TARGETS.hourly;
    const isNearNorm = interval.averageSpeed >= TARGETS.hourly * 0.8;

    return {
      x,
      y,
      interval,
      color: isAboveNorm ? '#059669' : isNearNorm ? '#f97316' : '#dc2626', // Corporate colors
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
    <div className="bg-white border-2 border-corporate-neutral-200 rounded-2xl p-8 shadow-card-lg">
      {/* Header */}
      <div className="mb-8 pb-4 border-b-2 border-corporate-neutral-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-xl font-display font-semibold text-corporate-neutral-900 tracking-tight mb-2">
              График текущих суток
            </h3>
            <p className="text-sm text-corporate-neutral-600">30-минутные интервалы — производительность в реальном времени</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-corporate-primary-50 rounded-xl border border-corporate-primary-200">
            <svg className="w-4 h-4 text-corporate-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="text-xs font-semibold text-corporate-primary-700 uppercase tracking-wide">Тренд производства</span>
          </div>
        </div>
      </div>

      {/* График */}
      <div className="relative bg-gradient-to-br from-corporate-neutral-50 to-white rounded-2xl p-8 border-2 border-corporate-neutral-100 shadow-inner">
        {/* Контейнер SVG для линий */}
        <svg
          className="absolute inset-8 w-[calc(100%-64px)] h-80"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* Горизонтальные линии сетки */}
          <line x1="0" y1="25" x2="100" y2="25" stroke="#e2e8f0" strokeWidth="0.2" opacity="0.5" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="#e2e8f0" strokeWidth="0.2" opacity="0.5" />
          <line x1="0" y1="75" x2="100" y2="75" stroke="#e2e8f0" strokeWidth="0.2" opacity="0.5" />

          {/* Линия нормы */}
          <line
            x1="0"
            y1={normLineY}
            x2="100"
            y2={normLineY}
            stroke="#f97316"
            strokeWidth="0.4"
            strokeDasharray="3,3"
            opacity="0.8"
          />

          {/* Градиент под графиком */}
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Заполненная область под линией */}
          <path
            d={`${linePath} L 100 100 L 0 100 Z`}
            fill="url(#chartGradient)"
          />

          {/* Линия графика */}
          <path
            d={linePath}
            fill="none"
            stroke="#0ea5e9"
            strokeWidth="0.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="drop-shadow(0 0 2px rgba(14, 165, 233, 0.4))"
          />
        </svg>

        {/* Метка нормы */}
        <div
          className="absolute right-4 text-xs text-corporate-warning-700 font-mono font-semibold bg-white px-3 py-1.5 rounded-lg border-2 border-corporate-warning-300 shadow-sm"
          style={{ top: `calc(32px + ${normLineY}% * 0.8 - 16px)` }}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-corporate-warning-500"></span>
            <span>Норма: {TARGETS.hourly} т/ч</span>
          </div>
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
                className="w-3 h-3 rounded-full border-2 border-white cursor-pointer hover:w-4 hover:h-4 hover:border-3 transition-all z-10 relative shadow-lg"
                style={{
                  backgroundColor: point.color,
                  boxShadow: `0 0 8px ${point.color}40`
                }}
              />

              {/* Всплывающая подсказка */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block z-20 animate-fade-in">
                <div className="bg-white border-2 border-corporate-neutral-200 rounded-xl p-4 shadow-card-lg whitespace-nowrap">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-3.5 h-3.5 text-corporate-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-xs text-corporate-neutral-600 font-semibold font-mono">
                      {point.interval.time}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-corporate-primary-600 mb-2 font-mono">
                    {formatNumber(point.interval.averageSpeed, 1)}
                    <span className="text-sm text-corporate-neutral-500 ml-1">т/ч</span>
                  </div>
                  <div className="space-y-1 pt-2 border-t border-corporate-neutral-100">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-corporate-neutral-600">Переработано:</span>
                      <span className="font-semibold text-corporate-neutral-800 font-mono">
                        {formatNumber(point.interval.totalProduction, 1)} т
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-corporate-neutral-600">Записей:</span>
                      <span className="font-semibold text-corporate-neutral-800 font-mono">
                        {point.interval.recordCount}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Легенда */}
      <div className="flex flex-wrap items-center justify-center gap-6 mt-8 pt-6 border-t-2 border-corporate-neutral-100">
        <div className="flex items-center gap-3 px-4 py-2.5 bg-corporate-success-50 rounded-lg border border-corporate-success-200">
          <div className="w-3.5 h-3.5 rounded-full bg-corporate-success-600 shadow-sm"></div>
          <span className="text-xs font-semibold text-corporate-success-700">≥ {TARGETS.hourly} т/ч</span>
          <span className="text-xs text-corporate-neutral-600">(Норма)</span>
        </div>
        <div className="flex items-center gap-3 px-4 py-2.5 bg-corporate-warning-50 rounded-lg border border-corporate-warning-200">
          <div className="w-3.5 h-3.5 rounded-full bg-corporate-warning-600 shadow-sm"></div>
          <span className="text-xs font-semibold text-corporate-warning-700">≥ {TARGETS.hourly * 0.8} т/ч</span>
          <span className="text-xs text-corporate-neutral-600">(Предупреждение)</span>
        </div>
        <div className="flex items-center gap-3 px-4 py-2.5 bg-corporate-danger-50 rounded-lg border border-corporate-danger-200">
          <div className="w-3.5 h-3.5 rounded-full bg-corporate-danger-600 shadow-sm"></div>
          <span className="text-xs font-semibold text-corporate-danger-700">&lt; {TARGETS.hourly * 0.8} т/ч</span>
          <span className="text-xs text-corporate-neutral-600">(Критично)</span>
        </div>
      </div>
    </div>
  );
}

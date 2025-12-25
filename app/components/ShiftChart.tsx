'use client';

import { ProductionData, TARGETS, formatNumber, TIMEZONE_OFFSET } from '@/lib/utils';

interface ShiftChartProps {
  data: ProductionData[];
  shiftType: 'day' | 'night'; // day: 08:00-20:00, night: 20:00-08:00
  events?: Array<{
    time: string;
    description: string;
    type: string;
  }>;
}

export default function ShiftChart({ data, shiftType, events = [] }: ShiftChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-display text-slate-700 tracking-wider mb-6">
          ГРАФИК СМЕНЫ ({shiftType === 'day' ? 'ДНЕВНАЯ 08:00-20:00' : 'НОЧНАЯ 20:00-08:00'})
        </h3>
        <div className="text-center text-slate-600 py-8">
          Нет данных за текущую смену
        </div>
      </div>
    );
  }

  // Группируем данные по 15-минутным интервалам для детализации смены
  const intervals = new Map<number, {
    timestamp: number;
    displayTime: string;
    speeds: number[];
    production: number;
    count: number;
  }>();

  data.forEach((item) => {
    const itemDate = new Date(item.datetime);
    const localTime = new Date(itemDate.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);
    const minute = localTime.getUTCMinutes();

    // Округляем до ближайшего 15-минутного интервала
    const intervalMinute = Math.floor(minute / 15) * 15;

    const intervalDate = new Date(localTime);
    intervalDate.setUTCMinutes(intervalMinute, 0, 0);
    const intervalTimestamp = intervalDate.getTime();

    const hour = intervalDate.getUTCHours();
    const displayTime = `${hour.toString().padStart(2, '0')}:${intervalMinute.toString().padStart(2, '0')}`;

    if (!intervals.has(intervalTimestamp)) {
      intervals.set(intervalTimestamp, {
        timestamp: intervalTimestamp,
        displayTime,
        speeds: [],
        production: 0,
        count: 0
      });
    }

    const interval = intervals.get(intervalTimestamp)!;
    interval.speeds.push(item.speed);
    interval.production += item.difference || 0;
    interval.count++;
  });

  // Сортируем интервалы
  const sortedIntervals = Array.from(intervals.values()).sort((a, b) => a.timestamp - b.timestamp);

  const maxSpeed = Math.max(
    ...sortedIntervals.map((i) => i.speeds.reduce((sum, s) => sum + s, 0) / i.speeds.length),
    TARGETS.hourly * 1.2
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-display text-slate-700 tracking-wider">
          ГРАФИК СМЕНЫ ({shiftType === 'day' ? 'ДНЕВНАЯ 08:00-20:00' : 'НОЧНАЯ 20:00-08:00'})
        </h3>
        <div className="text-sm text-slate-600 font-mono">
          15-минутные интервалы
        </div>
      </div>

      {/* График */}
      <div className="relative">
        {/* Линия нормы */}
        <div className="absolute left-0 right-0 flex items-center" style={{ bottom: `${(TARGETS.hourly / maxSpeed) * 100}%` }}>
          <div className="w-full h-px bg-amber-300 border-t border-dashed border-amber-400"></div>
          <div className="absolute -right-2 -top-3 text-xs text-amber-600 font-mono bg-white px-2 py-0.5 rounded">
            {TARGETS.hourly} т/ч
          </div>
        </div>

        {/* Линейный график с точками */}
        <div className="relative h-96 overflow-x-auto pb-2">
          {(() => {
            // Вычисляем позиции точек
            const points = sortedIntervals.map((interval, index) => {
              const averageSpeed = interval.speeds.reduce((sum, s) => sum + s, 0) / interval.speeds.length;
              const x = (index / (sortedIntervals.length - 1 || 1)) * 100;
              const y = 100 - Math.max((averageSpeed / maxSpeed) * 100, 0);
              const isAboveNorm = averageSpeed >= TARGETS.hourly;
              const isNearNorm = averageSpeed >= TARGETS.hourly * 0.8;
              const color = isAboveNorm ? '#10b981' : isNearNorm ? '#f59e0b' : '#ef4444';

              // Проверяем, есть ли события в этот интервал
              const intervalEvents = events.filter(e => {
                const eventTime = new Date(e.time).getTime();
                return eventTime >= interval.timestamp && eventTime < interval.timestamp + 15 * 60 * 1000;
              });

              return { x, y, interval, averageSpeed, color, isAboveNorm, isNearNorm, intervalEvents };
            });

            // Создаем SVG путь для линии
            const linePath = points.map((p, index) => {
              const command = index === 0 ? 'M' : 'L';
              return `${command} ${p.x} ${p.y}`;
            }).join(' ');

            return (
              <>
                {/* SVG для линии */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="0.3"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>

                {/* Точки с интерактивностью */}
                {points.map((p, index) => (
                  <div
                    key={p.interval.timestamp}
                    className="absolute group"
                    style={{
                      left: `${p.x}%`,
                      bottom: `${100 - p.y}%`,
                      transform: 'translate(-50%, 50%)'
                    }}
                  >
                    {/* Точка */}
                    <div
                      className={`w-2.5 h-2.5 rounded-full cursor-pointer transition-all duration-200 hover:scale-150 ${
                        p.intervalEvents.length > 0 ? 'ring-2 ring-blue-500 ring-opacity-70' : ''
                      }`}
                      style={{ backgroundColor: p.color }}
                    ></div>

                    {/* Всплывающая подсказка */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                      <div className="bg-white border border-slate-300 rounded-lg p-3 shadow-xl whitespace-nowrap">
                        <div className="text-xs text-slate-600 mb-1 font-mono">{p.interval.displayTime}</div>
                        <div className="text-sm font-bold text-blue-600">
                          {formatNumber(p.averageSpeed, 1)} т/ч
                        </div>
                        <div className="text-xs text-slate-600 mt-1">
                          Произведено: {formatNumber(p.interval.production, 1)} т
                        </div>
                        {p.intervalEvents.length > 0 && (
                          <div className="text-xs text-blue-600 mt-2 border-t border-slate-200 pt-2">
                            📝 События: {p.intervalEvents.length}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Метка времени (каждый 8-й интервал) */}
                    {index % 8 === 0 && (
                      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-xs text-slate-500 font-mono -rotate-45 origin-top whitespace-nowrap">
                        {p.interval.displayTime}
                      </div>
                    )}
                  </div>
                ))}
              </>
            );
          })()}
        </div>
      </div>

      {/* Легенда */}
      <div className="flex items-center justify-between mt-6">
        <div className="flex items-center gap-6 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-emerald-500"></div>
            <span>≥ {TARGETS.hourly} т/ч</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-amber-500"></div>
            <span>≥ {TARGETS.hourly * 0.8} т/ч</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-rose-500"></div>
            <span>&lt; {TARGETS.hourly * 0.8} т/ч</span>
          </div>
        </div>
        <div className="text-xs text-slate-500 font-mono">
          Всего интервалов: {sortedIntervals.length}
        </div>
      </div>
    </div>
  );
}

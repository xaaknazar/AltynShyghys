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
      <div className="bg-industrial-darker/80 backdrop-blur-sm rounded-2xl border border-industrial-blue/30 p-6">
        <h3 className="text-lg font-display text-gray-400 tracking-wider mb-6">
          ГРАФИК СМЕНЫ ({shiftType === 'day' ? 'ДНЕВНАЯ 08:00-20:00' : 'НОЧНАЯ 20:00-08:00'})
        </h3>
        <div className="text-center text-gray-500 py-8">
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
    <div className="bg-industrial-darker/80 backdrop-blur-sm rounded-2xl border border-industrial-blue/30 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-display text-gray-400 tracking-wider">
          ГРАФИК СМЕНЫ ({shiftType === 'day' ? 'ДНЕВНАЯ 08:00-20:00' : 'НОЧНАЯ 20:00-08:00'})
        </h3>
        <div className="text-sm text-gray-400 font-mono">
          15-минутные интервалы
        </div>
      </div>

      {/* График */}
      <div className="relative">
        {/* Линия нормы */}
        <div className="absolute left-0 right-0 flex items-center" style={{ bottom: `${(TARGETS.hourly / maxSpeed) * 100}%` }}>
          <div className="w-full h-px bg-industrial-warning/50 border-t border-dashed border-industrial-warning/70"></div>
          <div className="absolute -right-2 -top-3 text-xs text-industrial-warning font-mono">
            {TARGETS.hourly} т/ч
          </div>
        </div>

        {/* Столбцы графика */}
        <div className="flex items-end justify-start gap-px h-96 overflow-x-auto pb-2">
          {sortedIntervals.map((interval, index) => {
            const averageSpeed = interval.speeds.reduce((sum, s) => sum + s, 0) / interval.speeds.length;
            const heightPercent = Math.max((averageSpeed / maxSpeed) * 100, 2);
            const isAboveNorm = averageSpeed >= TARGETS.hourly;
            const isNearNorm = averageSpeed >= TARGETS.hourly * 0.8;

            // Проверяем, есть ли события в этот интервал
            const intervalEvents = events.filter(e => {
              const eventTime = new Date(e.time).getTime();
              return eventTime >= interval.timestamp && eventTime < interval.timestamp + 15 * 60 * 1000;
            });

            return (
              <div key={interval.timestamp} className="flex flex-col items-center group relative min-w-[12px]">
                {/* Столбец */}
                <div
                  className={`w-full rounded-t transition-all duration-300 ${
                    intervalEvents.length > 0 ? 'ring-2 ring-industrial-accent ring-opacity-70' : ''
                  } ${
                    isAboveNorm
                      ? 'bg-gradient-to-t from-industrial-success/80 to-industrial-success hover:from-industrial-success hover:to-green-400'
                      : isNearNorm
                      ? 'bg-gradient-to-t from-industrial-warning/80 to-industrial-warning hover:from-industrial-warning hover:to-yellow-400'
                      : 'bg-gradient-to-t from-industrial-danger/80 to-industrial-danger hover:from-industrial-danger hover:to-red-400'
                  }`}
                  style={{ height: `${heightPercent}%`, minHeight: '4px' }}
                ></div>

                {/* Всплывающая подсказка */}
                <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                  <div className="bg-industrial-darker border border-industrial-blue/50 rounded-lg p-3 shadow-xl whitespace-nowrap">
                    <div className="text-xs text-gray-400 mb-1 font-mono">{interval.displayTime}</div>
                    <div className="text-sm font-bold text-industrial-accent">
                      {formatNumber(averageSpeed, 1)} т/ч
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Произведено: {formatNumber(interval.production, 1)} т
                    </div>
                    {intervalEvents.length > 0 && (
                      <div className="text-xs text-industrial-accent mt-2 border-t border-industrial-blue/30 pt-2">
                        📝 События: {intervalEvents.length}
                      </div>
                    )}
                  </div>
                </div>

                {/* Метка времени (каждый 8-й интервал) */}
                {index % 8 === 0 && (
                  <div className="text-xs text-gray-500 font-mono mt-2 -rotate-45 origin-top-left">
                    {interval.displayTime}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Легенда */}
      <div className="flex items-center justify-between mt-6">
        <div className="flex items-center gap-6 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-industrial-success"></div>
            <span>≥ {TARGETS.hourly} т/ч</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-industrial-warning"></div>
            <span>≥ {TARGETS.hourly * 0.8} т/ч</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-industrial-danger"></div>
            <span>&lt; {TARGETS.hourly * 0.8} т/ч</span>
          </div>
        </div>
        <div className="text-xs text-gray-500 font-mono">
          Всего интервалов: {sortedIntervals.length}
        </div>
      </div>
    </div>
  );
}

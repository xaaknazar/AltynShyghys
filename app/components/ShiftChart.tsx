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

  // Вычисляем среднюю скорость за всю смену
  const totalSpeed = data.reduce((sum, item) => sum + item.speed, 0);
  const averageSpeed = totalSpeed / data.length;

  // Создаем все временные слоты с 5-минутным интервалом для всей смены
  const now = new Date();
  const shiftStartHour = shiftType === 'day' ? 8 : 20;
  const shiftEndHour = shiftType === 'day' ? 20 : 8;

  // Создаем начало смены
  const shiftStart = new Date(now);
  shiftStart.setHours(shiftStartHour, 0, 0, 0);

  // Если ночная смена и сейчас до 08:00, значит смена началась вчера
  if (shiftType === 'night' && now.getHours() < 8) {
    shiftStart.setDate(shiftStart.getDate() - 1);
  }

  // Создаем все 5-минутные интервалы (12 часов * 12 интервалов в час = 144 интервала)
  const allIntervals: Array<{
    timestamp: number;
    displayTime: string;
    speeds: number[];
  }> = [];

  for (let i = 0; i < 144; i++) {
    const intervalTime = new Date(shiftStart.getTime() + i * 5 * 60 * 1000);
    const hour = intervalTime.getHours();
    const minute = intervalTime.getMinutes();
    const displayTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

    allIntervals.push({
      timestamp: intervalTime.getTime(),
      displayTime,
      speeds: []
    });
  }

  // Заполняем данные в соответствующие интервалы
  data.forEach((item) => {
    const itemDate = new Date(item.datetime);
    const itemTimestamp = itemDate.getTime();

    // Находим ближайший 5-минутный интервал
    const matchingInterval = allIntervals.find((interval, idx) => {
      const nextInterval = allIntervals[idx + 1];
      if (!nextInterval) return itemTimestamp >= interval.timestamp;
      return itemTimestamp >= interval.timestamp && itemTimestamp < nextInterval.timestamp;
    });

    if (matchingInterval) {
      matchingInterval.speeds.push(item.speed);
    }
  });

  const maxSpeed = Math.max(
    ...allIntervals
      .filter(i => i.speeds.length > 0)
      .map((i) => i.speeds.reduce((sum, s) => sum + s, 0) / i.speeds.length),
    TARGETS.hourly * 1.2,
    60
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-display text-slate-700 tracking-wider">
          ГРАФИК СМЕНЫ ({shiftType === 'day' ? 'ДНЕВНАЯ 08:00-20:00' : 'НОЧНАЯ 20:00-08:00'})
        </h3>
        <div className="text-sm font-semibold text-blue-600">
          Средняя скорость: {formatNumber(averageSpeed, 1)} т/ч
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
        <div className="relative h-96 overflow-x-auto pb-12 pt-8">
          {(() => {
            // Фильтруем только интервалы с данными
            const intervalsWithData = allIntervals.filter(i => i.speeds.length > 0);

            if (intervalsWithData.length === 0) {
              return <div className="text-center text-slate-600 py-8">Нет данных для отображения</div>;
            }

            // Вычисляем позиции точек
            const points = intervalsWithData.map((interval, index) => {
              const intervalAvgSpeed = interval.speeds.reduce((sum, s) => sum + s, 0) / interval.speeds.length;
              const x = (index / (intervalsWithData.length - 1 || 1)) * 100;
              const y = 100 - Math.max((intervalAvgSpeed / maxSpeed) * 100, 0);
              const isAboveNorm = intervalAvgSpeed >= TARGETS.hourly;
              const isNearNorm = intervalAvgSpeed >= TARGETS.hourly * 0.8;
              const color = isAboveNorm ? '#10b981' : isNearNorm ? '#f59e0b' : '#ef4444';

              return { x, y, interval, intervalAvgSpeed, color, isAboveNorm, isNearNorm };
            });

            // Создаем SVG путь для линии
            const linePath = points.map((p: typeof points[0], index: number) => {
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
                    strokeWidth="0.5"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>

                {/* Точки со значениями */}
                {points.map((p: typeof points[0], index: number) => (
                  <div
                    key={p.interval.timestamp}
                    className="absolute"
                    style={{
                      left: `${p.x}%`,
                      bottom: `${100 - p.y}%`,
                      transform: 'translate(-50%, 50%)'
                    }}
                  >
                    {/* Точка */}
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: p.color }}
                    ></div>

                    {/* Значение на точке */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 pointer-events-none">
                      <div className="bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
                        {formatNumber(p.intervalAvgSpeed, 1)}
                      </div>
                    </div>

                    {/* Метка времени (каждый 12-й интервал, т.е. каждый час) */}
                    {index % 12 === 0 && (
                      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-xs text-slate-500 font-mono whitespace-nowrap">
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
          Интервалы по 5 минут
        </div>
      </div>
    </div>
  );
}

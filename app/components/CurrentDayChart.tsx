'use client';

import { ThirtyMinuteData, TARGETS, formatNumber } from '@/lib/utils';

interface CurrentDayChartProps {
  data: ThirtyMinuteData[];
}

export default function CurrentDayChart({ data }: CurrentDayChartProps) {
  console.log('📈 CurrentDayChart received:', {
    hasData: !!data,
    length: data?.length,
    sample: data?.[0],
    allData: data
  });

  if (!data || data.length === 0) {
    return (
      <div className="bg-white border border-gray-300 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-display text-gray-700 tracking-wider mb-6">
          ГРАФИК ТЕКУЩИХ СУТОК (30-МИНУТНЫЕ ИНТЕРВАЛЫ)
        </h3>
        <div className="text-center text-gray-500 py-8">
          Нет данных за текущие сутки
        </div>
      </div>
    );
  }

  // Находим максимальное значение для нормализации высоты столбцов
  const speeds = data.map((d) => d.averageSpeed);
  const maxSpeed = Math.max(...speeds, TARGETS.hourly * 1.2);
  console.log('📊 Chart stats:', {
    dataPoints: data.length,
    speeds: speeds,
    maxSpeed,
    target: TARGETS.hourly
  });

  return (
    <div className="bg-white border border-gray-300 rounded-xl p-6 shadow-sm">
      <h3 className="text-lg font-display text-gray-700 tracking-wider mb-6">
        ГРАФИК ТЕКУЩИХ СУТОК (30-МИНУТНЫЕ ИНТЕРВАЛЫ)
      </h3>

      {/* График */}
      <div className="relative bg-gray-50 rounded-lg p-4">
        {/* Линия нормы */}
        <div className="absolute left-0 right-0 flex items-center" style={{ bottom: `${(TARGETS.hourly / maxSpeed) * 100}%` }}>
          <div className="w-full h-px bg-orange-400 border-t border-dashed border-orange-500"></div>
          <div className="absolute -right-2 -top-3 text-xs text-orange-600 font-mono font-bold">
            {TARGETS.hourly} т/ч
          </div>
        </div>

        {/* Столбцы графика */}
        <div className="flex items-end justify-start gap-0.5 h-80 overflow-x-auto pb-2">
          {data.map((interval, index) => {
            const heightPercent = Math.max((interval.averageSpeed / maxSpeed) * 100, 2);
            const isAboveNorm = interval.averageSpeed >= TARGETS.hourly;
            const isNearNorm = interval.averageSpeed >= TARGETS.hourly * 0.8;

            return (
              <div key={interval.time} className="flex flex-col items-center group relative min-w-[20px]">
                {/* Столбец */}
                <div
                  className={`w-full rounded-t transition-all duration-300 shadow-sm ${
                    isAboveNorm
                      ? 'bg-gradient-to-t from-green-400 to-green-500 hover:from-green-500 hover:to-green-600'
                      : isNearNorm
                      ? 'bg-gradient-to-t from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600'
                      : 'bg-gradient-to-t from-red-400 to-red-500 hover:from-red-500 hover:to-red-600'
                  }`}
                  style={{ height: `${heightPercent}%`, minHeight: '6px' }}
                ></div>

                {/* Всплывающая подсказка */}
                <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                  <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-xl whitespace-nowrap">
                    <div className="text-xs text-gray-500 mb-1 font-mono font-bold">{interval.time}</div>
                    <div className="text-sm font-bold text-amber-600">
                      {formatNumber(interval.averageSpeed, 1)} т/ч
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Произведено: {formatNumber(interval.totalProduction, 1)} т
                    </div>
                    <div className="text-xs text-gray-500">
                      Записей: {interval.recordCount}
                    </div>
                  </div>
                </div>

                {/* Метка времени (каждый 4-й интервал) */}
                {index % 4 === 0 && (
                  <div className="text-xs text-gray-600 font-mono mt-2 -rotate-45 origin-top-left">
                    {interval.time}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Легенда */}
      <div className="flex items-center justify-center gap-6 mt-6 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500 shadow-sm"></div>
          <span>≥ {TARGETS.hourly} т/ч (норма)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-yellow-500 shadow-sm"></div>
          <span>≥ {TARGETS.hourly * 0.8} т/ч</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500 shadow-sm"></div>
          <span>&lt; {TARGETS.hourly * 0.8} т/ч</span>
        </div>
      </div>
      </div>
    </div>
  );
}

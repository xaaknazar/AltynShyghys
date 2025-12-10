'use client';

import { ThirtyMinuteData, TARGETS, formatNumber } from '@/lib/utils';

interface CurrentDayChartProps {
  data: ThirtyMinuteData[];
}

export default function CurrentDayChart({ data }: CurrentDayChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-industrial-darker/80 backdrop-blur-sm rounded-2xl border border-industrial-blue/30 p-6">
        <h3 className="text-lg font-display text-gray-400 tracking-wider mb-6">
          ГРАФИК ТЕКУЩИХ СУТОК (30-МИНУТНЫЕ ИНТЕРВАЛЫ)
        </h3>
        <div className="text-center text-gray-500 py-8">
          Нет данных за текущие сутки
        </div>
      </div>
    );
  }

  // Находим максимальное значение для нормализации высоты столбцов
  const maxSpeed = Math.max(...data.map((d) => d.averageSpeed), TARGETS.hourly);

  return (
    <div className="bg-industrial-darker/80 backdrop-blur-sm rounded-2xl border border-industrial-blue/30 p-6">
      <h3 className="text-lg font-display text-gray-400 tracking-wider mb-6">
        ГРАФИК ТЕКУЩИХ СУТОК (30-МИНУТНЫЕ ИНТЕРВАЛЫ)
      </h3>

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
        <div className="flex items-end justify-between gap-1 h-64">
          {data.map((interval, index) => {
            const heightPercent = (interval.averageSpeed / maxSpeed) * 100;
            const isAboveNorm = interval.averageSpeed >= TARGETS.hourly;
            const isNearNorm = interval.averageSpeed >= TARGETS.hourly * 0.8;

            return (
              <div key={interval.time} className="flex-1 flex flex-col items-center group relative">
                {/* Столбец */}
                <div
                  className={`w-full rounded-t transition-all duration-300 ${
                    isAboveNorm
                      ? 'bg-gradient-to-t from-industrial-success/80 to-industrial-success hover:from-industrial-success hover:to-green-400'
                      : isNearNorm
                      ? 'bg-gradient-to-t from-industrial-warning/80 to-industrial-warning hover:from-industrial-warning hover:to-yellow-400'
                      : 'bg-gradient-to-t from-industrial-danger/80 to-industrial-danger hover:from-industrial-danger hover:to-red-400'
                  }`}
                  style={{ height: `${heightPercent}%` }}
                ></div>

                {/* Всплывающая подсказка */}
                <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                  <div className="bg-industrial-darker border border-industrial-blue/50 rounded-lg p-3 shadow-xl whitespace-nowrap">
                    <div className="text-xs text-gray-400 mb-1 font-mono">{interval.time}</div>
                    <div className="text-sm font-bold text-industrial-accent">
                      {formatNumber(interval.averageSpeed, 1)} т/ч
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Произведено: {formatNumber(interval.totalProduction, 1)} т
                    </div>
                    <div className="text-xs text-gray-600">
                      Записей: {interval.recordCount}
                    </div>
                  </div>
                </div>

                {/* Метка времени (каждый 4-й интервал) */}
                {index % 4 === 0 && (
                  <div className="text-xs text-gray-500 font-mono mt-2 -rotate-45 origin-top-left">
                    {interval.time}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Легенда */}
      <div className="flex items-center justify-center gap-6 mt-6 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-industrial-success"></div>
          <span>≥ {TARGETS.hourly} т/ч (норма)</span>
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
    </div>
  );
}

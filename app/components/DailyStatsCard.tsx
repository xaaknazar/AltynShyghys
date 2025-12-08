'use client';

import { formatNumber, TARGETS } from '@/lib/utils';

interface DailyStatsProps {
  totalProduction: number;
  averageSpeed: number;
  progress: number;
  periodStart: string;
  periodEnd: string;
}

export default function DailyStatsCard({ totalProduction, averageSpeed, progress, periodStart, periodEnd }: DailyStatsProps) {
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-industrial-darker/80 backdrop-blur-sm rounded-2xl border border-industrial-blue/30 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-display text-gray-400 tracking-wider mb-2">
          ПРОИЗВОДСТВО ЗА СУТКИ
        </h3>
        <div className="text-sm text-gray-500 font-mono">
          {formatTime(periodStart)} → {formatTime(periodEnd)}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="space-y-2">
          <div className="text-sm text-gray-400 font-mono">Произведено</div>
          <div className="text-4xl font-display font-bold text-industrial-accent">
            {formatNumber(totalProduction, 1)}
            <span className="text-xl ml-1 text-gray-500">т</span>
          </div>
          <div className="text-xs text-gray-500">
            из {TARGETS.daily} т (план)
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm text-gray-400 font-mono">Средняя скорость</div>
          <div className="text-4xl font-display font-bold text-blue-400">
            {formatNumber(averageSpeed, 1)}
            <span className="text-xl ml-1 text-gray-500">т/ч</span>
          </div>
          <div className="text-xs text-gray-500">
            норма {TARGETS.hourly} т/ч
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm text-gray-400 font-mono">Выполнение плана</div>
          <div className={`text-4xl font-display font-bold ${
            progress >= 100 ? 'text-industrial-success' : 
            progress >= 80 ? 'text-industrial-warning' : 
            'text-industrial-danger'
          }`}>
            {formatNumber(progress, 1)}
            <span className="text-xl ml-1 text-gray-500">%</span>
          </div>
          <div className="text-xs text-gray-500">
            {progress >= 100 ? 'План выполнен' : `До плана ${formatNumber(TARGETS.daily - totalProduction, 0)} т`}
          </div>
        </div>
      </div>

      <div>
        <div className="h-4 bg-industrial-dark rounded-full overflow-hidden border border-industrial-blue/30">
          <div
            className={`h-full transition-all duration-1000 ease-out ${
              progress >= 100 ? 'bg-gradient-to-r from-industrial-success to-green-400' :
              progress >= 80 ? 'bg-gradient-to-r from-industrial-warning to-yellow-400' :
              'bg-gradient-to-r from-industrial-danger to-red-400'
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="bg-industrial-dark/50 rounded-lg p-3 border border-industrial-blue/20">
          <div className="text-xs text-gray-500 mb-1">Смена (12ч)</div>
          <div className="text-lg font-mono text-gray-300">{TARGETS.shift} т</div>
        </div>
        <div className="bg-industrial-dark/50 rounded-lg p-3 border border-industrial-blue/20">
          <div className="text-xs text-gray-500 mb-1">Сутки (24ч)</div>
          <div className="text-lg font-mono text-gray-300">{TARGETS.daily} т</div>
        </div>
      </div>
    </div>
  );
}
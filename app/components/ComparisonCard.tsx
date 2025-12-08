'use client';

import { formatNumber } from '@/lib/utils';

interface ComparisonCardProps {
  currentTotal: number;
  previousTotal: number;
  currentAvg: number;
  previousAvg: number;
}

export default function ComparisonCard({ currentTotal, previousTotal, currentAvg, previousAvg }: ComparisonCardProps) {
  const totalDiff = currentTotal - previousTotal;
  const totalDiffPercent = previousTotal > 0 ? (totalDiff / previousTotal) * 100 : 0;
  
  const avgDiff = currentAvg - previousAvg;
  const avgDiffPercent = previousAvg > 0 ? (avgDiff / previousAvg) * 100 : 0;

  const renderDifference = (diff: number, percent: number) => {
    const isPositive = diff > 0;
    const color = isPositive ? 'text-industrial-success' : 'text-industrial-danger';
    const arrow = isPositive ? '↑' : '↓';
    
    return (
      <div className={`${color} text-sm font-mono flex items-center gap-1`}>
        <span className="text-lg">{arrow}</span>
        <span>{formatNumber(Math.abs(diff), 1)}</span>
        <span className="text-xs">({formatNumber(Math.abs(percent), 1)}%)</span>
      </div>
    );
  };

  return (
    <div className="bg-industrial-darker/80 backdrop-blur-sm rounded-2xl border border-industrial-blue/30 p-6">
      <h3 className="text-lg font-display text-gray-400 tracking-wider mb-6">
        СРАВНЕНИЕ СУТОК
      </h3>

      <div className="space-y-6">
        <div className="bg-industrial-dark/50 rounded-lg p-4 border border-industrial-blue/20">
          <div className="text-sm text-gray-400 mb-3">Общий объем производства</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">Сегодня</div>
              <div className="text-2xl font-display font-bold text-industrial-accent">
                {formatNumber(currentTotal, 1)} <span className="text-sm text-gray-500">т</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Вчера</div>
              <div className="text-2xl font-display font-bold text-gray-400">
                {formatNumber(previousTotal, 1)} <span className="text-sm text-gray-500">т</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-industrial-blue/20">
            <div className="text-xs text-gray-500 mb-1">Изменение</div>
            {renderDifference(totalDiff, totalDiffPercent)}
          </div>
        </div>

        <div className="bg-industrial-dark/50 rounded-lg p-4 border border-industrial-blue/20">
          <div className="text-sm text-gray-400 mb-3">Средняя скорость</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">Сегодня</div>
              <div className="text-2xl font-display font-bold text-blue-400">
                {formatNumber(currentAvg, 1)} <span className="text-sm text-gray-500">т/ч</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Вчера</div>
              <div className="text-2xl font-display font-bold text-gray-400">
                {formatNumber(previousAvg, 1)} <span className="text-sm text-gray-500">т/ч</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-industrial-blue/20">
            <div className="text-xs text-gray-500 mb-1">Изменение</div>
            {renderDifference(avgDiff, avgDiffPercent)}
          </div>
        </div>

        <div className={`rounded-lg p-4 border-2 ${
          totalDiffPercent > 5 ? 'bg-industrial-success/10 border-industrial-success/30' :
          totalDiffPercent < -5 ? 'bg-industrial-danger/10 border-industrial-danger/30' :
          'bg-industrial-warning/10 border-industrial-warning/30'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`text-2xl ${
              totalDiffPercent > 5 ? 'text-industrial-success' :
              totalDiffPercent < -5 ? 'text-industrial-danger' :
              'text-industrial-warning'
            }`}>
              {totalDiffPercent > 5 ? '✓' : totalDiffPercent < -5 ? '!' : '~'}
            </div>
            <div>
              <div className="text-sm font-mono text-gray-300">
                {totalDiffPercent > 5 ? 'Производительность выше вчерашней' :
                 totalDiffPercent < -5 ? 'Производительность ниже вчерашней' :
                 'Производительность на уровне вчерашней'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {totalDiffPercent > 5 ? 'Отличная работа! Продолжайте в том же духе.' :
                 totalDiffPercent < -5 ? 'Требуется внимание. Проверьте причины снижения.' :
                 'Стабильная работа в пределах нормы.'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
'use client';

import { useEffect, useRef } from 'react';
import { DailyGroupedData, aggregateToThirtyMinutes, formatNumber, TARGETS } from '@/lib/utils';

interface DayDetailModalProps {
  dayData: DailyGroupedData | null;
  onClose: () => void;
}

export default function DayDetailModal({ dayData, onClose }: DayDetailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Закрытие по Escape
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Закрытие по клику вне модалки
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);

    // Блокируем прокрутку страницы когда модалка открыта
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  if (!dayData) return null;

  const thirtyMinData = aggregateToThirtyMinutes(dayData.data);
  const maxSpeed = Math.max(...thirtyMinData.map((d) => d.averageSpeed), TARGETS.hourly);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const periodStart = dayData.data[0]?.datetime;
  const periodEnd = dayData.data[dayData.data.length - 1]?.datetime;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        ref={modalRef}
        className="bg-industrial-darker border-2 border-industrial-accent/50 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Заголовок */}
        <div className="sticky top-0 bg-industrial-darker/95 backdrop-blur-md border-b border-industrial-blue/30 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-display font-bold text-industrial-accent">
              ДЕТАЛИЗАЦИЯ СУТОК
            </h2>
            <p className="text-sm text-gray-400 font-mono mt-1">
              {formatDate(dayData.date)}
            </p>
            <p className="text-xs text-gray-500 font-mono mt-1">
              {formatTime(periodStart)} → {formatTime(periodEnd)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-industrial-blue/30 rounded-lg transition-colors"
            title="Закрыть"
          >
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Статистика */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-industrial-dark/50 rounded-lg p-4 border border-industrial-blue/20">
              <div className="text-xs text-gray-400 mb-1">Произведено</div>
              <div className="text-3xl font-display font-bold text-industrial-accent">
                {formatNumber(dayData.stats.totalProduction, 1)}
                <span className="text-lg ml-1 text-gray-500">т</span>
              </div>
            </div>
            <div className="bg-industrial-dark/50 rounded-lg p-4 border border-industrial-blue/20">
              <div className="text-xs text-gray-400 mb-1">Средняя скорость</div>
              <div className="text-3xl font-display font-bold text-blue-400">
                {formatNumber(dayData.stats.averageSpeed, 1)}
                <span className="text-lg ml-1 text-gray-500">т/ч</span>
              </div>
            </div>
            <div className="bg-industrial-dark/50 rounded-lg p-4 border border-industrial-blue/20">
              <div className="text-xs text-gray-400 mb-1">Текущая скорость</div>
              <div className="text-3xl font-display font-bold text-gray-300">
                {formatNumber(dayData.stats.currentSpeed, 1)}
                <span className="text-lg ml-1 text-gray-500">т/ч</span>
              </div>
            </div>
            <div className="bg-industrial-dark/50 rounded-lg p-4 border border-industrial-blue/20">
              <div className="text-xs text-gray-400 mb-1">Выполнение плана</div>
              <div className={`text-3xl font-display font-bold ${
                dayData.stats.progress >= 100 ? 'text-industrial-success' :
                dayData.stats.progress >= 80 ? 'text-industrial-warning' :
                'text-industrial-danger'
              }`}>
                {formatNumber(dayData.stats.progress, 1)}
                <span className="text-lg ml-1 text-gray-500">%</span>
              </div>
            </div>
          </div>

          {/* Прогресс-бар */}
          <div className="mb-8">
            <div className="h-3 bg-industrial-dark rounded-full overflow-hidden border border-industrial-blue/30">
              <div
                className={`h-full transition-all duration-1000 ease-out ${
                  dayData.stats.progress >= 100 ? 'bg-gradient-to-r from-industrial-success to-green-400' :
                  dayData.stats.progress >= 80 ? 'bg-gradient-to-r from-industrial-warning to-yellow-400' :
                  'bg-gradient-to-r from-industrial-danger to-red-400'
                }`}
                style={{ width: `${Math.min(dayData.stats.progress, 100)}%` }}
              />
            </div>
          </div>

          {/* График */}
          <div className="bg-industrial-dark/30 rounded-xl p-6 border border-industrial-blue/20">
            <h3 className="text-lg font-display text-gray-400 tracking-wider mb-6">
              ГРАФИК ПРОИЗВОДСТВА (30-МИНУТНЫЕ ИНТЕРВАЛЫ)
            </h3>

            <div className="relative">
              {/* Линия нормы */}
              <div className="absolute left-0 right-0 flex items-center" style={{ bottom: `${(TARGETS.hourly / maxSpeed) * 100}%` }}>
                <div className="w-full h-px bg-industrial-warning/50 border-t border-dashed border-industrial-warning/70"></div>
                <div className="absolute -right-2 -top-3 text-xs text-industrial-warning font-mono">
                  {TARGETS.hourly} т/ч
                </div>
              </div>

              {/* Столбцы графика */}
              <div className="flex items-end justify-between gap-1 h-80">
                {thirtyMinData.map((interval, index) => {
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

          {/* Информация о данных */}
          <div className="mt-6 text-center text-xs text-gray-500 font-mono">
            Всего записей: {dayData.data.length} • Интервалов: {thirtyMinData.length}
          </div>
        </div>
      </div>
    </div>
  );
}

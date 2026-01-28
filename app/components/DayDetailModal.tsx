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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div
        ref={modalRef}
        className="bg-white border border-slate-300 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Заголовок */}
        <div className="sticky top-0 bg-white backdrop-blur-md border-b border-slate-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-display font-bold text-blue-600">
              ДЕТАЛИЗАЦИЯ СУТОК
            </h2>
            <p className="text-sm text-slate-700 font-mono mt-1">
              {formatDate(dayData.date)}
            </p>
            <p className="text-xs text-slate-600 font-mono mt-1">
              {formatTime(periodStart)} → {formatTime(periodEnd)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="Закрыть"
          >
            <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Статистика */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="text-xs text-slate-600 mb-1">Переработано</div>
              <div className="text-3xl font-display font-bold text-blue-600">
                {formatNumber(dayData.stats.totalProduction, 1)}
                <span className="text-lg ml-1 text-slate-500">т</span>
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="text-xs text-slate-600 mb-1">Средняя скорость</div>
              <div className="text-3xl font-display font-bold text-blue-500">
                {formatNumber(dayData.stats.averageSpeed, 1)}
                <span className="text-lg ml-1 text-slate-500">т/ч</span>
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="text-xs text-slate-600 mb-1">Текущая скорость</div>
              <div className="text-3xl font-display font-bold text-slate-800">
                {formatNumber(dayData.stats.currentSpeed, 1)}
                <span className="text-lg ml-1 text-slate-500">т/ч</span>
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="text-xs text-slate-600 mb-1">Выполнение плана</div>
              <div className={`text-3xl font-display font-bold ${
                dayData.stats.progress >= 100 ? 'text-emerald-500' :
                dayData.stats.progress >= 80 ? 'text-amber-500' :
                'text-rose-500'
              }`}>
                {formatNumber(dayData.stats.progress, 1)}
                <span className="text-lg ml-1 text-slate-500">%</span>
              </div>
            </div>
          </div>

          {/* Прогресс-бар */}
          <div className="mb-8">
            <div className="h-3 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
              <div
                className={`h-full transition-all duration-1000 ease-out ${
                  dayData.stats.progress >= 100 ? 'bg-gradient-to-r from-emerald-500 to-green-400' :
                  dayData.stats.progress >= 80 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' :
                  'bg-gradient-to-r from-rose-500 to-red-400'
                }`}
                style={{ width: `${Math.min(dayData.stats.progress, 100)}%` }}
              />
            </div>
          </div>

          {/* График */}
          <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
            <h3 className="text-lg font-display text-slate-700 tracking-wider mb-6">
              ГРАФИК ПРОИЗВОДСТВА (30-МИНУТНЫЕ ИНТЕРВАЛЫ)
            </h3>

            <div className="relative bg-white rounded-lg p-6 border border-slate-100">
              {/* Вычисляем позиции точек */}
              {(() => {
                const points = thirtyMinData.map((interval, index) => {
                  const x = (index / (thirtyMinData.length - 1 || 1)) * 100;
                  const y = 100 - ((interval.averageSpeed / maxSpeed) * 100);
                  const isAboveNorm = interval.averageSpeed >= TARGETS.hourly;
                  const isNearNorm = interval.averageSpeed >= TARGETS.hourly * 0.8;
                  return {
                    x, y, interval,
                    color: isAboveNorm ? '#10b981' : isNearNorm ? '#f59e0b' : '#ef4444',
                  };
                });

                const linePath = points.map((point: typeof points[0], index: number) => {
                  const command = index === 0 ? 'M' : 'L';
                  return `${command} ${point.x} ${point.y}`;
                }).join(' ');

                const normLineY = 100 - ((TARGETS.hourly / maxSpeed) * 100);

                return (
                  <>
                    {/* Контейнер SVG для линий */}
                    <svg
                      className="absolute inset-6 w-[calc(100%-48px)] h-80"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                    >
                      {/* Линия нормы */}
                      <line
                        x1="0" y1={normLineY} x2="100" y2={normLineY}
                        stroke="#f59e0b" strokeWidth="0.3"
                        strokeDasharray="2,2" opacity="0.6"
                      />
                      {/* Линия графика */}
                      <path
                        d={linePath} fill="none"
                        stroke="#3b82f6" strokeWidth="0.5"
                        strokeLinecap="round" strokeLinejoin="round"
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
                          key={index} className="absolute group"
                          style={{ left: `${point.x}%`, top: `${point.y}%`, transform: 'translate(-50%, -50%)' }}
                        >
                          <div
                            className="w-2 h-2 rounded-full border-2 border-white cursor-pointer hover:w-3 hover:h-3 transition-all z-10 relative"
                            style={{ backgroundColor: point.color }}
                          />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
                            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg whitespace-nowrap">
                              <div className="text-xs text-slate-500 mb-1 font-mono font-semibold">
                                {point.interval.time}
                              </div>
                              <div className="text-base font-bold text-blue-600">
                                {formatNumber(point.interval.averageSpeed, 1)} т/ч
                              </div>
                              <div className="text-xs text-slate-600 mt-1.5">
                                Переработано: {formatNumber(point.interval.totalProduction, 1)} т
                              </div>
                              <div className="text-xs text-slate-500">
                                Записей: {point.interval.recordCount}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
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

          {/* Информация о данных */}
          <div className="mt-6 text-center text-xs text-slate-600 font-mono">
            Всего записей: {dayData.data.length} • Интервалов: {thirtyMinData.length}
          </div>
        </div>
      </div>
    </div>
  );
}

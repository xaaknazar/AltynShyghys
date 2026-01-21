'use client';

import { useEffect, useState } from 'react';
import { formatNumber, TARGETS } from '@/lib/utils';

interface DailyStatsProps {
  totalProduction: number;
  averageSpeed: number;
  progress: number;
  periodStart: string;
  periodEnd: string;
}

export default function DailyStatsCard({ totalProduction, averageSpeed, progress, periodStart, periodEnd }: DailyStatsProps) {
  const [timeLeft, setTimeLeft] = useState({ shift: '', day: '' });
  const [currentShift, setCurrentShift] = useState<'day' | 'night'>('day');

  useEffect(() => {
    const updateTimeLeft = () => {
      const now = new Date();
      const utcNow = new Date(now.getTime());

      // Конвертируем в местное время (UTC+5)
      const localTime = new Date(utcNow.getTime() + 5 * 60 * 60 * 1000);
      const localHour = localTime.getUTCHours();
      const localMinute = localTime.getUTCMinutes();

      // Определяем текущую смену: дневная 08:00-20:00, ночная 20:00-08:00
      const isDayShift = localHour >= 8 && localHour < 20;
      setCurrentShift(isDayShift ? 'day' : 'night');

      // Конец суток: следующий день в 20:00 (производственные сутки 20:00-20:00)
      const dayEnd = new Date(localTime);
      if (localHour < 20) {
        // Если до 20:00, конец суток сегодня в 20:00
        dayEnd.setUTCHours(20, 0, 0, 0);
      } else {
        // Если после 20:00, конец суток завтра в 20:00
        dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
        dayEnd.setUTCHours(20, 0, 0, 0);
      }

      // Конец смены: ближайшие 08:00 или 20:00
      const shiftEnd = new Date(localTime);
      if (localHour < 8) {
        shiftEnd.setUTCHours(8, 0, 0, 0);
      } else if (localHour < 20) {
        shiftEnd.setUTCHours(20, 0, 0, 0);
      } else {
        shiftEnd.setUTCDate(shiftEnd.getUTCDate() + 1);
        shiftEnd.setUTCHours(8, 0, 0, 0);
      }

      // Вычисляем разницу
      const dayDiff = dayEnd.getTime() - localTime.getTime();
      const shiftDiff = shiftEnd.getTime() - localTime.getTime();

      const formatTime = (ms: number) => {
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}ч ${minutes}м`;
      };

      setTimeLeft({
        shift: formatTime(shiftDiff),
        day: formatTime(dayDiff),
      });
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 60000); // Обновляем каждую минуту
    return () => clearInterval(interval);
  }, []);

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
    <div className="bg-white rounded-2xl border-2 border-corporate-neutral-200 p-8 shadow-card-lg transition-all duration-300 hover:shadow-card-hover hover:border-corporate-primary-300">
      {/* Header Section */}
      <div className="mb-8 pb-6 border-b-2 border-corporate-neutral-100">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-3">
          <h3 className="text-xl lg:text-2xl font-display font-semibold text-corporate-neutral-900 tracking-tight">
            Производство за сегодняшние сутки
          </h3>
          <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 transition-all ${
            currentShift === 'day'
              ? 'bg-corporate-warning-50 border-corporate-warning-200 shadow-glow-warning'
              : 'bg-corporate-primary-50 border-corporate-primary-200 shadow-glow-primary'
          }`}>
            <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${
              currentShift === 'day' ? 'bg-corporate-warning-500' : 'bg-corporate-primary-500'
            }`} />
            <span className={`text-sm font-semibold ${
              currentShift === 'day' ? 'text-corporate-warning-700' : 'text-corporate-primary-700'
            }`}>
              {currentShift === 'day' ? 'Дневная смена' : 'Ночная смена'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-corporate-neutral-600 font-mono">
          <svg className="w-4 h-4 text-corporate-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">{formatTime(periodStart)}</span>
          <span className="text-corporate-neutral-400">→</span>
          <span className="font-medium">{formatTime(periodEnd)}</span>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Production Metric */}
        <div className="card-metric p-6 group">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-corporate-primary-100 flex items-center justify-center group-hover:bg-corporate-primary-200 transition-colors">
              <svg className="w-5 h-5 text-corporate-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="text-sm font-semibold text-corporate-neutral-600 uppercase tracking-wide">Произведено</div>
          </div>
          <div className="metric-value text-5xl font-bold text-corporate-primary-600 mb-2">
            {formatNumber(totalProduction, 1)}
            <span className="text-2xl ml-2 text-corporate-neutral-500">т</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-corporate-neutral-500 font-medium">
            <span>План:</span>
            <span className="font-semibold text-corporate-neutral-700">{TARGETS.daily} т</span>
          </div>
        </div>

        {/* Speed Metric */}
        <div className="card-metric p-6 group">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-corporate-secondary-100 flex items-center justify-center group-hover:bg-corporate-secondary-200 transition-colors">
              <svg className="w-5 h-5 text-corporate-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="text-sm font-semibold text-corporate-neutral-600 uppercase tracking-wide">Средняя скорость</div>
          </div>
          <div className="metric-value text-5xl font-bold text-corporate-secondary-600 mb-2">
            {formatNumber(averageSpeed, 1)}
            <span className="text-2xl ml-2 text-corporate-neutral-500">т/ч</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-corporate-neutral-500 font-medium">
            <span>Норма:</span>
            <span className="font-semibold text-corporate-neutral-700">{TARGETS.hourly} т/ч</span>
          </div>
        </div>

        {/* Progress Metric */}
        <div className="card-metric p-6 group">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
              progress >= 100 ? 'bg-corporate-success-100 group-hover:bg-corporate-success-200' :
              progress >= 80 ? 'bg-corporate-warning-100 group-hover:bg-corporate-warning-200' :
              'bg-corporate-danger-100 group-hover:bg-corporate-danger-200'
            }`}>
              <svg className={`w-5 h-5 ${
                progress >= 100 ? 'text-corporate-success-600' :
                progress >= 80 ? 'text-corporate-warning-600' :
                'text-corporate-danger-600'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="text-sm font-semibold text-corporate-neutral-600 uppercase tracking-wide">Выполнение плана</div>
          </div>
          <div className={`metric-value text-5xl font-bold mb-2 ${
            progress >= 100 ? 'text-corporate-success-600' :
            progress >= 80 ? 'text-corporate-warning-600' :
            'text-corporate-danger-600'
          }`}>
            {formatNumber(progress, 1)}
            <span className="text-2xl ml-2 text-corporate-neutral-500">%</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium">
            {progress >= 100 ? (
              <span className="text-corporate-success-600 font-semibold">✓ План выполнен</span>
            ) : (
              <>
                <span className="text-corporate-neutral-500">До плана:</span>
                <span className="font-semibold text-corporate-neutral-700">{formatNumber(TARGETS.daily - totalProduction, 0)} т</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-corporate-neutral-700">Прогресс выполнения</span>
          <span className={`text-sm font-bold font-mono ${
            progress >= 100 ? 'text-corporate-success-600' :
            progress >= 80 ? 'text-corporate-warning-600' :
            'text-corporate-danger-600'
          }`}>
            {formatNumber(progress, 1)}%
          </span>
        </div>
        <div className="h-5 bg-corporate-neutral-100 rounded-xl overflow-hidden border-2 border-corporate-neutral-200 shadow-inner">
          <div
            className={`h-full transition-all duration-1000 ease-out relative ${
              progress >= 100 ? 'bg-gradient-to-r from-corporate-success-600 to-corporate-success-500' :
              progress >= 80 ? 'bg-gradient-to-r from-corporate-warning-600 to-corporate-warning-500' :
              'bg-gradient-to-r from-corporate-danger-600 to-corporate-danger-500'
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
          </div>
        </div>
      </div>

      {/* Time Remaining Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
        <div className="bg-gradient-to-br from-corporate-warning-50 to-white rounded-xl p-5 border-2 border-corporate-warning-200 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-corporate-warning-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-corporate-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-xs font-semibold text-corporate-neutral-600 uppercase tracking-wide">Смена (12ч)</div>
          </div>
          <div className="metric-value text-2xl font-bold text-corporate-neutral-800 mb-2">
            {TARGETS.shift} т
            <span className="text-sm ml-2 text-corporate-neutral-500">план</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-corporate-warning-700 bg-corporate-warning-100 rounded-lg px-3 py-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-mono font-semibold">Осталось: {timeLeft.shift}</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-corporate-primary-50 to-white rounded-xl p-5 border-2 border-corporate-primary-200 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-corporate-primary-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-corporate-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-xs font-semibold text-corporate-neutral-600 uppercase tracking-wide">Сутки (24ч)</div>
          </div>
          <div className="metric-value text-2xl font-bold text-corporate-neutral-800 mb-2">
            {TARGETS.daily} т
            <span className="text-sm ml-2 text-corporate-neutral-500">план</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-corporate-primary-700 bg-corporate-primary-100 rounded-lg px-3 py-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-mono font-semibold">Осталось: {timeLeft.day}</span>
          </div>
        </div>
      </div>

      {/* Прогноз до конца суток */}
      {(() => {
        // Вычисляем прогноз на основе средней скорости и оставшегося времени
        const hoursLeft = parseFloat(timeLeft.day.split('ч')[0]) + parseFloat(timeLeft.day.split('ч ')[1]) / 60;
        const projectedProduction = totalProduction + (averageSpeed * hoursLeft);
        const projectedProgress = (projectedProduction / TARGETS.daily) * 100;
        const projectedDiff = projectedProduction - TARGETS.daily;

        return (
          <div className={`rounded-2xl p-6 border-2 transition-all ${
            projectedProgress >= 100 ? 'bg-gradient-to-br from-corporate-success-50 to-white border-corporate-success-300 shadow-glow-success' :
            projectedProgress >= 90 ? 'bg-gradient-to-br from-corporate-warning-50 to-white border-corporate-warning-300 shadow-glow-warning' :
            'bg-gradient-to-br from-corporate-danger-50 to-white border-corporate-danger-300 shadow-glow-danger'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                projectedProgress >= 100 ? 'bg-corporate-success-100' :
                projectedProgress >= 90 ? 'bg-corporate-warning-100' :
                'bg-corporate-danger-100'
              }`}>
                <svg className={`w-6 h-6 ${
                  projectedProgress >= 100 ? 'text-corporate-success-600' :
                  projectedProgress >= 90 ? 'text-corporate-warning-600' :
                  'text-corporate-danger-600'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-base font-semibold text-corporate-neutral-900 mb-2">
                  Прогноз до конца суток
                </div>
                <div className="text-sm text-corporate-neutral-600 mb-3">
                  При средней скорости <span className="font-mono font-semibold text-corporate-neutral-800">{formatNumber(averageSpeed, 1)} т/ч</span> за оставшиеся <span className="font-mono font-semibold text-corporate-neutral-800">{timeLeft.day}</span>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold font-mono text-corporate-primary-600">
                      {formatNumber(projectedProduction, 1)}
                    </span>
                    <span className="text-sm text-corporate-neutral-500 font-medium">тонн</span>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono font-semibold text-sm ${
                    projectedDiff >= 0
                      ? 'bg-corporate-success-100 text-corporate-success-700'
                      : 'bg-corporate-danger-100 text-corporate-danger-700'
                  }`}>
                    <span className="text-lg">{projectedDiff >= 0 ? '↑' : '↓'}</span>
                    <span>{formatNumber(Math.abs(projectedDiff), 1)} т</span>
                    <span className="text-xs opacity-75">({projectedDiff >= 0 ? '+' : ''}{formatNumber(projectedDiff, 0)} т от плана)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
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

      // Конец суток: следующий день в 08:00 (производственные сутки 08:00-08:00)
      const dayEnd = new Date(localTime);
      if (localHour < 8) {
        // Если до 08:00, конец суток сегодня в 08:00
        dayEnd.setUTCHours(8, 0, 0, 0);
      } else {
        // Если после 08:00, конец суток завтра в 08:00
        dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
        dayEnd.setUTCHours(8, 0, 0, 0);
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
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-display font-bold text-slate-700 tracking-wider">
            ПРОИЗВОДСТВО ЗА СУТКИ
          </h3>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
            currentShift === 'day'
              ? 'bg-amber-50 border-amber-200'
              : 'bg-indigo-50 border-indigo-200'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              currentShift === 'day' ? 'bg-amber-500' : 'bg-indigo-500'
            }`} />
            <span className={`text-sm font-bold ${
              currentShift === 'day' ? 'text-amber-700' : 'text-indigo-700'
            }`}>
              {currentShift === 'day' ? 'Дневная смена' : 'Ночная смена'}
            </span>
          </div>
        </div>
        <div className="text-sm text-slate-600 font-mono font-semibold">
          {formatTime(periodStart)} → {formatTime(periodEnd)}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="space-y-2">
          <div className="text-sm text-slate-600 font-bold">Произведено</div>
          <div className="text-4xl font-display font-bold text-blue-600">
            {formatNumber(totalProduction, 1)}
            <span className="text-xl ml-1 text-slate-500">т</span>
          </div>
          <div className="text-xs text-slate-500 font-semibold">
            из {TARGETS.daily} т (план)
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm text-slate-600 font-bold">Средняя скорость</div>
          <div className="text-4xl font-display font-bold text-blue-500">
            {formatNumber(averageSpeed, 1)}
            <span className="text-xl ml-1 text-slate-500">т/ч</span>
          </div>
          <div className="text-xs text-slate-500 font-semibold">
            норма {TARGETS.hourly} т/ч
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm text-slate-600 font-bold">Выполнение плана</div>
          <div className={`text-4xl font-display font-bold ${
            progress >= 100 ? 'text-emerald-500' :
            progress >= 80 ? 'text-amber-500' :
            'text-rose-500'
          }`}>
            {formatNumber(progress, 1)}
            <span className="text-xl ml-1 text-slate-500">%</span>
          </div>
          <div className="text-xs text-slate-500 font-semibold">
            {progress >= 100 ? 'План выполнен' : `До плана ${formatNumber(TARGETS.daily - totalProduction, 0)} т`}
          </div>
        </div>
      </div>

      <div>
        <div className="h-4 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
          <div
            className={`h-full transition-all duration-1000 ease-out ${
              progress >= 100 ? 'bg-gradient-to-r from-emerald-500 to-green-400' :
              progress >= 80 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' :
              'bg-gradient-to-r from-rose-500 to-red-400'
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
          <div className="text-xs text-slate-600 font-bold mb-1">Смена (12ч)</div>
          <div className="text-lg font-mono text-slate-800">{TARGETS.shift} т</div>
          <div className="text-xs text-blue-600 mt-1 font-mono">
            ⏱ Осталось: {timeLeft.shift}
          </div>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
          <div className="text-xs text-slate-600 font-bold mb-1">Сутки (24ч)</div>
          <div className="text-lg font-mono text-slate-800">{TARGETS.daily} т</div>
          <div className="text-xs text-blue-600 mt-1 font-mono">
            ⏱ Осталось: {timeLeft.day}
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
          <div className={`mt-4 rounded-xl p-4 border-2 ${
            projectedProgress >= 100 ? 'bg-emerald-50 border-emerald-200' :
            projectedProgress >= 90 ? 'bg-amber-50 border-amber-200' :
            'bg-rose-50 border-rose-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`text-2xl ${
                projectedProgress >= 100 ? 'text-emerald-500' :
                projectedProgress >= 90 ? 'text-amber-500' :
                'text-rose-500'
              }`}>
                📊
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-slate-700 mb-1">
                  Прогноз до конца суток
                </div>
                <div className="text-xs text-slate-600 mb-2">
                  При средней скорости {formatNumber(averageSpeed, 1)} т/ч за оставшиеся {timeLeft.day}
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-xl font-display font-bold text-blue-600">
                      {formatNumber(projectedProduction, 1)}
                    </span>
                    <span className="text-sm text-slate-500 ml-1">т</span>
                  </div>
                  <div className={`text-sm font-mono font-bold ${
                    projectedDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {projectedDiff >= 0 ? '↑' : '↓'} {formatNumber(Math.abs(projectedDiff), 1)} т
                    ({projectedDiff >= 0 ? '+' : ''}{formatNumber(projectedDiff, 0)} т от плана)
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
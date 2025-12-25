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

  useEffect(() => {
    const updateTimeLeft = () => {
      const now = new Date();
      const utcNow = new Date(now.getTime());

      // Конвертируем в местное время (UTC+5)
      const localTime = new Date(utcNow.getTime() + 5 * 60 * 60 * 1000);
      const localHour = localTime.getUTCHours();
      const localMinute = localTime.getUTCMinutes();

      // Конец суток: следующий день в 20:00
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
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-display text-slate-700 tracking-wider mb-2">
          ПРОИЗВОДСТВО ЗА СУТКИ
        </h3>
        <div className="text-sm text-slate-600 font-mono">
          {formatTime(periodStart)} → {formatTime(periodEnd)}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="space-y-2">
          <div className="text-sm text-slate-600 font-mono">Произведено</div>
          <div className="text-4xl font-display font-bold text-blue-600">
            {formatNumber(totalProduction, 1)}
            <span className="text-xl ml-1 text-slate-500">т</span>
          </div>
          <div className="text-xs text-slate-500">
            из {TARGETS.daily} т (план)
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm text-slate-600 font-mono">Средняя скорость</div>
          <div className="text-4xl font-display font-bold text-blue-500">
            {formatNumber(averageSpeed, 1)}
            <span className="text-xl ml-1 text-slate-500">т/ч</span>
          </div>
          <div className="text-xs text-slate-500">
            норма {TARGETS.hourly} т/ч
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm text-slate-600 font-mono">Выполнение плана</div>
          <div className={`text-4xl font-display font-bold ${
            progress >= 100 ? 'text-emerald-500' :
            progress >= 80 ? 'text-amber-500' :
            'text-rose-500'
          }`}>
            {formatNumber(progress, 1)}
            <span className="text-xl ml-1 text-slate-500">%</span>
          </div>
          <div className="text-xs text-slate-500">
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
          <div className="text-xs text-slate-600 mb-1">Смена (12ч)</div>
          <div className="text-lg font-mono text-slate-800">{TARGETS.shift} т</div>
          <div className="text-xs text-blue-600 mt-1 font-mono">
            ⏱ Осталось: {timeLeft.shift}
          </div>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
          <div className="text-xs text-slate-600 mb-1">Сутки (24ч)</div>
          <div className="text-lg font-mono text-slate-800">{TARGETS.daily} т</div>
          <div className="text-xs text-blue-600 mt-1 font-mono">
            ⏱ Осталось: {timeLeft.day}
          </div>
        </div>
      </div>
    </div>
  );
}
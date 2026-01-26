'use client';

/**
 * Enterprise Production Dashboard - главная страница
 * Data-driven, минималистичный интерфейс для промышленного мониторинга
 * Архитектура: Header → KPI Grid → Forecast → Monthly Summary
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import KPIMetricCard from '@/app/components/KPIMetricCard';
import ForecastBlock from '@/app/components/ForecastBlock';
import LoadingState from '@/app/components/LoadingState';
import ErrorState from '@/app/components/ErrorState';
import { ProductionData, calculateDailyStats, DailyGroupedData, TARGETS, isPPRDay, countWorkingDays } from '@/lib/utils';

interface LatestDataResponse {
  success: boolean;
  data: ProductionData;
}

interface MonthlyApiResponse {
  success: boolean;
  data: ProductionData[];
  dailyGrouped: DailyGroupedData[];
  period: { start: string; end: string };
  count: number;
  daysCount: number;
}

export default function HomePage() {
  const [latestData, setLatestData] = useState<ProductionData | null>(null);
  const [monthlyData, setMonthlyData] = useState<ProductionData[]>([]);
  const [dailyGrouped, setDailyGrouped] = useState<DailyGroupedData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setError(null);

      const [latestResponse, monthlyResponse] = await Promise.all([
        fetch('/api/production/latest', { cache: 'no-store' }),
        fetch('/api/production/monthly', { cache: 'no-store' })
      ]);

      const latestResult: LatestDataResponse = await latestResponse.json();
      const monthlyResult: MonthlyApiResponse = await monthlyResponse.json();

      if (latestResult.success && monthlyResult.success) {
        setLatestData(latestResult.data);
        setMonthlyData(monthlyResult.data);
        setDailyGrouped(monthlyResult.dailyGrouped);
        setLastUpdate(new Date(latestResult.data.datetime));
      } else {
        setError('Ошибка при загрузке данных');
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Не удалось подключиться к серверу');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 300000); // 5 минут
    return () => clearInterval(interval);
  }, []);

  const currentDayData = dailyGrouped[dailyGrouped.length - 1];
  const currentStats = currentDayData?.stats || calculateDailyStats([]);

  // Вычисления для KPI и прогноза
  const currentSpeed = latestData?.speed || 0;

  // Рассчитываем время с начала ПРОИЗВОДСТВЕННЫХ суток (20:00 вчера)
  const now = new Date();
  const startOfProductionDay = new Date(now);

  // Если сейчас до 20:00, то сутки начались вчера в 20:00
  // Если после 20:00, то сутки начались сегодня в 20:00
  if (now.getHours() < 20) {
    startOfProductionDay.setDate(startOfProductionDay.getDate() - 1);
  }
  startOfProductionDay.setHours(20, 0, 0, 0);

  const hoursPassed = (now.getTime() - startOfProductionDay.getTime()) / (1000 * 60 * 60);

  // Производство за производственные сутки (API уже возвращает правильные данные)
  const produced = currentStats.totalProduction;

  // Средняя скорость берем из базы данных
  const averageSpeed = currentStats.averageSpeed || 0;

  // Определяем текущую смену и среднюю скорость смены
  const currentHour = now.getHours();
  const isNightShift = currentHour >= 20 || currentHour < 8;

  // Рассчитываем среднюю скорость текущей смены
  let shiftAverageSpeed = averageSpeed; // По умолчанию берем среднюю за производственные сутки
  if (currentDayData?.data && currentDayData.data.length > 0) {
    const shiftData = currentDayData.data.filter(d => {
      const dataHour = new Date(d.datetime).getHours();
      if (isNightShift) {
        return dataHour >= 20 || dataHour < 8;
      } else {
        return dataHour >= 8 && dataHour < 20;
      }
    });

    if (shiftData.length > 0) {
      shiftAverageSpeed = shiftData.reduce((sum, d) => sum + d.speed, 0) / shiftData.length;
    }
  }

  // Рассчитываем текущий план пропорционально времени
  const currentPlan = (hoursPassed / 24) * TARGETS.daily;
  const deviation = produced - currentPlan;
  const deviationPercent = (deviation / currentPlan) * 100;

  // Прогноз до конца ПРОИЗВОДСТВЕННЫХ суток (20:00)
  const endOfProductionDay = new Date(now);

  // Если сейчас до 20:00, то конец суток сегодня в 20:00
  // Если после 20:00, то конец суток завтра в 20:00
  if (now.getHours() >= 20) {
    endOfProductionDay.setDate(endOfProductionDay.getDate() + 1);
  }
  endOfProductionDay.setHours(20, 0, 0, 0);

  const hoursRemaining = Math.max(0, (endOfProductionDay.getTime() - now.getTime()) / (1000 * 60 * 60));
  const forecast = produced + (averageSpeed * hoursRemaining);

  // Определяем статус
  const status = deviationPercent >= 0 ? 'ok' :
                 deviationPercent >= -10 ? 'warning' :
                 'critical';

  // Уверенность прогноза - зависит от стабильности производства
  // Если отклонение небольшое и производство стабильное - высокая уверенность
  const confidence = Math.abs(deviationPercent) <= 5 ? 'high' :
                    Math.abs(deviationPercent) <= 15 ? 'medium' :
                    'low';

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header с логотипом */}
      <header className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <img
                src="/logo.jpg"
                alt="Altyn Shyghys"
                className="h-12 w-auto object-contain"
              />
              <div className="h-8 w-px bg-slate-300"></div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  Производственная панель
                </span>
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-semibold text-emerald-700">Производство работает</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/shift-master"
                className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 border border-slate-300 rounded hover:bg-slate-50 transition-colors"
              >
                Мастер смены
              </Link>
              <Link
                href="/analysis/production"
                className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 border border-slate-300 rounded hover:bg-slate-50 transition-colors"
              >
                Анализ
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-8">
        {/* KPI Grid - ключевые метрики */}
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-wider font-semibold text-slate-600 mb-4">
            Ключевые показатели
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border-2 border-slate-200 rounded-lg p-5">
              <div className="text-xs uppercase tracking-wider font-semibold text-slate-600 mb-3">
                Текущая скорость
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-bold tabular-nums text-slate-900">
                  {currentSpeed.toFixed(1)}
                </span>
                <span className="text-lg text-slate-600 font-medium">т/ч</span>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Средняя за сутки:</span>
                  <span className="font-semibold text-slate-900">{averageSpeed.toFixed(1)} т/ч</span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">
                    {isNightShift ? 'Ночная смена:' : 'Дневная смена:'}
                  </span>
                  <span className="font-semibold text-slate-900">{shiftAverageSpeed.toFixed(1)} т/ч</span>
                </div>
              </div>
            </div>
            <div className="bg-white border-2 border-slate-200 rounded-lg p-5">
              <div className="text-xs uppercase tracking-wider font-semibold text-slate-600 mb-3">
                Произведено за сутки
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-bold tabular-nums text-slate-900">
                  {produced.toFixed(1)}
                </span>
                <span className="text-lg text-slate-600 font-medium">т</span>
              </div>
              <div className="text-xs text-slate-500 mb-2">
                Прошло {hoursPassed.toFixed(1)} ч / Осталось {hoursRemaining.toFixed(1)} ч
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">План на текущий момент:</span>
                <span className="font-semibold text-slate-900">{currentPlan.toFixed(0)} т</span>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Выполнение плана:</span>
                  <span className={`font-bold ${
                    (produced / currentPlan) * 100 >= 100 ? 'text-emerald-600' :
                    (produced / currentPlan) * 100 >= 80 ? 'text-amber-600' :
                    'text-red-600'
                  }`}>
                    {((produced / currentPlan) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
            <KPIMetricCard
              label="План на сутки"
              value={TARGETS.daily}
              unit="т"
              format="integer"
            />
            <div className="bg-white border-2 border-slate-200 rounded-lg p-5">
              <div className="text-xs uppercase tracking-wider font-semibold text-slate-600 mb-3">
                Разница от плана
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className={`text-4xl font-bold tabular-nums ${
                  deviation >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {deviation >= 0 ? '+' : ''}{deviation.toFixed(1)}
                </span>
                <span className="text-lg text-slate-600 font-medium">т</span>
                {deviation >= 0 ? (
                  <span className="text-2xl text-emerald-600">↑</span>
                ) : (
                  <span className="text-2xl text-red-600">↓</span>
                )}
              </div>
              <div className="text-xs text-slate-500 mb-2">
                ({deviation >= 0 ? '+' : ''}{deviationPercent.toFixed(1)}%)
              </div>
              <div className="mt-2 pt-2 border-t border-slate-200">
                <div className="text-xs text-center">
                  <span className={`font-bold ${
                    deviation >= 0 ? 'text-emerald-700' : 'text-red-700'
                  }`}>
                    {deviation >= 0
                      ? '✓ Идем больше плана'
                      : '✗ Идем меньше плана'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Forecast Block - прогноз */}
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-wider font-semibold text-slate-600 mb-4">
            Прогноз производства
          </h2>
          <ForecastBlock
            forecast={forecast}
            plan={TARGETS.daily}
            confidence={confidence}
            hoursRemaining={Math.round(hoursRemaining)}
          />
        </section>

        {/* Monthly Summary - вторичная информация */}
        <section>
          <h2 className="text-xs uppercase tracking-wider font-semibold text-slate-600 mb-4">
            Сводка за месяц
          </h2>

          {/* Общие показатели за месяц */}
          {(() => {
            const totalProduced = dailyGrouped.reduce((sum, day) => sum + day.stats.totalProduction, 0);

            // Подсчитываем рабочие дни (исключая ППР)
            const allDates = dailyGrouped.map(day => day.date);
            const workingDaysCount = countWorkingDays(allDates);
            const totalPlan = workingDaysCount * TARGETS.daily;

            const totalCompletion = totalPlan > 0 ? (totalProduced / totalPlan) * 100 : 0;

            return (
              <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-5 mb-4">
                <div className="grid grid-cols-3 gap-6">
                  {/* Произведено */}
                  <div>
                    <div className="text-xs uppercase tracking-wider font-semibold text-slate-600 mb-2">
                      Произведено, т
                    </div>
                    <div className="text-2xl font-bold tabular-nums text-slate-900">
                      {totalProduced.toFixed(0)}
                    </div>
                  </div>

                  {/* План */}
                  <div>
                    <div className="text-xs uppercase tracking-wider font-semibold text-slate-600 mb-2">
                      План, т
                    </div>
                    <div className="text-2xl font-bold tabular-nums text-slate-700">
                      {totalPlan.toFixed(0)}
                    </div>
                  </div>

                  {/* Выполнение */}
                  <div>
                    <div className="text-xs uppercase tracking-wider font-semibold text-slate-600 mb-2">
                      Выполнение, %
                    </div>
                    <div className={`text-2xl font-bold tabular-nums ${
                      totalCompletion >= 100 ? 'text-emerald-600' :
                      totalCompletion >= 80 ? 'text-amber-600' :
                      'text-red-600'
                    }`}>
                      {totalCompletion.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Дата</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Произведено, т</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">План, т</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Выполнение, %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailyGrouped.reverse().map((day, idx) => {
                  const isPPR = isPPRDay(day.date);
                  const completion = (day.stats.totalProduction / TARGETS.daily) * 100;
                  // Парсим дату локально, избегая проблем с часовыми поясами
                  const [year, month, dayNum] = day.date.split('-').map(Number);
                  const localDate = new Date(year, month - 1, dayNum);
                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {localDate.toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: 'short'
                        })}
                        {isPPR && (
                          <span className="ml-2 text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded">
                            ППР
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-slate-900 text-right tabular-nums">
                        {day.stats.totalProduction.toFixed(0)}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-slate-600 text-right tabular-nums">
                        {isPPR ? (
                          <span className="text-orange-600 font-semibold">—</span>
                        ) : (
                          TARGETS.daily.toFixed(0)
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-right tabular-nums">
                        {isPPR ? (
                          <span className="text-orange-600">—</span>
                        ) : (
                          <span className={
                            completion >= 100 ? 'text-emerald-600' :
                            completion >= 80 ? 'text-amber-600' :
                            'text-red-600'
                          }>
                            {completion.toFixed(0)}%
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-200 bg-white">
        <div className="container mx-auto px-4 lg:px-8 py-6">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>© 2025 Altyn Shyghys. Система мониторинга производства.</span>
            <button
              onClick={fetchData}
              className="px-3 py-1.5 text-slate-600 hover:text-slate-900 border border-slate-300 rounded hover:bg-slate-50 transition-colors"
            >
              Обновить
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

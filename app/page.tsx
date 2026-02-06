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
import { ProductionData, calculateDailyStats, DailyGroupedData, TARGETS, isPPRDay, countWorkingDays, TIMEZONE_OFFSET } from '@/lib/utils';
import { format } from 'date-fns';

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

  // Рассчитываем время с начала ПРОИЗВОДСТВЕННЫХ суток (08:00)
  const now = new Date();

  // Используем местное время UTC+5 для всех расчетов
  const localNow = new Date(now.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);
  const currentHour = localNow.getUTCHours();

  // Определяем текущую дату для проверки ППР
  const todayDate = format(localNow, 'yyyy-MM-dd');
  const isTodayPPR = isPPRDay(todayDate);

  const startOfProductionDay = new Date(now);

  // Если сейчас до 08:00, то сутки начались вчера в 08:00
  // Если после 08:00, то сутки начались сегодня в 08:00
  if (currentHour < 8) {
    startOfProductionDay.setDate(startOfProductionDay.getDate() - 1);
  }
  startOfProductionDay.setHours(8, 0, 0, 0);

  const hoursPassed = (now.getTime() - startOfProductionDay.getTime()) / (1000 * 60 * 60);

  // Производство за производственные сутки (API уже возвращает правильные данные)
  const produced = currentStats.totalProduction;

  // Средняя скорость берем из базы данных
  const averageSpeed = currentStats.averageSpeed || 0;
  const isNightShift = currentHour >= 20 || currentHour < 8; // Ночная смена: 20:00-08:00

  // Рассчитываем среднюю скорость текущей смены
  let shiftAverageSpeed = averageSpeed; // По умолчанию берем среднюю за производственные сутки
  if (currentDayData?.data && currentDayData.data.length > 0) {
    const shiftData = currentDayData.data.filter(d => {
      const dataDateTime = new Date(d.datetime);
      const localDataTime = new Date(dataDateTime.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);
      const dataHour = localDataTime.getUTCHours();
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

  // Прогноз до конца ПРОИЗВОДСТВЕННЫХ суток (08:00)
  const endOfProductionDay = new Date(now);

  // Если сейчас до 08:00, то конец суток сегодня в 08:00
  // Если после 08:00, то конец суток завтра в 08:00
  if (currentHour >= 8) {
    endOfProductionDay.setDate(endOfProductionDay.getDate() + 1);
  }
  endOfProductionDay.setHours(8, 0, 0, 0);

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
                {isTodayPPR ? (
                  <div className="flex items-center gap-2 px-3 py-1 bg-orange-50 border border-orange-200 rounded">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-xs font-semibold text-orange-700">ППР (плановый ремонт)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-semibold text-emerald-700">Производство работает</span>
                  </div>
                )}
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
                Переработано за сутки
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
              {isTodayPPR ? (
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <div className="text-xs text-center">
                    <span className="font-semibold text-orange-600">ППР — план не учитывается</span>
                  </div>
                </div>
              ) : (
                <>
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
                </>
              )}
            </div>
            {isTodayPPR ? (
              <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-5">
                <div className="text-xs uppercase tracking-wider font-semibold text-orange-600 mb-3">
                  План на сутки
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-bold tabular-nums text-orange-600">
                    —
                  </span>
                </div>
                <div className="mt-2 pt-2 border-t border-orange-200">
                  <div className="text-xs text-center">
                    <span className="font-semibold text-orange-600">ППР день</span>
                  </div>
                </div>
              </div>
            ) : (
              <KPIMetricCard
                label="План на сутки"
                value={TARGETS.daily}
                unit="т"
                format="integer"
              />
            )}
            {isTodayPPR ? (
              <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-5">
                <div className="text-xs uppercase tracking-wider font-semibold text-orange-600 mb-3">
                  Статус ППР
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-2xl font-bold text-orange-700">
                    Плановый ремонт
                  </span>
                </div>
                <div className="mt-2 pt-2 border-t border-orange-200">
                  <div className="text-xs text-center">
                    <span className="font-semibold text-orange-600">
                      План не учитывается
                    </span>
                  </div>
                </div>
              </div>
            ) : (
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
            )}
          </div>
        </section>

        {/* Forecast Block - прогноз */}
        {isTodayPPR ? (
          <section className="mb-8">
            <h2 className="text-xs uppercase tracking-wider font-semibold text-slate-600 mb-4">
              Статус производства
            </h2>
            <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-orange-800">Планово-предупредительный ремонт</h3>
                  <p className="text-sm text-orange-600 mt-1">
                    Сегодня день ППР — производственный план не учитывается
                  </p>
                </div>
              </div>
            </div>
          </section>
        ) : (
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
        )}

        {/* Monthly Summary - вторичная информация */}
        <section>
          <h2 className="text-xs uppercase tracking-wider font-semibold text-slate-600 mb-4">
            Сводка за месяц
          </h2>

          {/* Общие показатели за месяц */}
          {(() => {
            // Исключаем текущий день из сводки (последний элемент)
            const completedDays = dailyGrouped.slice(0, -1);
            const totalProduced = completedDays.reduce((sum, day) => sum + day.stats.totalProduction, 0);

            // Подсчитываем рабочие дни (исключая ППР)
            const allDates = completedDays.map(day => day.date);
            const workingDaysCount = countWorkingDays(allDates);
            const totalPlan = workingDaysCount * TARGETS.daily;

            const totalCompletion = totalPlan > 0 ? (totalProduced / totalPlan) * 100 : 0;

            const averagePerDay = workingDaysCount > 0 ? totalProduced / workingDaysCount : 0;

            return (
              <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-5 mb-4">
                <div className="grid grid-cols-4 gap-6">
                  {/* Переработано */}
                  <div>
                    <div className="text-xs uppercase tracking-wider font-semibold text-slate-600 mb-2">
                      Переработано, т
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

                  {/* Среднее за сутки */}
                  <div>
                    <div className="text-xs uppercase tracking-wider font-semibold text-slate-600 mb-2">
                      Среднее за сутки, т
                    </div>
                    <div className="text-2xl font-bold tabular-nums text-slate-900">
                      {averagePerDay.toFixed(0)}
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
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Переработано, т</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">План, т</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Выполнение, %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailyGrouped.slice(0, -1).reverse().map((day, idx) => {
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
        <div className="container mx-auto px-4 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Левая часть - компания */}
            <div className="flex flex-col items-center md:items-start gap-1">
              <div className="flex items-center gap-3">
                <img
                  src="/logo.jpg"
                  alt="Altyn Shyghys"
                  className="h-8 w-auto object-contain"
                />
                <span className="text-sm font-semibold text-slate-700">ТОО «Алтын Шығыс»</span>
              </div>
              <span className="text-xs text-slate-500">
                © {new Date().getFullYear()} Altyn Shyghys. Все права защищены.
              </span>
            </div>

            {/* Правая часть - разработчик */}
            <div className="flex flex-col items-center md:items-end gap-1">
              <span className="text-xs text-slate-500">Разработано:</span>
              <a
                href="https://wa.me/77085362570"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                xaaknazar
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

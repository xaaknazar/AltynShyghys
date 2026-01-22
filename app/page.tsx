'use client';

/**
 * Enterprise Production Dashboard - главная страница
 * Data-driven, минималистичный интерфейс для промышленного мониторинга
 * Архитектура: StatusBar → KPI Grid → Forecast → Chart → Monthly Summary
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatusBar from '@/app/components/StatusBar';
import KPIMetricCard from '@/app/components/KPIMetricCard';
import ForecastBlock from '@/app/components/ForecastBlock';
import CurrentDayChart from '@/app/components/CurrentDayChart';
import LoadingState from '@/app/components/LoadingState';
import ErrorState from '@/app/components/ErrorState';
import { ProductionData, calculateDailyStats, DailyGroupedData, aggregateToThirtyMinutes, ThirtyMinuteData, TARGETS } from '@/lib/utils';

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
  const [currentDayThirtyMin, setCurrentDayThirtyMin] = useState<ThirtyMinuteData[]>([]);
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

        const currentDay = monthlyResult.dailyGrouped[monthlyResult.dailyGrouped.length - 1];
        if (currentDay?.data) {
          setCurrentDayThirtyMin(aggregateToThirtyMinutes(currentDay.data));
        }

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
  const produced = currentStats.totalProduction;
  const plan = TARGETS.daily;
  const deviation = produced - plan;
  const deviationPercent = (deviation / plan) * 100;

  // Прогноз до конца суток
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const hoursRemaining = Math.max(0, (endOfDay.getTime() - now.getTime()) / (1000 * 60 * 60));
  const forecast = produced + (currentSpeed * hoursRemaining);

  // Определяем статус
  const status = deviationPercent >= 0 ? 'ok' :
                 deviationPercent >= -10 ? 'warning' :
                 'critical';

  // Уверенность прогноза
  const confidence = hoursRemaining > 8 ? 'low' :
                    hoursRemaining > 4 ? 'medium' :
                    'high';

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Status Bar - индикатор состояния */}
      <StatusBar
        status={status}
        deviation={deviation}
        deviationPercent={deviationPercent}
        lastUpdate={lastUpdate}
      />

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
              <span className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
                Производственная панель
              </span>
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
            <KPIMetricCard
              label="Текущая скорость"
              value={currentSpeed}
              unit="т/ч"
              target={TARGETS.hourly}
              status={currentSpeed >= TARGETS.hourly ? 'normal' : currentSpeed >= TARGETS.hourly * 0.8 ? 'warning' : 'critical'}
            />
            <KPIMetricCard
              label="Произведено за сутки"
              value={produced}
              unit="т"
              target={plan}
            />
            <KPIMetricCard
              label="План на сутки"
              value={plan}
              unit="т"
              format="integer"
            />
            <KPIMetricCard
              label="Отклонение"
              value={Math.abs(deviation)}
              unit="т"
              trend={deviation >= 0 ? 'up' : 'down'}
              status={status === 'ok' ? 'normal' : status}
            />
          </div>
        </section>

        {/* Forecast Block - прогноз */}
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-wider font-semibold text-slate-600 mb-4">
            Прогноз производства
          </h2>
          <ForecastBlock
            forecast={forecast}
            plan={plan}
            confidence={confidence}
            hoursRemaining={Math.round(hoursRemaining)}
          />
        </section>

        {/* Production Chart - основной график */}
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-wider font-semibold text-slate-600 mb-4">
            Динамика производства (текущие сутки)
          </h2>
          <div className="bg-white border-2 border-slate-200 rounded-lg p-6">
            <CurrentDayChart data={currentDayThirtyMin} />
          </div>
        </section>

        {/* Monthly Summary - вторичная информация */}
        <section>
          <h2 className="text-xs uppercase tracking-wider font-semibold text-slate-600 mb-4">
            Сводка за месяц (последние 7 дней)
          </h2>
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
                {dailyGrouped.slice(-7).reverse().map((day, idx) => {
                  const completion = (day.stats.totalProduction / TARGETS.daily) * 100;
                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {new Date(day.date).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: 'short'
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-slate-900 text-right tabular-nums">
                        {day.stats.totalProduction.toFixed(0)}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-slate-600 text-right tabular-nums">
                        {TARGETS.daily.toFixed(0)}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-right tabular-nums">
                        <span className={
                          completion >= 100 ? 'text-emerald-600' :
                          completion >= 80 ? 'text-amber-600' :
                          'text-red-600'
                        }>
                          {completion.toFixed(0)}%
                        </span>
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

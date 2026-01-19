'use client';

import { useEffect, useState } from 'react';
import DailyStatsCard from '@/app/components/DailyStatsCard';
import CurrentDayChart from '@/app/components/CurrentDayChart';
import DayDetailModal from '@/app/components/DayDetailModal';
import LoadingState from '@/app/components/LoadingState';
import ErrorState from '@/app/components/ErrorState';
import { ProductionData, calculateDailyStats, DailyGroupedData, aggregateToThirtyMinutes, ThirtyMinuteData } from '@/lib/utils';

interface LatestDataResponse {
  success: boolean;
  data: ProductionData;
}

interface MonthlyApiResponse {
  success: boolean;
  data: ProductionData[];
  dailyGrouped: DailyGroupedData[];
  period: {
    start: string;
    end: string;
  };
  count: number;
  daysCount: number;
}

export default function HomePage() {
  const [latestData, setLatestData] = useState<ProductionData | null>(null);
  const [monthlyData, setMonthlyData] = useState<ProductionData[]>([]);
  const [dailyGrouped, setDailyGrouped] = useState<DailyGroupedData[]>([]);
  const [currentDayThirtyMin, setCurrentDayThirtyMin] = useState<ThirtyMinuteData[]>([]);
  const [selectedDay, setSelectedDay] = useState<DailyGroupedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>(new Date().toISOString());
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setError(null);

      // Получаем последнюю запись для текущей скорости
      const latestResponse = await fetch('/api/production/latest', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });
      const latestResult: LatestDataResponse = await latestResponse.json();

      // Получаем месячные данные
      const monthlyResponse = await fetch('/api/production/monthly', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });
      const monthlyResult: MonthlyApiResponse = await monthlyResponse.json();

      if (latestResult.success && monthlyResult.success) {
        setLatestData(latestResult.data);
        setMonthlyData(monthlyResult.data);
        setDailyGrouped(monthlyResult.dailyGrouped);

        // Получаем данные текущих суток и группируем по 30-минутным интервалам
        const currentDay = monthlyResult.dailyGrouped[monthlyResult.dailyGrouped.length - 1];
        if (currentDay && currentDay.data) {
          const thirtyMinData = aggregateToThirtyMinutes(currentDay.data);
          setCurrentDayThirtyMin(thirtyMinData);
        }

        // Используем время последней записи из БД как время обновления
        setLastUpdate(latestResult.data.datetime);
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
    // Обновление каждые 5 минут (300000 мс)
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  // Текущие сутки - последний день в месячных данных
  const currentDayData = dailyGrouped.length > 0 ? dailyGrouped[dailyGrouped.length - 1] : null;
  const currentStats = currentDayData ? currentDayData.stats : calculateDailyStats([]);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchData} />;
  }

  const currentPeriod = currentDayData ? {
    start: currentDayData.data[0]?.datetime,
    end: currentDayData.data[currentDayData.data.length - 1]?.datetime,
  } : null;

  return (
    <div className="min-h-screen bg-corporate-neutral-50">
      <header className="bg-white backdrop-blur-md border-b-2 border-corporate-neutral-200 sticky top-0 z-50 shadow-card">
        <div className="container mx-auto px-4 lg:px-8 py-6">
          <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
            {/* Левая часть с названием и текущей подачей */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 w-full xl:w-auto">
              <div>
                <h1 className="text-3xl lg:text-4xl font-display font-bold text-corporate-primary-600 tracking-tight">
                  Altyn Shyghys
                </h1>
                <p className="text-sm text-corporate-neutral-600 mt-1.5 font-medium">
                  Производственная панель мониторинга
                </p>
              </div>

              {/* Компактный индикатор текущей подачи */}
              {latestData && (
                <div className="flex items-center gap-4 bg-gradient-to-r from-corporate-neutral-50 to-white rounded-xl px-5 py-3.5 border-2 border-corporate-neutral-200 shadow-card">
                  <div className="flex flex-col">
                    <div className="text-xs text-corporate-neutral-600 uppercase tracking-wider font-semibold whitespace-nowrap mb-1">
                      Текущая подача
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`metric-value text-3xl font-bold whitespace-nowrap ${
                        latestData.speed >= 50 ? 'text-corporate-success-600' :
                        latestData.speed >= 45 ? 'text-corporate-warning-600' :
                        'text-corporate-danger-600'
                      }`}>
                        {latestData.speed.toFixed(1)}
                        <span className="text-base ml-1.5 text-corporate-neutral-500">т/ч</span>
                      </div>
                      <div className={`w-2.5 h-2.5 rounded-full animate-pulse shadow-lg ${
                        latestData.speed >= 50 ? 'bg-corporate-success-500' :
                        latestData.speed >= 45 ? 'bg-corporate-warning-500' :
                        'bg-corporate-danger-500'
                      }`} style={{
                        boxShadow: latestData.speed >= 50 ? '0 0 10px #059669' :
                                   latestData.speed >= 45 ? '0 0 10px #f97316' :
                                   '0 0 10px #dc2626'
                      }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Правая часть с навигацией и обновлением */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full xl:w-auto">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-corporate-neutral-100 rounded-xl">
                <svg className="w-4 h-4 text-corporate-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <div className="text-xs text-corporate-neutral-600 font-medium">Последнее обновление</div>
                  <div className="text-sm text-corporate-neutral-900 font-mono font-semibold">
                    {new Date(lastUpdate).toLocaleString('ru-RU', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="/analysis"
                  className="flex items-center gap-2 px-4 py-2.5 bg-corporate-success-50 hover:bg-corporate-success-100 border-2 border-corporate-success-200 hover:border-corporate-success-300 rounded-xl transition-all shadow-sm hover:shadow-card"
                  title="Анализ данных"
                >
                  <svg className="w-4 h-4 text-corporate-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="text-sm font-semibold text-corporate-success-700 hidden lg:inline">Анализ данных</span>
                </a>
                <a
                  href="/shift-master"
                  className="flex items-center gap-2 px-4 py-2.5 bg-corporate-primary-50 hover:bg-corporate-primary-100 border-2 border-corporate-primary-200 hover:border-corporate-primary-300 rounded-xl transition-all shadow-sm hover:shadow-card"
                  title="Перейти к управлению сменой"
                >
                  <svg className="w-4 h-4 text-corporate-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-semibold text-corporate-primary-700 hidden lg:inline">Мастер смены</span>
                </a>
                <button
                  onClick={fetchData}
                  className="p-2.5 bg-corporate-neutral-100 hover:bg-corporate-neutral-200 border-2 border-corporate-neutral-200 hover:border-corporate-neutral-300 rounded-xl transition-all shadow-sm hover:shadow-card"
                  title="Обновить данные"
                >
                  <svg className="w-5 h-5 text-corporate-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-10">
        <div className="space-y-10">
          {currentPeriod && currentDayData && (
            <DailyStatsCard
              totalProduction={currentStats.totalProduction}
              averageSpeed={currentStats.averageSpeed}
              progress={currentStats.progress}
              periodStart={currentPeriod.start}
              periodEnd={currentPeriod.end}
            />
          )}

          {/* График текущих суток с 30-минутными интервалами */}
          <CurrentDayChart data={currentDayThirtyMin} />

          {/* Общий итог за месяц */}
          {dailyGrouped.length > 0 && (() => {
            const totalProduction = dailyGrouped.reduce((sum, day) => sum + day.stats.totalProduction, 0);
            // Исключаем 2 января (ППР) из плана
            const daysWithoutPPR = dailyGrouped.filter(day => day.date !== '2026-01-02').length;
            const monthlyPlan = daysWithoutPPR * 1200; // План по прошедшим дням × 1200 т/день (без ППР)
            const planProgress = (totalProduction / monthlyPlan) * 100;

            return (
              <div className="bg-white rounded-2xl border-2 border-corporate-neutral-200 p-6 sm:p-10 shadow-card-lg">
                <div className="mb-8 pb-6 border-b-2 border-corporate-neutral-100">
                  <h3 className="text-2xl sm:text-3xl font-display font-semibold text-corporate-neutral-900 tracking-tight mb-2">
                    Итоги за месяц
                  </h3>
                  <p className="text-sm text-corporate-neutral-600">Сводная статистика производства по всем суткам</p>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                  <div className="card-metric p-5 sm:p-6 text-center group">
                    <div className="flex items-center justify-center mb-3">
                      <div className="w-10 h-10 rounded-lg bg-corporate-primary-100 flex items-center justify-center group-hover:bg-corporate-primary-200 transition-colors">
                        <svg className="w-5 h-5 text-corporate-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                    </div>
                    <div className="text-xs sm:text-sm text-corporate-neutral-600 font-semibold uppercase tracking-wide mb-2">Общее производство</div>
                    <div className="metric-value text-3xl sm:text-4xl lg:text-5xl font-bold text-corporate-primary-600">
                      {totalProduction.toFixed(1)}
                      <span className="text-lg sm:text-xl lg:text-2xl ml-1 sm:ml-2 text-corporate-neutral-500">т</span>
                    </div>
                  </div>
                  <div className="card-metric p-5 sm:p-6 text-center group">
                    <div className="flex items-center justify-center mb-3">
                      <div className="w-10 h-10 rounded-lg bg-corporate-secondary-100 flex items-center justify-center group-hover:bg-corporate-secondary-200 transition-colors">
                        <svg className="w-5 h-5 text-corporate-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="text-xs sm:text-sm text-corporate-neutral-600 font-semibold uppercase tracking-wide mb-2">Прошедших дней</div>
                    <div className="metric-value text-3xl sm:text-4xl lg:text-5xl font-bold text-corporate-secondary-600">
                      {dailyGrouped.length}
                      <span className="text-lg sm:text-xl lg:text-2xl ml-1 sm:ml-2 text-corporate-neutral-500">дн</span>
                    </div>
                  </div>
                  <div className="card-metric p-5 sm:p-6 text-center group">
                    <div className="flex items-center justify-center mb-3">
                      <div className="w-10 h-10 rounded-lg bg-corporate-success-100 flex items-center justify-center group-hover:bg-corporate-success-200 transition-colors">
                        <svg className="w-5 h-5 text-corporate-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="text-xs sm:text-sm text-corporate-neutral-600 font-semibold uppercase tracking-wide mb-2">Среднее за сутки</div>
                    <div className="metric-value text-3xl sm:text-4xl lg:text-5xl font-bold text-corporate-success-600">
                      {(totalProduction / dailyGrouped.length).toFixed(1)}
                      <span className="text-lg sm:text-xl lg:text-2xl ml-1 sm:ml-2 text-corporate-neutral-500">т</span>
                    </div>
                  </div>
                  <div className="card-metric p-5 sm:p-6 text-center group">
                    <div className="flex items-center justify-center mb-3">
                      <div className="w-10 h-10 rounded-lg bg-corporate-neutral-200 flex items-center justify-center group-hover:bg-corporate-neutral-300 transition-colors">
                        <svg className="w-5 h-5 text-corporate-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                      </div>
                    </div>
                    <div className="text-xs sm:text-sm text-corporate-neutral-600 font-semibold uppercase tracking-wide mb-2">План (прошедшие дни)</div>
                    <div className="metric-value text-3xl sm:text-4xl lg:text-5xl font-bold text-corporate-neutral-700">
                      {monthlyPlan.toLocaleString('ru-RU')}
                      <span className="text-lg sm:text-xl lg:text-2xl ml-1 sm:ml-2 text-corporate-neutral-500">т</span>
                    </div>
                    <div className="text-xs text-corporate-neutral-500 font-semibold mt-2">{dailyGrouped.length} дн × 1200 т</div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-corporate-neutral-50 to-white rounded-xl p-5 sm:p-6 border-2 border-corporate-neutral-200">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm sm:text-base text-corporate-neutral-700 font-semibold">Выполнение плана месяца</span>
                    <span className={`metric-value text-xl sm:text-2xl font-bold ${
                      planProgress >= 100 ? 'text-corporate-success-600' :
                      planProgress >= 80 ? 'text-corporate-warning-600' :
                      'text-corporate-danger-600'
                    }`}>
                      {planProgress.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-5 bg-corporate-neutral-200 rounded-xl overflow-hidden border-2 border-corporate-neutral-300 shadow-inner">
                    <div
                      className={`h-full transition-all duration-1000 ease-out relative ${
                        planProgress >= 100 ? 'bg-gradient-to-r from-corporate-success-600 to-corporate-success-500' :
                        planProgress >= 80 ? 'bg-gradient-to-r from-corporate-warning-600 to-corporate-warning-500' :
                        'bg-gradient-to-r from-corporate-danger-600 to-corporate-danger-500'
                      }`}
                      style={{ width: `${Math.min(planProgress, 100)}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                    </div>
                  </div>
                  <div className={`text-sm mt-3 font-medium flex items-center gap-2 ${
                    planProgress >= 100 ? 'text-corporate-success-600' : 'text-corporate-neutral-600'
                  }`}>
                    {planProgress >= 100 ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>План выполнен! Перевыполнение на <span className="font-bold">{(totalProduction - monthlyPlan).toFixed(1)} т</span></span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        <span>До плана: <span className="font-bold">{(monthlyPlan - totalProduction).toFixed(1)} т</span></span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Отображение данных за месяц по суткам */}
          <div className="bg-white rounded-2xl border-2 border-corporate-neutral-200 p-6 sm:p-8 shadow-card-lg">
            <div className="mb-8 pb-4 border-b-2 border-corporate-neutral-100">
              <h3 className="text-xl sm:text-2xl font-display font-semibold text-corporate-neutral-900 tracking-tight mb-2">
                Детализация по суткам
              </h3>
              <p className="text-sm text-corporate-neutral-600">Нажмите на карточку для подробной информации</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4">
              {dailyGrouped.map((day, index) => (
                <div
                  key={day.date}
                  onClick={() => setSelectedDay(day)}
                  className={`bg-gradient-to-br from-white to-corporate-neutral-50 rounded-xl p-4 border-2 transition-all cursor-pointer group hover:scale-105 ${
                    index === dailyGrouped.length - 1
                      ? 'border-corporate-primary-400 shadow-glow-primary ring-2 ring-corporate-primary-200'
                      : 'border-corporate-neutral-200 hover:border-corporate-primary-300 hover:shadow-card-hover'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs text-corporate-neutral-700 font-mono font-semibold">
                      {new Date(day.date).toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </div>
                    {index === dailyGrouped.length - 1 && (
                      <span className="text-xs text-corporate-primary-700 font-bold bg-corporate-primary-100 px-2 py-0.5 rounded-md">СЕГОДНЯ</span>
                    )}
                  </div>
                  <div className="text-2xl font-mono font-bold text-corporate-primary-600 mb-2">
                    {day.stats.totalProduction.toFixed(0)}
                    <span className="text-sm ml-1 text-corporate-neutral-500">т</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-corporate-neutral-600 mb-2.5">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="font-semibold">{day.stats.averageSpeed.toFixed(1)} т/ч</span>
                  </div>
                  <div className="w-full bg-corporate-neutral-200 rounded-full h-2 mb-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        day.stats.progress >= 100 ? 'bg-gradient-to-r from-corporate-success-600 to-corporate-success-500' :
                        day.stats.progress >= 80 ? 'bg-gradient-to-r from-corporate-warning-600 to-corporate-warning-500' :
                        'bg-gradient-to-r from-corporate-danger-600 to-corporate-danger-500'
                      }`}
                      style={{ width: `${Math.min(day.stats.progress, 100)}%` }}
                    />
                  </div>
                  <div className={`text-xs font-mono font-bold ${
                    day.stats.progress >= 100 ? 'text-corporate-success-600' :
                    day.stats.progress >= 80 ? 'text-corporate-warning-600' :
                    'text-corporate-danger-600'
                  }`}>
                    {day.stats.progress.toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Комментарий по производительности */}
          {dailyGrouped.length > 1 && (() => {
            const current = dailyGrouped[dailyGrouped.length - 1].stats.totalProduction;
            const previous = dailyGrouped[dailyGrouped.length - 2].stats.totalProduction;
            const diff = current - previous;
            const diffPercent = previous > 0 ? (diff / previous) * 100 : 0;

            return (
              <div className={`rounded-2xl p-6 sm:p-8 border-2 transition-all ${
                diffPercent > 5 ? 'bg-gradient-to-br from-corporate-success-50 to-white border-corporate-success-300 shadow-glow-success' :
                diffPercent < -5 ? 'bg-gradient-to-br from-corporate-danger-50 to-white border-corporate-danger-300 shadow-glow-danger' :
                'bg-gradient-to-br from-corporate-warning-50 to-white border-corporate-warning-300 shadow-glow-warning'
              }`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                  <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center ${
                    diffPercent > 5 ? 'bg-corporate-success-100' :
                    diffPercent < -5 ? 'bg-corporate-danger-100' :
                    'bg-corporate-warning-100'
                  }`}>
                    <svg className={`w-7 h-7 ${
                      diffPercent > 5 ? 'text-corporate-success-600' :
                      diffPercent < -5 ? 'text-corporate-danger-600' :
                      'text-corporate-warning-600'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {diffPercent > 5 ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      ) : diffPercent < -5 ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      )}
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-lg font-semibold text-corporate-neutral-900 mb-2">
                      {diffPercent > 5 ? 'Производительность выше предыдущих суток' :
                       diffPercent < -5 ? 'Производительность ниже предыдущих суток' :
                       'Производительность на уровне предыдущих суток'}
                    </div>
                    <div className="text-sm text-corporate-neutral-700 mb-3">
                      {diffPercent > 5 ? 'Отличная работа! Продолжайте в том же духе.' :
                       diffPercent < -5 ? 'Требуется внимание. Проверьте причины снижения.' :
                       'Стабильная работа в пределах нормы.'}
                    </div>
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-semibold text-base ${
                      diffPercent > 0
                        ? 'bg-corporate-success-100 text-corporate-success-700'
                        : 'bg-corporate-danger-100 text-corporate-danger-700'
                    }`}>
                      <span className="text-xl">{diffPercent > 0 ? '↑' : '↓'}</span>
                      <span>{Math.abs(diff).toFixed(1)} т</span>
                      <span className="text-sm opacity-75">({Math.abs(diffPercent).toFixed(1)}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </main>

      <footer className="bg-white border-t-2 border-corporate-neutral-200 mt-20">
        <div className="container mx-auto px-4 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <div className="text-sm font-medium text-corporate-neutral-900 mb-1">
                © 2025 Маслозавод «Алтын Шығыс»
              </div>
              <div className="text-xs text-corporate-neutral-600">
                Система мониторинга производства
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-corporate-success-50 rounded-lg border border-corporate-success-200">
                <div className="w-2.5 h-2.5 rounded-full bg-corporate-success-500 animate-pulse shadow-glow-success" />
                <span className="text-xs font-semibold text-corporate-success-700">Система активна</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-corporate-neutral-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="font-medium">Автообновление: каждые 5 минут</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Модальное окно детализации дня */}
      {selectedDay && (
        <DayDetailModal dayData={selectedDay} onClose={() => setSelectedDay(null)} />
      )}
    </div>
  );
}
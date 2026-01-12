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
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Левая часть с названием и текущей подачей */}
            <div className="flex items-center gap-6">
              <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-blue-600">
                  МАСЛОЗАВОД «Altyn Shyghys»
                </h1>
                <p className="text-xs text-slate-600 font-mono mt-1">
                  Производственная панель мониторинга
                </p>
              </div>

              {/* Компактный индикатор текущей подачи */}
              {latestData && (
                <div className="hidden lg:flex items-center gap-3 bg-slate-100 rounded-lg px-4 py-2.5 border border-slate-200">
                  <div className="text-xs text-slate-600 uppercase tracking-wide font-semibold">
                    Текущая подача
                  </div>
                  <div className={`text-2xl font-display font-bold ${
                    latestData.speed >= 50 ? 'text-emerald-500' :
                    latestData.speed >= 45 ? 'text-amber-500' :
                    'text-rose-500'
                  }`}>
                    {latestData.speed.toFixed(1)}
                    <span className="text-sm ml-1 text-slate-500">т/ч</span>
                  </div>
                  <div className={`w-2 h-2 rounded-full animate-pulse ${
                    latestData.speed >= 50 ? 'bg-emerald-500' :
                    latestData.speed >= 45 ? 'bg-amber-500' :
                    'bg-rose-500'
                  }`} />
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-slate-600 font-mono">Последнее обновление</div>
                <div className="text-sm text-slate-800 font-mono font-semibold">
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
              <a
                href="/analysis"
                className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all"
                title="Анализ данных"
              >
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-sm font-medium text-emerald-700">Анализ данных</span>
              </a>
              <a
                href="/shift-master"
                className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all"
                title="Перейти к управлению сменой"
              >
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm font-medium text-blue-700">Мастер смены</span>
              </a>
              <button
                onClick={fetchData}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors"
                title="Обновить данные"
              >
                <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
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
              <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                <h3 className="text-2xl font-display font-bold text-blue-600 tracking-wider mb-6">
                  ИТОГИ ЗА МЕСЯЦ
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  <div className="text-center">
                    <div className="text-sm text-slate-600 font-bold mb-2">Общее производство</div>
                    <div className="text-5xl font-display font-bold text-blue-600">
                      {totalProduction.toFixed(1)}
                      <span className="text-2xl ml-2 text-slate-500">т</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-slate-600 font-bold mb-2">Прошедших дней</div>
                    <div className="text-5xl font-display font-bold text-blue-500">
                      {dailyGrouped.length}
                      <span className="text-2xl ml-2 text-slate-500">дн</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-slate-600 font-bold mb-2">Среднее за сутки</div>
                    <div className="text-5xl font-display font-bold text-emerald-500">
                      {(totalProduction / dailyGrouped.length).toFixed(1)}
                      <span className="text-2xl ml-2 text-slate-500">т</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-slate-600 font-bold mb-2">План (прошедшие дни)</div>
                    <div className="text-5xl font-display font-bold text-slate-600">
                      {monthlyPlan.toLocaleString('ru-RU')}
                      <span className="text-2xl ml-2 text-slate-500">т</span>
                    </div>
                    <div className="text-xs text-slate-500 font-semibold mt-1">{dailyGrouped.length} дн × 1200 т</div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-slate-600 font-bold">Выполнение плана месяца</span>
                    <span className={`text-lg font-mono font-bold ${
                      planProgress >= 100 ? 'text-emerald-500' :
                      planProgress >= 80 ? 'text-amber-500' :
                      'text-rose-500'
                    }`}>
                      {planProgress.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-3 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
                    <div
                      className={`h-full transition-all duration-1000 ease-out ${
                        planProgress >= 100 ? 'bg-gradient-to-r from-emerald-500 to-green-400' :
                        planProgress >= 80 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' :
                        'bg-gradient-to-r from-rose-500 to-red-400'
                      }`}
                      style={{ width: `${Math.min(planProgress, 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    {planProgress >= 100
                      ? `План выполнен! Перевыполнение на ${(totalProduction - monthlyPlan).toFixed(1)} т`
                      : `До плана: ${(monthlyPlan - totalProduction).toFixed(1)} т`
                    }
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Отображение данных за месяц по суткам */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-lg font-display font-bold text-slate-700 tracking-wider mb-6">
              ДЕТАЛИЗАЦИЯ ПО СУТКАМ
              <span className="text-xs text-slate-500 font-normal ml-3">(нажмите для подробной информации)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {dailyGrouped.map((day, index) => (
                <div
                  key={day.date}
                  onClick={() => setSelectedDay(day)}
                  className={`bg-slate-50 rounded-lg p-3 border transition-all cursor-pointer ${
                    index === dailyGrouped.length - 1
                      ? 'border-blue-300 shadow-lg hover:shadow-xl'
                      : 'border-slate-200 hover:border-blue-300 hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-slate-600 font-mono">
                      {new Date(day.date).toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </div>
                    {index === dailyGrouped.length - 1 && (
                      <span className="text-xs text-blue-600 font-bold">СЕГОДНЯ</span>
                    )}
                  </div>
                  <div className="text-xl font-display font-bold text-blue-600 mb-1">
                    {day.stats.totalProduction.toFixed(0)} т
                  </div>
                  <div className="text-xs text-slate-600 mb-1">
                    ⌀ {day.stats.averageSpeed.toFixed(1)} т/ч
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mb-1">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        day.stats.progress >= 100 ? 'bg-emerald-500' :
                        day.stats.progress >= 80 ? 'bg-amber-500' :
                        'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(day.stats.progress, 100)}%` }}
                    />
                  </div>
                  <div className={`text-xs font-mono ${
                    day.stats.progress >= 100 ? 'text-emerald-500' :
                    day.stats.progress >= 80 ? 'text-amber-500' :
                    'text-rose-500'
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
              <div className={`rounded-xl p-5 border-2 ${
                diffPercent > 5 ? 'bg-emerald-50 border-emerald-200' :
                diffPercent < -5 ? 'bg-rose-50 border-rose-200' :
                'bg-amber-50 border-amber-200'
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`text-3xl ${
                    diffPercent > 5 ? 'text-emerald-500' :
                    diffPercent < -5 ? 'text-rose-500' :
                    'text-amber-500'
                  }`}>
                    {diffPercent > 5 ? '✓' : diffPercent < -5 ? '!' : '~'}
                  </div>
                  <div className="flex-1">
                    <div className="text-base font-mono text-slate-800 mb-1">
                      {diffPercent > 5 ? 'Производительность выше предыдущих суток' :
                       diffPercent < -5 ? 'Производительность ниже предыдущих суток' :
                       'Производительность на уровне предыдущих суток'}
                    </div>
                    <div className="text-sm text-slate-600">
                      {diffPercent > 5 ? 'Отличная работа! Продолжайте в том же духе.' :
                       diffPercent < -5 ? 'Требуется внимание. Проверьте причины снижения.' :
                       'Стабильная работа в пределах нормы.'}
                    </div>
                    <div className={`text-sm font-mono mt-2 ${
                      diffPercent > 0 ? 'text-emerald-500' : 'text-rose-500'
                    }`}>
                      {diffPercent > 0 ? '↑' : '↓'} {Math.abs(diff).toFixed(1)} т ({Math.abs(diffPercent).toFixed(1)}%)
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-600">
            <div className="font-mono">
              © 2025 Маслозавод «Алтын Шығыс». Система мониторинга производства.
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono">Автообновление: каждые 5 минут</span>
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
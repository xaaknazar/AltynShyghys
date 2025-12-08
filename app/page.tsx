'use client';

import { useEffect, useState } from 'react';
import SpeedIndicator from '@/app/components/SpeedIndicator';
import DailyStatsCard from '@/app/components/DailyStatsCard';
import ProductionChart from '@/app/components/ProductionChart';
import ComparisonCard from '@/app/components/ComparisonCard';
import LoadingState from '@/app/components/LoadingState';
import ErrorState from '@/app/components/ErrorState';
import { ProductionData, calculateDailyStats, DailyGroupedData } from '@/lib/utils';

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
    <div className="min-h-screen grid-background">
      <header className="bg-industrial-darker/90 backdrop-blur-md border-b border-industrial-blue/30 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-industrial-accent">
                МАСЛОЗАВОД «АЛТЫН ШЫҒЫС»
              </h1>
              <p className="text-sm text-gray-400 font-mono mt-1">
                Производственная панель мониторинга
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs text-gray-500 font-mono">Последнее обновление</div>
                <div className="text-sm text-gray-300 font-mono">
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
              <button
                onClick={fetchData}
                className="p-3 bg-industrial-blue/30 hover:bg-industrial-blue/50 rounded-lg transition-colors"
                title="Обновить данные"
              >
                <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {latestData && (
            <SpeedIndicator
              currentSpeed={latestData.speed}
              status={
                latestData.speed >= 45 ? 'normal' :
                latestData.speed >= 40 ? 'warning' :
                'danger'
              }
              lastUpdate={latestData.datetime}
            />
          )}

          {currentPeriod && currentDayData && (
            <DailyStatsCard
              totalProduction={currentStats.totalProduction}
              averageSpeed={currentStats.averageSpeed}
              progress={currentStats.progress}
              periodStart={currentPeriod.start}
              periodEnd={currentPeriod.end}
            />
          )}

          {/* Общий итог за месяц */}
          {dailyGrouped.length > 0 && (
            <div className="bg-gradient-to-br from-industrial-darker/90 to-industrial-dark/90 backdrop-blur-sm rounded-2xl border-2 border-industrial-accent/40 p-8">
              <h3 className="text-2xl font-display text-industrial-accent tracking-wider mb-6">
                ИТОГИ ЗА МЕСЯЦ
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-2">Общее производство</div>
                  <div className="text-5xl font-display font-bold text-industrial-accent">
                    {dailyGrouped.reduce((sum, day) => sum + day.stats.totalProduction, 0).toFixed(1)}
                    <span className="text-2xl ml-2 text-gray-500">т</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-2">Рабочих дней</div>
                  <div className="text-5xl font-display font-bold text-blue-400">
                    {dailyGrouped.length}
                    <span className="text-2xl ml-2 text-gray-500">дн</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-2">Среднее за сутки</div>
                  <div className="text-5xl font-display font-bold text-industrial-success">
                    {(dailyGrouped.reduce((sum, day) => sum + day.stats.totalProduction, 0) / dailyGrouped.length).toFixed(1)}
                    <span className="text-2xl ml-2 text-gray-500">т</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Отображение данных за месяц по суткам */}
          <div className="bg-industrial-darker/80 backdrop-blur-sm rounded-2xl border border-industrial-blue/30 p-6">
            <h3 className="text-lg font-display text-gray-400 tracking-wider mb-6">
              ДЕТАЛИЗАЦИЯ ПО СУТКАМ
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {dailyGrouped.map((day, index) => (
                <div
                  key={day.date}
                  className={`bg-industrial-dark/50 rounded-lg p-3 border transition-all ${
                    index === dailyGrouped.length - 1
                      ? 'border-industrial-accent/70 shadow-lg shadow-industrial-accent/20'
                      : 'border-industrial-blue/20 hover:border-industrial-accent/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-gray-400 font-mono">
                      {new Date(day.date).toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </div>
                    {index === dailyGrouped.length - 1 && (
                      <span className="text-xs text-industrial-accent font-bold">СЕГОДНЯ</span>
                    )}
                  </div>
                  <div className="text-xl font-display font-bold text-industrial-accent mb-1">
                    {day.stats.totalProduction.toFixed(0)} т
                  </div>
                  <div className="text-xs text-gray-500 mb-1">
                    ⌀ {day.stats.averageSpeed.toFixed(1)} т/ч
                  </div>
                  <div className="w-full bg-industrial-dark rounded-full h-1.5 mb-1">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        day.stats.progress >= 100 ? 'bg-industrial-success' :
                        day.stats.progress >= 80 ? 'bg-industrial-warning' :
                        'bg-industrial-danger'
                      }`}
                      style={{ width: `${Math.min(day.stats.progress, 100)}%` }}
                    />
                  </div>
                  <div className={`text-xs font-mono ${
                    day.stats.progress >= 100 ? 'text-industrial-success' :
                    day.stats.progress >= 80 ? 'text-industrial-warning' :
                    'text-industrial-danger'
                  }`}>
                    {day.stats.progress.toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Графики для последних двух суток */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {dailyGrouped.length > 0 && (
              <ProductionChart
                data={dailyGrouped[dailyGrouped.length - 1].data}
                title={`ГРАФИК ${dailyGrouped[dailyGrouped.length - 1].date}`}
              />
            )}

            {dailyGrouped.length > 1 && (
              <ProductionChart
                data={dailyGrouped[dailyGrouped.length - 2].data}
                title={`ГРАФИК ${dailyGrouped[dailyGrouped.length - 2].date}`}
              />
            )}
          </div>

          {/* Сравнение суток */}
          {dailyGrouped.length > 1 && (
            <ComparisonCard
              currentTotal={dailyGrouped[dailyGrouped.length - 1].stats.totalProduction}
              previousTotal={dailyGrouped[dailyGrouped.length - 2].stats.totalProduction}
              currentAvg={dailyGrouped[dailyGrouped.length - 1].stats.averageSpeed}
              previousAvg={dailyGrouped[dailyGrouped.length - 2].stats.averageSpeed}
            />
          )}
        </div>
      </main>

      <footer className="bg-industrial-darker/90 border-t border-industrial-blue/30 mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <div className="font-mono">
              © 2025 Маслозавод «Алтын Шығыс». Система мониторинга производства.
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-industrial-success animate-pulse" />
              <span className="font-mono">Автообновление: каждые 5 минут</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';
import SpeedIndicator from '@/app/components/SpeedIndicator';
import DailyStatsCard from '@/app/components/DailyStatsCard';
import ProductionChart from '@/app/components/ProductionChart';
import ComparisonCard from '@/app/components/ComparisonCard';
import LoadingState from '@/app/components/LoadingState';
import ErrorState from '@/app/components/ErrorState';
import { ProductionData, calculateDailyStats } from '@/lib/utils';

interface ApiResponse {
  success: boolean;
  data: ProductionData[];
  period: {
    start: string;
    end: string;
  };
}

export default function HomePage() {
  const [currentData, setCurrentData] = useState<ProductionData[]>([]);
  const [previousData, setPreviousData] = useState<ProductionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>(new Date().toISOString());
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setError(null);
      
      const currentResponse = await fetch('/api/production/current');
      const currentResult: ApiResponse = await currentResponse.json();
      
      const previousResponse = await fetch('/api/production/previous');
      const previousResult: ApiResponse = await previousResponse.json();

      if (currentResult.success && previousResult.success) {
        setCurrentData(currentResult.data);
        setPreviousData(previousResult.data);
        setLastUpdate(new Date().toISOString());
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
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  const currentStats = calculateDailyStats(currentData);
  const previousStats = calculateDailyStats(previousData);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchData} />;
  }

  const latestData = currentData[currentData.length - 1];
  const currentPeriod = currentData.length > 0 ? {
    start: currentData[0].datetime,
    end: currentData[currentData.length - 1].datetime,
  } : null;

  return (
    <div className="min-h-screen grid-background">
      <header className="bg-industrial-darker/90 backdrop-blur-md border-b border-industrial-blue/30 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-industrial-accent">
                МАСЛОЗАВОД
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
              currentSpeed={currentStats.currentSpeed}
              status={currentStats.status}
              lastUpdate={latestData.datetime}
            />
          )}

          {currentPeriod && (
            <DailyStatsCard
              totalProduction={currentStats.totalProduction}
              averageSpeed={currentStats.averageSpeed}
              progress={currentStats.progress}
              periodStart={currentPeriod.start}
              periodEnd={currentPeriod.end}
            />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {currentData.length > 0 && (
              <ProductionChart
                data={currentData}
                title="ГРАФИК ТЕКУЩИХ СУТОК"
              />
            )}

            {previousData.length > 0 && (
              <ProductionChart
                data={previousData}
                title="ГРАФИК ПРЕДЫДУЩИХ СУТОК"
              />
            )}
          </div>

          {currentData.length > 0 && previousData.length > 0 && (
            <ComparisonCard
              currentTotal={currentStats.totalProduction}
              previousTotal={previousStats.totalProduction}
              currentAvg={currentStats.averageSpeed}
              previousAvg={previousStats.averageSpeed}
            />
          )}
        </div>
      </main>

      <footer className="bg-industrial-darker/90 border-t border-industrial-blue/30 mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <div className="font-mono">
              © 2025 Маслозавод. Система мониторинга производства.
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
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SpeedIndicator from '@/app/components/SpeedIndicator';
import ShiftChart from '@/app/components/ShiftChart';
import ShiftEventForm from '@/app/components/ShiftEventForm';
import { ProductionData, TIMEZONE_OFFSET } from '@/lib/utils';

interface ShiftLog {
  id: string;
  shift_date: string;
  shift_type: 'day' | 'night';
  event_time: string;
  event_type: string;
  workshop: string | null;
  description: string;
  actions_taken: string | null;
  speed_before: number | null;
  speed_after: number | null;
  master_name: string | null;
  created_at: string;
}

export default function ShiftMasterPage() {
  const [latestData, setLatestData] = useState<ProductionData | null>(null);
  const [shiftData, setShiftData] = useState<ProductionData[]>([]);
  const [shiftLogs, setShiftLogs] = useState<ShiftLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentShiftType, setCurrentShiftType] = useState<'day' | 'night'>('day');
  const [currentShiftDate, setCurrentShiftDate] = useState<string>('');

  // Определяем текущую смену
  const determineCurrentShift = () => {
    const now = new Date();
    const localTime = new Date(now.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);
    const hour = localTime.getUTCHours();

    // Дневная смена: 08:00-20:00, Ночная смена: 20:00-08:00
    const isDayShift = hour >= 8 && hour < 20;
    setCurrentShiftType(isDayShift ? 'day' : 'night');

    // Дата смены
    const shiftDate = new Date(localTime);
    if (hour < 8) {
      shiftDate.setUTCDate(shiftDate.getUTCDate() - 1);
    }
    setCurrentShiftDate(shiftDate.toISOString().split('T')[0]);
  };

  const fetchData = async () => {
    try {
      // Получаем последнюю запись
      const latestResponse = await fetch('/api/production/latest', { cache: 'no-store' });
      const latestResult = await latestResponse.json();

      if (latestResult.success) {
        setLatestData(latestResult.data);
      }

      // Получаем данные текущей смены
      // Для простоты берем последние 12 часов данных
      const monthlyResponse = await fetch('/api/production/monthly', { cache: 'no-store' });
      const monthlyResult = await monthlyResponse.json();

      if (monthlyResult.success) {
        // Фильтруем данные за последние 12 часов
        const now = new Date().getTime();
        const twelveHoursAgo = now - 12 * 60 * 60 * 1000;
        const recentData = monthlyResult.data.filter((item: ProductionData) => {
          return new Date(item.datetime).getTime() >= twelveHoursAgo;
        });
        setShiftData(recentData);
      }

      // Получаем логи текущей смены
      await fetchShiftLogs();
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchShiftLogs = async () => {
    try {
      const response = await fetch(
        `/api/shift-logs?shift_date=${currentShiftDate}&shift_type=${currentShiftType}`,
        { cache: 'no-store' }
      );
      const result = await response.json();

      if (result.success) {
        setShiftLogs(result.logs);
      }
    } catch (error) {
      console.error('Error fetching shift logs:', error);
    }
  };

  useEffect(() => {
    determineCurrentShift();
  }, []);

  useEffect(() => {
    if (currentShiftDate) {
      fetchData();
      // Обновление каждые 2 минуты
      const interval = setInterval(fetchData, 120000);
      return () => clearInterval(interval);
    }
  }, [currentShiftDate, currentShiftType]);

  const getEventTypeLabel = (type: string) => {
    const types: Record<string, { label: string; icon: string }> = {
      production_issue: { label: 'Проблема производства', icon: '⚠️' },
      equipment_failure: { label: 'Поломка оборудования', icon: '🔧' },
      material_shortage: { label: 'Нехватка сырья', icon: '📦' },
      maintenance: { label: 'Профилактика', icon: '🛠️' },
      quality_issue: { label: 'Проблема качества', icon: '🔍' },
      speed_change: { label: 'Изменение скорости', icon: '📊' },
      other: { label: 'Другое', icon: '📝' },
    };
    return types[type] || { label: type, icon: '📝' };
  };

  if (loading) {
    return (
      <div className="min-h-screen grid-background flex items-center justify-center">
        <div className="text-2xl text-gray-400 font-display">Загрузка...</div>
      </div>
    );
  }

  // Преобразуем логи в события для графика
  const events = shiftLogs.map(log => ({
    time: log.event_time,
    description: log.description,
    type: log.event_type,
  }));

  return (
    <div className="min-h-screen grid-background">
      <header className="bg-industrial-darker/90 backdrop-blur-md border-b border-industrial-blue/30 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-industrial-accent">
                МАСТЕР СМЕНЫ
              </h1>
              <p className="text-sm text-gray-400 font-mono mt-1">
                {currentShiftType === 'day' ? 'Дневная смена: 08:00-20:00' : 'Ночная смена: 20:00-08:00'}
                {' • '}
                {new Date(currentShiftDate).toLocaleDateString('ru-RU')}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <Link
                href="/otk"
                className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-industrial-success/20 hover:bg-industrial-success/30 border border-industrial-success/40 rounded-lg transition-all"
              >
                <svg className="w-4 h-4 text-industrial-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span className="text-sm font-medium text-industrial-success">ОТК</span>
              </Link>
              <Link
                href="/"
                className="px-4 py-2 bg-industrial-dark border border-industrial-blue/30 rounded-lg text-gray-300 hover:bg-industrial-blue/30 transition-all"
              >
                ← На главную
              </Link>
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
          {/* Текущая подача */}
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

          {/* Кнопка добавления события */}
          <div className="flex justify-between items-center">
            {latestData && (
              <ShiftEventForm
                shiftDate={currentShiftDate}
                shiftType={currentShiftType}
                currentSpeed={latestData.speed}
                onSubmit={fetchShiftLogs}
              />
            )}
            <div className="text-sm text-gray-400 font-mono">
              Событий за смену: {shiftLogs.length}
            </div>
          </div>

          {/* График смены */}
          <ShiftChart
            data={shiftData}
            shiftType={currentShiftType}
            events={events}
          />

          {/* История событий смены */}
          <div className="bg-industrial-darker/80 backdrop-blur-sm rounded-2xl border border-industrial-blue/30 p-6">
            <h3 className="text-lg font-display text-gray-400 tracking-wider mb-6">
              ИСТОРИЯ СОБЫТИЙ СМЕНЫ
            </h3>

            {shiftLogs.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                Событий за текущую смену пока нет
              </div>
            ) : (
              <div className="space-y-4">
                {shiftLogs.map((log) => {
                  const eventType = getEventTypeLabel(log.event_type);
                  return (
                    <div
                      key={log.id}
                      className="bg-industrial-dark/50 rounded-lg p-4 border border-industrial-blue/20 hover:border-industrial-accent/50 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{eventType.icon}</span>
                          <div>
                            <div className="text-sm font-bold text-industrial-accent">
                              {eventType.label}
                            </div>
                            <div className="text-xs text-gray-500 font-mono">
                              {new Date(log.event_time).toLocaleString('ru-RU', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>
                        {log.workshop && (
                          <div className="text-xs bg-industrial-blue/20 px-3 py-1 rounded-full text-gray-300">
                            {log.workshop}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Описание:</div>
                          <div className="text-sm text-gray-200">{log.description}</div>
                        </div>

                        {log.actions_taken && (
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Принятые меры:</div>
                            <div className="text-sm text-gray-200">{log.actions_taken}</div>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-industrial-blue/20">
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            {log.speed_before !== null && (
                              <div>
                                Скорость до: <span className="text-gray-300 font-mono">{log.speed_before} т/ч</span>
                              </div>
                            )}
                            {log.speed_after !== null && (
                              <div>
                                Скорость после: <span className="text-gray-300 font-mono">{log.speed_after} т/ч</span>
                              </div>
                            )}
                          </div>
                          {log.master_name && (
                            <div className="text-xs text-gray-400">
                              Мастер: <span className="text-gray-300">{log.master_name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Статистика смены */}
          {shiftData.length > 0 && (() => {
            const totalProduction = shiftData.reduce((sum, d) => sum + (d.difference || 0), 0);
            const avgSpeed = shiftData.reduce((sum, d) => sum + d.speed, 0) / shiftData.length;
            const minSpeed = Math.min(...shiftData.map(d => d.speed));
            const maxSpeed = Math.max(...shiftData.map(d => d.speed));

            return (
              <div className="bg-gradient-to-br from-industrial-darker/90 to-industrial-dark/90 backdrop-blur-sm rounded-2xl border-2 border-industrial-accent/40 p-8">
                <h3 className="text-2xl font-display text-industrial-accent tracking-wider mb-6">
                  СТАТИСТИКА СМЕНЫ
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-sm text-gray-400 mb-2">Произведено</div>
                    <div className="text-4xl font-display font-bold text-industrial-accent">
                      {totalProduction.toFixed(1)}
                      <span className="text-xl ml-2 text-gray-500">т</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-400 mb-2">Средняя скорость</div>
                    <div className="text-4xl font-display font-bold text-blue-400">
                      {avgSpeed.toFixed(1)}
                      <span className="text-xl ml-2 text-gray-500">т/ч</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-400 mb-2">Мин. скорость</div>
                    <div className="text-4xl font-display font-bold text-industrial-danger">
                      {minSpeed.toFixed(1)}
                      <span className="text-xl ml-2 text-gray-500">т/ч</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-400 mb-2">Макс. скорость</div>
                    <div className="text-4xl font-display font-bold text-industrial-success">
                      {maxSpeed.toFixed(1)}
                      <span className="text-xl ml-2 text-gray-500">т/ч</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </main>

      <footer className="bg-industrial-darker/90 border-t border-industrial-blue/30 mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-gray-500 font-mono">
            © 2025 Маслозавод «Алтын Шығыс». Система мониторинга смен.
          </div>
        </div>
      </footer>
    </div>
  );
}

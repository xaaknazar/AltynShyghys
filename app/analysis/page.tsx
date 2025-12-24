'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ANALYSIS_TYPES, ANALYSIS_CONFIG, getAnalysisStatus, AnalysisType } from '@/lib/quality-types';

type ViewMode = 'all' | 'shift' | 'day';

export default function AnalysisPage() {
  const [selectedType, setSelectedType] = useState<AnalysisType | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [shiftFilter, setShiftFilter] = useState<'all' | 'day' | 'night'>('all');
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [groupedData, setGroupedData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Установка дат по умолчанию: последний месяц
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchAnalyses();
    }
  }, [startDate, endDate, shiftFilter, selectedType, viewMode]);

  const fetchAnalyses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        shift_type: shiftFilter,
        analysis_type: selectedType,
        group_by: viewMode === 'all' ? 'none' : viewMode,
      });

      const response = await fetch(`/api/quality-analysis?${params}`, { cache: 'no-store' });
      const data = await response.json();

      if (data.success) {
        setAnalyses(data.analyses);
        setGroupedData(data.grouped || []);
      }
    } catch (error) {
      console.error('Error fetching analyses:', error);
    } finally {
      setLoading(false);
    }
  };

  // Данные для отображения
  const displayData = viewMode === 'all' ? analyses : groupedData;

  // Группировка данных для графика
  const chartData = viewMode === 'all'
    ? analyses.reduce((acc: any[], analysis) => {
        const existing = acc.find(
          (item) => item.analysis_type === analysis.analysis_type
        );
        if (existing) {
          existing.values.push({ time: analysis.sample_time, value: analysis.value });
        } else {
          acc.push({
            analysis_type: analysis.analysis_type,
            values: [{ time: analysis.sample_time, value: analysis.value }],
          });
        }
        return acc;
      }, [])
    : groupedData.reduce((acc: any[], group) => {
        const existing = acc.find((item) => item.analysis_type === group.analysis_type);
        const label = viewMode === 'shift'
          ? `${group.shift_date} (${group.shift_type === 'day' ? 'Д' : 'Н'})`
          : group.shift_date;
        if (existing) {
          existing.values.push({ time: label, value: group.average });
        } else {
          acc.push({
            analysis_type: group.analysis_type,
            values: [{ time: label, value: group.average }],
          });
        }
        return acc;
      }, []);

  return (
    <div className="min-h-screen grid-background">
      <header className="bg-industrial-darker/95 backdrop-blur-md border-b border-industrial-accent/20 sticky top-0 z-50 shadow-lg shadow-industrial-accent/10">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-industrial-accent">
                АНАЛИЗ ДАННЫХ КАЧЕСТВА
              </h1>
              <p className="text-xs text-gray-400 font-mono mt-1">
                Графики и статистика лабораторных анализов
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/otk"
                className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-industrial-accent/20 hover:bg-industrial-accent/30 border border-industrial-accent/40 rounded-lg transition-all"
              >
                <svg className="w-4 h-4 text-industrial-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-sm font-medium text-industrial-accent">Добавить анализ</span>
              </Link>
              <Link
                href="/"
                className="px-4 py-2.5 bg-industrial-dark/70 hover:bg-industrial-dark border border-industrial-blue/30 rounded-lg text-gray-300 transition-all"
              >
                ← На главную
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Фильтры */}
        <div className="bg-industrial-darker/80 backdrop-blur-sm rounded-2xl border border-industrial-blue/30 p-6 mb-8">
          <h3 className="text-lg font-display text-gray-400 mb-4">ФИЛЬТРЫ</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-2">Начало периода</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-industrial-darker border border-industrial-blue/30 rounded-lg text-gray-200 font-mono text-sm focus:border-industrial-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-2">Конец периода</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-industrial-darker border border-industrial-blue/30 rounded-lg text-gray-200 font-mono text-sm focus:border-industrial-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-2">Тип анализа</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as AnalysisType | 'all')}
                className="w-full px-3 py-2 bg-industrial-darker border border-industrial-blue/30 rounded-lg text-gray-200 font-mono text-sm focus:border-industrial-accent focus:outline-none"
              >
                <option value="all">Все анализы</option>
                {Object.entries(ANALYSIS_CONFIG).map(([type, conf]) => (
                  <option key={type} value={type}>
                    {conf.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-2">Смена</label>
              <select
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value as 'all' | 'day' | 'night')}
                className="w-full px-3 py-2 bg-industrial-darker border border-industrial-blue/30 rounded-lg text-gray-200 font-mono text-sm focus:border-industrial-accent focus:outline-none"
              >
                <option value="all">Все смены</option>
                <option value="day">Дневная</option>
                <option value="night">Ночная</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-2">Режим просмотра</label>
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as ViewMode)}
                className="w-full px-3 py-2 bg-industrial-darker border border-industrial-blue/30 rounded-lg text-gray-200 font-mono text-sm focus:border-industrial-accent focus:outline-none"
              >
                <option value="all">Все анализы</option>
                <option value="shift">Средние по сменам</option>
                <option value="day">Средние по суткам</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="text-2xl text-gray-400 font-display">Загрузка данных...</div>
          </div>
        ) : displayData.length === 0 ? (
          <div className="bg-industrial-darker/80 backdrop-blur-sm rounded-2xl border border-industrial-blue/30 p-12 text-center">
            <div className="text-gray-400 text-lg mb-2">Нет данных за выбранный период</div>
            <div className="text-gray-500 text-sm">Измените фильтры или добавьте новые анализы</div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Графики по типам анализов */}
            {chartData.map((typeData) => {
              const config = ANALYSIS_CONFIG[typeData.analysis_type as AnalysisType];
              if (!config) return null;

              const maxValue = Math.max(...typeData.values.map((v: any) => v.value), config.max * 1.2);

              return (
                <div
                  key={typeData.analysis_type}
                  className="bg-industrial-darker/80 backdrop-blur-sm rounded-2xl border border-industrial-blue/30 p-6"
                >
                  <h3 className="text-lg font-display text-industrial-accent mb-6">
                    {config.label}
                  </h3>

                  {/* График */}
                  <div className="relative bg-industrial-dark/30 rounded-lg p-6 border border-industrial-blue/20">
                    {/* Линии норм */}
                    <div
                      className="absolute left-0 right-0 flex items-center"
                      style={{ bottom: `${(config.max / maxValue) * 100}%` }}
                    >
                      <div className="w-full h-px bg-industrial-danger/50 border-t border-dashed border-industrial-danger/70"></div>
                      <div className="absolute -right-2 -top-3 text-xs text-industrial-danger font-mono bg-industrial-darker px-2 py-0.5 rounded">
                        MAX {config.max}{config.unit}
                      </div>
                    </div>

                    {config.min > 0 && (
                      <div
                        className="absolute left-0 right-0 flex items-center"
                        style={{ bottom: `${(config.min / maxValue) * 100}%` }}
                      >
                        <div className="w-full h-px bg-industrial-success/50 border-t border-dashed border-industrial-success/70"></div>
                        <div className="absolute -right-2 -top-3 text-xs text-industrial-success font-mono bg-industrial-darker px-2 py-0.5 rounded">
                          MIN {config.min}{config.unit}
                        </div>
                      </div>
                    )}

                    {/* Столбцы */}
                    <div className="flex items-end justify-start gap-1 h-80 overflow-x-auto pb-2">
                      {typeData.values.map((point: any, index: number) => {
                        const heightPercent = Math.max((point.value / maxValue) * 100, 2);
                        const status = getAnalysisStatus(typeData.analysis_type, point.value);

                        return (
                          <div key={index} className="flex flex-col items-center group relative min-w-[16px]">
                            <div
                              className={`w-full rounded-t transition-all duration-200 ${
                                status === 'normal'
                                  ? 'bg-industrial-success hover:brightness-110'
                                  : status === 'warning'
                                  ? 'bg-industrial-warning hover:brightness-110'
                                  : 'bg-industrial-danger hover:brightness-110'
                              }`}
                              style={{ height: `${heightPercent}%`, minHeight: '8px' }}
                            ></div>

                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                              <div className="bg-industrial-darker border border-industrial-blue/50 rounded-lg p-3 shadow-xl whitespace-nowrap">
                                <div className="text-xs text-gray-400 mb-1 font-mono">
                                  {viewMode === 'all'
                                    ? new Date(point.time).toLocaleString('ru-RU', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                    : point.time}
                                </div>
                                <div className="text-base font-bold text-industrial-accent">
                                  {point.value.toFixed(2)}{config.unit}
                                </div>
                              </div>
                            </div>

                            {/* Метка времени */}
                            {index % Math.max(1, Math.floor(typeData.values.length / 10)) === 0 && (
                              <div className="text-xs text-gray-500 font-mono mt-2 -rotate-45 origin-top-left truncate max-w-[80px]">
                                {viewMode === 'all'
                                  ? new Date(point.time).toLocaleDateString('ru-RU', {
                                      day: '2-digit',
                                      month: '2-digit',
                                    })
                                  : point.time.split(' ')[0]}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Легенда */}
                  <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-industrial-success"></div>
                      <span>В норме</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-industrial-warning"></div>
                      <span>Близко к норме</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-industrial-danger"></div>
                      <span>Вне нормы</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Статистика */}
            <div className="bg-gradient-to-br from-industrial-darker/90 to-industrial-dark/90 backdrop-blur-sm rounded-2xl border-2 border-industrial-accent/40 p-8">
              <h3 className="text-2xl font-display text-industrial-accent tracking-wider mb-6">
                СТАТИСТИКА
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-2">Всего анализов</div>
                  <div className="text-4xl font-display font-bold text-industrial-accent">
                    {analyses.length}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-2">За период</div>
                  <div className="text-2xl font-display font-bold text-blue-400">
                    {startDate && endDate &&
                      `${new Date(startDate).toLocaleDateString('ru-RU')} - ${new Date(endDate).toLocaleDateString('ru-RU')}`}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-2">Режим</div>
                  <div className="text-2xl font-display font-bold text-gray-300">
                    {viewMode === 'all'
                      ? 'Все анализы'
                      : viewMode === 'shift'
                      ? 'По сменам'
                      : 'По суткам'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

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

  const exportToExcel = () => {
    // Подготовка данных для экспорта
    const exportData = analyses.map(analysis => {
      const config = ANALYSIS_CONFIG[analysis.analysis_type as AnalysisType];
      const status = getAnalysisStatus(analysis.analysis_type, analysis.value);
      const date = new Date(analysis.sample_time);

      return {
        'Дата': date.toLocaleDateString('ru-RU'),
        'Время': date.toLocaleTimeString('ru-RU'),
        'Тип анализа': config?.label || analysis.analysis_type,
        'Смена': analysis.shift_type === 'day' ? 'Дневная' : 'Ночная',
        'Значение': analysis.value.toFixed(2),
        'Единица': config?.unit || '',
        'Минимум': config?.min || '',
        'Максимум': config?.max || '',
        'Статус': status === 'normal' ? 'В норме' : status === 'warning' ? 'Близко к норме' : 'Вне нормы',
        'Комментарий': analysis.comment || '',
        'Ответственный': analysis.responsible || '',
      };
    });

    // Создание CSV строки
    const headers = Object.keys(exportData[0] || {});
    const csvContent = [
      headers.join(','),
      ...exportData.map(row =>
        headers.map(header => {
          const value = row[header as keyof typeof row];
          // Экранируем значения с запятыми и кавычками
          return typeof value === 'string' && (value.includes(',') || value.includes('"'))
            ? `"${value.replace(/"/g, '""')}"`
            : value;
        }).join(',')
      )
    ].join('\n');

    // Добавляем BOM для корректного отображения кириллицы в Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const fileName = `Анализы_качества_${startDate}_${endDate}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-blue-600">
                АНАЛИЗ ДАННЫХ КАЧЕСТВА
              </h1>
              <p className="text-xs text-slate-600 font-mono mt-1">
                Графики и статистика лабораторных анализов
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/otk"
                className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all"
              >
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-sm font-medium text-blue-700">Добавить анализ</span>
              </Link>
              <Link
                href="/"
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-800 transition-all"
              >
                ← На главную
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Фильтры */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-display font-bold text-slate-700">ФИЛЬТРЫ</h3>
            {analyses.length > 0 && (
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all"
              >
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm font-bold text-emerald-700">Экспорт в Excel</span>
                <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">
                  {analyses.length}
                </span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs text-slate-600 mb-2">Начало периода</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-600 mb-2">Конец периода</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-600 font-semibold mb-2">Тип анализа</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as AnalysisType | 'all')}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="all">Все анализы</option>

                <optgroup label="Входящее сырье">
                  <option value={ANALYSIS_TYPES.MOISTURE_RAW_MATERIAL}>{ANALYSIS_CONFIG[ANALYSIS_TYPES.MOISTURE_RAW_MATERIAL].label}</option>
                  <option value={ANALYSIS_TYPES.OIL_CONTENT_RAW_MATERIAL}>{ANALYSIS_CONFIG[ANALYSIS_TYPES.OIL_CONTENT_RAW_MATERIAL].label}</option>
                </optgroup>

                <optgroup label="Лузга">
                  <option value={ANALYSIS_TYPES.MOISTURE_HUSK}>{ANALYSIS_CONFIG[ANALYSIS_TYPES.MOISTURE_HUSK].label}</option>
                  <option value={ANALYSIS_TYPES.FAT_HUSK}>{ANALYSIS_CONFIG[ANALYSIS_TYPES.FAT_HUSK].label}</option>
                  <option value={ANALYSIS_TYPES.KERNEL_LOSS_HUSK}>{ANALYSIS_CONFIG[ANALYSIS_TYPES.KERNEL_LOSS_HUSK].label}</option>
                </optgroup>

                <optgroup label="Рушанка">
                  <option value={ANALYSIS_TYPES.MOISTURE_CRUSHED}>{ANALYSIS_CONFIG[ANALYSIS_TYPES.MOISTURE_CRUSHED].label}</option>
                  <option value={ANALYSIS_TYPES.HUSK_CONTENT_CRUSHED}>{ANALYSIS_CONFIG[ANALYSIS_TYPES.HUSK_CONTENT_CRUSHED].label}</option>
                </optgroup>

                <optgroup label="Мезга с жаровни">
                  <option value={ANALYSIS_TYPES.MOISTURE_ROASTER_1}>{ANALYSIS_CONFIG[ANALYSIS_TYPES.MOISTURE_ROASTER_1].label}</option>
                  <option value={ANALYSIS_TYPES.MOISTURE_ROASTER_2}>{ANALYSIS_CONFIG[ANALYSIS_TYPES.MOISTURE_ROASTER_2].label}</option>
                </optgroup>

                <optgroup label="Жмых с пресса">
                  <option value={ANALYSIS_TYPES.MOISTURE_PRESS_1}>{ANALYSIS_CONFIG[ANALYSIS_TYPES.MOISTURE_PRESS_1].label}</option>
                  <option value={ANALYSIS_TYPES.MOISTURE_PRESS_2}>{ANALYSIS_CONFIG[ANALYSIS_TYPES.MOISTURE_PRESS_2].label}</option>
                  <option value={ANALYSIS_TYPES.FAT_PRESS_1}>{ANALYSIS_CONFIG[ANALYSIS_TYPES.FAT_PRESS_1].label}</option>
                  <option value={ANALYSIS_TYPES.FAT_PRESS_2}>{ANALYSIS_CONFIG[ANALYSIS_TYPES.FAT_PRESS_2].label}</option>
                </optgroup>

                <optgroup label="Шрот">
                  <option value={ANALYSIS_TYPES.MOISTURE_TOASTED_MEAL}>{ANALYSIS_CONFIG[ANALYSIS_TYPES.MOISTURE_TOASTED_MEAL].label}</option>
                  <option value={ANALYSIS_TYPES.OIL_CONTENT_MEAL}>{ANALYSIS_CONFIG[ANALYSIS_TYPES.OIL_CONTENT_MEAL].label}</option>
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-600 mb-2">Смена</label>
              <select
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value as 'all' | 'day' | 'night')}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="all">Все смены</option>
                <option value="day">Дневная</option>
                <option value="night">Ночная</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-600 mb-2">Режим просмотра</label>
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as ViewMode)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono text-sm focus:border-blue-500 focus:outline-none"
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
            <div className="text-2xl text-slate-700 font-display">Загрузка данных...</div>
          </div>
        ) : displayData.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <div className="text-slate-700 text-lg mb-2">Нет данных за выбранный период</div>
            <div className="text-slate-600 text-sm">Измените фильтры или добавьте новые анализы</div>
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
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
                >
                  <h3 className="text-lg font-display text-blue-600 mb-6">
                    {config.label}
                  </h3>

                  {/* График */}
                  <div className="relative bg-slate-50 rounded-lg p-6 border border-slate-200">
                    {/* Линии норм */}
                    <div
                      className="absolute left-0 right-0 flex items-center"
                      style={{ bottom: `${(config.max / maxValue) * 100}%` }}
                    >
                      <div className="w-full h-px bg-rose-300 border-t border-dashed border-rose-400"></div>
                      <div className="absolute -right-2 -top-3 text-xs text-rose-600 font-mono bg-white px-2 py-0.5 rounded">
                        MAX {config.max}{config.unit}
                      </div>
                    </div>

                    {config.min > 0 && (
                      <div
                        className="absolute left-0 right-0 flex items-center"
                        style={{ bottom: `${(config.min / maxValue) * 100}%` }}
                      >
                        <div className="w-full h-px bg-emerald-300 border-t border-dashed border-emerald-400"></div>
                        <div className="absolute -right-2 -top-3 text-xs text-emerald-600 font-mono bg-white px-2 py-0.5 rounded">
                          MIN {config.min}{config.unit}
                        </div>
                      </div>
                    )}

                    {/* Линейный график с точками */}
                    <div className="relative h-80 overflow-x-auto pb-2">
                      {(() => {
                        // Вычисляем позиции точек
                        const points = typeData.values.map((point: any, index: number) => {
                          const x = (index / (typeData.values.length - 1 || 1)) * 100;
                          const y = 100 - Math.max((point.value / maxValue) * 100, 0);
                          const status = getAnalysisStatus(typeData.analysis_type, point.value);
                          const color = status === 'normal' ? '#10b981' : status === 'warning' ? '#f59e0b' : '#ef4444';
                          return { x, y, point, color, status };
                        });

                        // Создаем SVG путь для линии
                        const linePath = points.map((p: typeof points[0], index: number) => {
                          const command = index === 0 ? 'M' : 'L';
                          return `${command} ${p.x} ${p.y}`;
                        }).join(' ');

                        return (
                          <>
                            {/* SVG для линии */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                              <path
                                d={linePath}
                                fill="none"
                                stroke="#3b82f6"
                                strokeWidth="0.3"
                                vectorEffect="non-scaling-stroke"
                              />
                            </svg>

                            {/* Точки с интерактивностью */}
                            {points.map((p: typeof points[0], index: number) => (
                              <div
                                key={index}
                                className="absolute group"
                                style={{
                                  left: `${p.x}%`,
                                  bottom: `${100 - p.y}%`,
                                  transform: 'translate(-50%, 50%)'
                                }}
                              >
                                {/* Точка */}
                                <div
                                  className="w-2 h-2 rounded-full cursor-pointer transition-all duration-200 hover:scale-150"
                                  style={{ backgroundColor: p.color }}
                                ></div>

                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                                  <div className="bg-white border border-slate-300 rounded-lg p-3 shadow-xl whitespace-nowrap">
                                    <div className="text-xs text-slate-600 mb-1 font-mono">
                                      {viewMode === 'all'
                                        ? new Date(p.point.time).toLocaleString('ru-RU', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })
                                        : p.point.time}
                                    </div>
                                    <div className="text-base font-bold text-blue-600">
                                      {p.point.value.toFixed(2)}{config.unit}
                                    </div>
                                    <div className="text-xs mt-1" style={{ color: p.color }}>
                                      {p.status === 'normal' ? 'В норме' : p.status === 'warning' ? 'Близко к норме' : 'Вне нормы'}
                                    </div>
                                  </div>
                                </div>

                                {/* Метка времени */}
                                {index % Math.max(1, Math.floor(typeData.values.length / 10)) === 0 && (
                                  <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-xs text-slate-500 font-mono -rotate-45 origin-top whitespace-nowrap">
                                    {viewMode === 'all'
                                      ? new Date(p.point.time).toLocaleDateString('ru-RU', {
                                          day: '2-digit',
                                          month: '2-digit',
                                        })
                                      : p.point.time.split(' ')[0]}
                                  </div>
                                )}
                              </div>
                            ))}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Легенда */}
                  <div className="flex items-center justify-center gap-6 mt-4 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-emerald-500"></div>
                      <span>В норме</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-amber-500"></div>
                      <span>Близко к норме</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-rose-500"></div>
                      <span>Вне нормы</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Статистика */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
              <h3 className="text-2xl font-display text-blue-600 tracking-wider mb-6">
                СТАТИСТИКА
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-sm text-slate-600 mb-2">Всего анализов</div>
                  <div className="text-4xl font-display font-bold text-blue-600">
                    {analyses.length}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-slate-600 mb-2">За период</div>
                  <div className="text-2xl font-display font-bold text-blue-500">
                    {startDate && endDate &&
                      `${new Date(startDate).toLocaleDateString('ru-RU')} - ${new Date(endDate).toLocaleDateString('ru-RU')}`}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-slate-600 mb-2">Режим</div>
                  <div className="text-2xl font-display font-bold text-slate-800">
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

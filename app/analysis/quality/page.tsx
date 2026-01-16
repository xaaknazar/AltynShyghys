'use client';

import { useState, useEffect } from 'react';
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

  // Кастомный график
  const [showCustomGraph, setShowCustomGraph] = useState(false);
  const [customGraphTypes, setCustomGraphTypes] = useState<AnalysisType[]>([]);
  const [customGraphData, setCustomGraphData] = useState<any[]>([]);

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

  // Функция для построения кастомного графика
  const buildCustomGraph = async () => {
    if (customGraphTypes.length === 0) {
      alert('Выберите хотя бы один тип анализа');
      return;
    }

    setLoading(true);
    try {
      // Загружаем данные для всех выбранных типов
      const allData: any[] = [];

      for (const type of customGraphTypes) {
        const params = new URLSearchParams({
          start_date: startDate,
          end_date: endDate,
          shift_type: shiftFilter,
          analysis_type: type,
          group_by: 'none',
        });

        const response = await fetch(`/api/quality-analysis?${params}`, { cache: 'no-store' });
        const data = await response.json();

        if (data.success && data.analyses.length > 0) {
          allData.push(...data.analyses);
        }
      }

      setCustomGraphData(allData);
    } catch (error) {
      console.error('Error fetching custom graph data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Функция для переключения типа анализа в кастомном графике
  const toggleCustomGraphType = (type: AnalysisType) => {
    setCustomGraphTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  // Данные для отображения
  const displayData = viewMode === 'all' ? analyses : groupedData;

  // Группировка данных для графика
  // Generate chart data - combine multiple selected types if needed
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
      }, []).map(typeData => ({
        ...typeData,
        // Сортируем значения по времени
        values: typeData.values.sort((a: any, b: any) =>
          new Date(a.time).getTime() - new Date(b.time).getTime()
        )
      }))
    : groupedData.reduce((acc: any[], group) => {
        const existing = acc.find((item) => item.analysis_type === group.analysis_type);
        const label = viewMode === 'shift'
          ? `${group.shift_date} (${group.shift_type === 'day' ? 'Д' : 'Н'})`
          : group.shift_date;
        if (existing) {
          existing.values.push({ time: label, value: group.average, sortKey: group.shift_date });
        } else {
          acc.push({
            analysis_type: group.analysis_type,
            values: [{ time: label, value: group.average, sortKey: group.shift_date }],
          });
        }
        return acc;
      }, []).map(typeData => ({
        ...typeData,
        // Сортируем значения по дате
        values: typeData.values.sort((a: any, b: any) =>
          a.sortKey.localeCompare(b.sortKey)
        )
      }));

  return (
    <div className="space-y-8">
        {/* Фильтры */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-display font-bold text-slate-700">ФИЛЬТРЫ</h3>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCustomGraph(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all"
              >
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-sm font-bold text-blue-700">Создать график</span>
              </button>
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

                <optgroup label="Мисцелла">
                  <option value={ANALYSIS_TYPES.MISCELLA_CONCENTRATION}>{ANALYSIS_CONFIG[ANALYSIS_TYPES.MISCELLA_CONCENTRATION].label}</option>
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
                  <div className="relative bg-slate-50 rounded-lg p-8 border border-slate-200">
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
                    <div className="relative h-80 pb-2 overflow-visible">
                      {(() => {
                        // Вычисляем позиции точек с padding по краям
                        const paddingPercent = 5; // 5% padding с каждой стороны
                        const usableWidth = 100 - (paddingPercent * 2);
                        const points = typeData.values.map((point: any, index: number) => {
                          // Для одной точки ставим её в центр, для нескольких - распределяем равномерно
                          let x;
                          if (typeData.values.length === 1) {
                            x = 50; // Центр
                          } else {
                            x = paddingPercent + (index / (typeData.values.length - 1)) * usableWidth;
                          }
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

                                {/* Tooltip - улучшенное позиционирование */}
                                <div className={`absolute hidden group-hover:block z-30 ${
                                  // Позиционирование по горизонтали с улучшенной логикой
                                  p.x < 20
                                    ? 'left-full ml-3' // Точка у левого края - показываем справа с отступом
                                    : p.x > 80
                                    ? 'right-full mr-3' // Точка у правого края - показываем слева с отступом
                                    : p.x < 50
                                    ? 'left-full ml-2' // Точка слева центра - показываем справа
                                    : 'right-full mr-2' // Точка справа центра - показываем слева
                                } ${
                                  // Позиционирование по вертикали с учетом положения точки
                                  p.y < 20
                                    ? 'top-0' // Точка у верха - выравниваем по верху
                                    : p.y > 80
                                    ? 'bottom-0' // Точка у низа - выравниваем по низу
                                    : p.y < 50
                                    ? 'top-0' // Точка выше центра - выравниваем по верху
                                    : 'bottom-0' // Точка ниже центра - выравниваем по низу
                                }`}>
                                  <div className="bg-white border-2 border-slate-300 rounded-lg p-3 shadow-2xl whitespace-nowrap max-w-xs">
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

        {/* Модальное окно для создания кастомного графика */}
        {showCustomGraph && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-display font-bold text-blue-600">СОЗДАТЬ КАСТОМНЫЙ ГРАФИК</h2>
                  <button
                    onClick={() => {
                      setShowCustomGraph(false);
                      setCustomGraphData([]);
                      setCustomGraphTypes([]);
                    }}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Выбор типов анализов */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-semibold text-slate-800">
                      Выберите типы анализов ({customGraphTypes.length})
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCustomGraphTypes(Object.values(ANALYSIS_TYPES) as AnalysisType[])}
                        className="text-xs px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-all"
                      >
                        Выбрать все
                      </button>
                      <button
                        onClick={() => setCustomGraphTypes([])}
                        className="text-xs px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all"
                      >
                        Очистить
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4 bg-slate-50 rounded-lg p-4 border border-slate-200 max-h-96 overflow-y-auto">
                    {/* Входящее сырье */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">
                        Входящее сырье
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {[ANALYSIS_TYPES.MOISTURE_RAW_MATERIAL, ANALYSIS_TYPES.OIL_CONTENT_RAW_MATERIAL].map(type => {
                          const conf = ANALYSIS_CONFIG[type];
                          const isSelected = customGraphTypes.includes(type);
                          return (
                            <label
                              key={type}
                              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-slate-200 bg-white hover:border-blue-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleCustomGraphType(type)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm font-semibold text-slate-800">{conf.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Лузга */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">
                        Лузга
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {[ANALYSIS_TYPES.MOISTURE_HUSK, ANALYSIS_TYPES.FAT_HUSK, ANALYSIS_TYPES.KERNEL_LOSS_HUSK].map(type => {
                          const conf = ANALYSIS_CONFIG[type];
                          const isSelected = customGraphTypes.includes(type);
                          return (
                            <label
                              key={type}
                              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-slate-200 bg-white hover:border-blue-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleCustomGraphType(type)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm font-semibold text-slate-800">{conf.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Рушанка */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">
                        Рушанка
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {[ANALYSIS_TYPES.MOISTURE_CRUSHED, ANALYSIS_TYPES.HUSK_CONTENT_CRUSHED].map(type => {
                          const conf = ANALYSIS_CONFIG[type];
                          const isSelected = customGraphTypes.includes(type);
                          return (
                            <label
                              key={type}
                              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-slate-200 bg-white hover:border-blue-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleCustomGraphType(type)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm font-semibold text-slate-800">{conf.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Мезга с жаровни */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">
                        Мезга с жаровни
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {[ANALYSIS_TYPES.MOISTURE_ROASTER_1, ANALYSIS_TYPES.MOISTURE_ROASTER_2].map(type => {
                          const conf = ANALYSIS_CONFIG[type];
                          const isSelected = customGraphTypes.includes(type);
                          return (
                            <label
                              key={type}
                              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-slate-200 bg-white hover:border-blue-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleCustomGraphType(type)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm font-semibold text-slate-800">{conf.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Жмых с пресса */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">
                        Жмых с пресса
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {[ANALYSIS_TYPES.MOISTURE_PRESS_1, ANALYSIS_TYPES.MOISTURE_PRESS_2, ANALYSIS_TYPES.FAT_PRESS_1, ANALYSIS_TYPES.FAT_PRESS_2].map(type => {
                          const conf = ANALYSIS_CONFIG[type];
                          const isSelected = customGraphTypes.includes(type);
                          return (
                            <label
                              key={type}
                              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-slate-200 bg-white hover:border-blue-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleCustomGraphType(type)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm font-semibold text-slate-800">{conf.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Шрот */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">
                        Шрот
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {[ANALYSIS_TYPES.MOISTURE_TOASTED_MEAL, ANALYSIS_TYPES.OIL_CONTENT_MEAL].map(type => {
                          const conf = ANALYSIS_CONFIG[type];
                          const isSelected = customGraphTypes.includes(type);
                          return (
                            <label
                              key={type}
                              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-slate-200 bg-white hover:border-blue-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleCustomGraphType(type)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm font-semibold text-slate-800">{conf.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Мисцелла */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">
                        Мисцелла
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {[ANALYSIS_TYPES.MISCELLA_CONCENTRATION].map(type => {
                          const conf = ANALYSIS_CONFIG[type];
                          const isSelected = customGraphTypes.includes(type);
                          return (
                            <label
                              key={type}
                              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-slate-200 bg-white hover:border-blue-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleCustomGraphType(type)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm font-semibold text-slate-800">{conf.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Кнопка построения графика */}
                <button
                  onClick={buildCustomGraph}
                  disabled={loading || customGraphTypes.length === 0}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-display text-lg rounded-lg transition-all shadow-lg"
                >
                  {loading ? 'Загрузка данных...' : 'Построить график'}
                </button>

                {/* Отображение кастомного графика */}
                {customGraphData.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-display font-bold text-blue-600 mb-4">
                      КОМБИНИРОВАННЫЙ ГРАФИК
                    </h3>

                    {(() => {
                      // Группируем данные по типам анализов
                      const groupedByType = customGraphData.reduce((acc: any, analysis) => {
                        if (!acc[analysis.analysis_type]) {
                          acc[analysis.analysis_type] = [];
                        }
                        acc[analysis.analysis_type].push(analysis);
                        return acc;
                      }, {});

                      // Подготавливаем данные для каждого типа
                      const chartLines = Object.entries(groupedByType).map(([type, data]: [string, any]) => {
                        const sortedData = data.sort((a: any, b: any) =>
                          new Date(a.sample_time).getTime() - new Date(b.sample_time).getTime()
                        );
                        return {
                          type,
                          data: sortedData,
                          config: ANALYSIS_CONFIG[type as AnalysisType],
                        };
                      });

                      // Цвета для разных линий
                      const colors = [
                        '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
                        '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6',
                        '#6366f1', '#a855f7', '#22d3ee', '#fb923c', '#34d399'
                      ];

                      // Находим максимальное значение для масштабирования
                      const allValues = customGraphData.map((d: any) => d.value);
                      const maxValue = Math.max(...allValues) * 1.2;

                      return (
                        <div className="bg-slate-50 rounded-lg p-8 border border-slate-200">
                          <div className="relative h-96 overflow-visible">
                            {/* SVG для всех линий */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                              {chartLines.map((line, lineIndex) => {
                                const paddingPercent = 5;
                                const usableWidth = 100 - (paddingPercent * 2);

                                const points = line.data.map((point: any, index: number) => {
                                  let x;
                                  if (line.data.length === 1) {
                                    x = 50;
                                  } else {
                                    x = paddingPercent + (index / (line.data.length - 1)) * usableWidth;
                                  }
                                  const y = 100 - Math.max((point.value / maxValue) * 100, 0);
                                  return { x, y };
                                });

                                const linePath = points.map((p: any, index: number) => {
                                  const command = index === 0 ? 'M' : 'L';
                                  return `${command} ${p.x} ${p.y}`;
                                }).join(' ');

                                return (
                                  <path
                                    key={lineIndex}
                                    d={linePath}
                                    fill="none"
                                    stroke={colors[lineIndex % colors.length]}
                                    strokeWidth="0.3"
                                    vectorEffect="non-scaling-stroke"
                                  />
                                );
                              })}
                            </svg>

                            {/* Точки для всех линий */}
                            {chartLines.map((line, lineIndex) => {
                              const paddingPercent = 5;
                              const usableWidth = 100 - (paddingPercent * 2);

                              return line.data.map((point: any, pointIndex: number) => {
                                let x;
                                if (line.data.length === 1) {
                                  x = 50;
                                } else {
                                  x = paddingPercent + (pointIndex / (line.data.length - 1)) * usableWidth;
                                }
                                const y = 100 - Math.max((point.value / maxValue) * 100, 0);
                                const status = getAnalysisStatus(line.type as AnalysisType, point.value);
                                const pointColor = colors[lineIndex % colors.length];

                                return (
                                  <div
                                    key={`${lineIndex}-${pointIndex}`}
                                    className="absolute group"
                                    style={{
                                      left: `${x}%`,
                                      bottom: `${100 - y}%`,
                                      transform: 'translate(-50%, 50%)'
                                    }}
                                  >
                                    <div
                                      className="w-2 h-2 rounded-full cursor-pointer transition-all duration-200 hover:scale-150"
                                      style={{ backgroundColor: pointColor }}
                                    ></div>

                                    {/* Tooltip */}
                                    <div className={`absolute hidden group-hover:block z-30 ${
                                      x < 20 ? 'left-full ml-3' : x > 80 ? 'right-full mr-3' : x < 50 ? 'left-full ml-2' : 'right-full mr-2'
                                    } ${
                                      y < 20 ? 'top-0' : y > 80 ? 'bottom-0' : y < 50 ? 'top-0' : 'bottom-0'
                                    }`}>
                                      <div className="bg-white border-2 border-slate-300 rounded-lg p-3 shadow-2xl whitespace-nowrap">
                                        <div className="text-xs text-slate-600 mb-1">{line.config.label}</div>
                                        <div className="text-xs text-slate-500 mb-1 font-mono">
                                          {new Date(point.sample_time).toLocaleString('ru-RU', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })}
                                        </div>
                                        <div className="text-base font-bold" style={{ color: pointColor }}>
                                          {point.value.toFixed(2)}{line.config.unit}
                                        </div>
                                        <div className="text-xs mt-1" style={{
                                          color: status === 'normal' ? '#10b981' : status === 'warning' ? '#f59e0b' : '#ef4444'
                                        }}>
                                          {status === 'normal' ? 'В норме' : status === 'warning' ? 'Близко к норме' : 'Вне нормы'}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              });
                            })}
                          </div>

                          {/* Легенда */}
                          <div className="mt-6 flex flex-wrap gap-4 justify-center">
                            {chartLines.map((line, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded"
                                  style={{ backgroundColor: colors[index % colors.length] }}
                                ></div>
                                <span className="text-xs text-slate-700">{line.config.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {customGraphData.length === 0 && customGraphTypes.length > 0 && !loading && (
                  <div className="text-center py-8 text-slate-500">
                    Нажмите "Построить график" для загрузки данных
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

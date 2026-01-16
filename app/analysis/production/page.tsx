'use client';

import { useState, useEffect } from 'react';

type QuickPeriod = 'week' | 'month' | 'year' | 'all' | 'custom';
type ViewMode = 'daily' | 'detailed';

export default function ProductionAnalysisPage() {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [shiftFilter, setShiftFilter] = useState<'all' | 'day' | 'night'>('all');
  const [productionData, setProductionData] = useState<any[]>([]);
  const [detailedData, setDetailedData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [quickPeriod, setQuickPeriod] = useState<QuickPeriod>('week');
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [techData, setTechData] = useState<{[key: string]: any}>({});
  const [techMetrics, setTechMetrics] = useState<{[key: string]: any[]}>({});
  const [selectedMetrics, setSelectedMetrics] = useState<{[collectionName: string]: string[]}>({});
  const [showShiftsOnChart, setShowShiftsOnChart] = useState(false);

  // Кастомный график для технических параметров
  const [showCustomTechGraph, setShowCustomTechGraph] = useState(false);
  const [customTechMetrics, setCustomTechMetrics] = useState<{collection: string; metric: string}[]>([]);
  const [customTechGraphData, setCustomTechGraphData] = useState<any[]>([]);

  const DAILY_TARGET = 1200; // Целевое производство в сутки (тонн)

  const techCollections = [
    { name: 'Extractor_TechData_Job', title: 'Экстрактор' },
    { name: 'Press_1_Job', title: 'Пресс 1' },
    { name: 'Press_2_Job', title: 'Пресс 2' },
    { name: 'Press_Jarovnia_Mezga', title: 'Жаровня и Мезга' },
    { name: 'Data_extractor_cooking', title: 'Экстрактор и Жаровня (дополнительно)' },
  ];

  // Нормы для метрик (одно значение или диапазон [min, max])
  const metricNorms: {[key: string]: number | [number, number]} = {
    'Вакуум': -900,
    'Температура масла': [105, 110],
    'Мезга Жаровня 2': 105,
    'Жаровня 1': 105,
    // Data_extractor_cooking метрики
    'Верх.Темпер. Мезги Жаровни 1': [100, 110],
    'Температура Мезги Жаровни 1': [95, 105],
    'Верх.Темпер. Мезги Жаровни 2': [100, 110],
    'Температура Мезги Жаровни 2': [95, 105],
    'Temperature_Toster_TT5415': [115, 125],
    'Koefficient_Extractor_40D201-1': [0.8, 1.2],
    'Press (Extractor)': [80, 120],
    'Percent_Extractor_40D201-12': [26, 30],
    'Podacha_Gexan_Clear': [50, 100],
  };

  useEffect(() => {
    // Установка дат по умолчанию: последняя неделя
    setQuickPeriod('week');
    applyQuickPeriod('week');
  }, []);

  const applyQuickPeriod = (period: QuickPeriod) => {
    const end = new Date();
    const start = new Date();

    if (period === 'week') {
      start.setDate(start.getDate() - 7);
    } else if (period === 'month') {
      start.setDate(1); // Начало текущего месяца
    } else if (period === 'year') {
      start.setMonth(0, 1); // Начало текущего года (1 января)
    } else if (period === 'all') {
      start.setFullYear(2025, 8, 1); // 1 сентября 2025
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    setQuickPeriod(period);
  };

  useEffect(() => {
    if (startDate && endDate) {
      if (viewMode === 'daily') {
        fetchProductionData();
      }
    }
  }, [startDate, endDate, shiftFilter, viewMode]);

  useEffect(() => {
    if (viewMode === 'detailed' && selectedDate) {
      fetchDetailedData(selectedDate);
      fetchTechnicalData(selectedDate);
    }
  }, [selectedDate, viewMode]);

  const fetchProductionData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        shift_type: shiftFilter,
      });

      const response = await fetch(`/api/production/range?${params}`, { cache: 'no-store' });
      const data = await response.json();

      if (data.success) {
        setProductionData(data.data || []);
        // Устанавливаем первую дату как выбранную для детального просмотра
        if (data.data && data.data.length > 0 && !selectedDate) {
          setSelectedDate(data.data[0].date);
        }
      }
    } catch (error) {
      console.error('Error fetching production data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetailedData = async (date: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        date: date,
      });

      const response = await fetch(`/api/production/detailed?${params}`, { cache: 'no-store' });
      const data = await response.json();

      if (data.success) {
        setDetailedData(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching detailed data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicalData = async (date: string) => {
    try {
      const promises = techCollections.map(async (collection) => {
        const params = new URLSearchParams({
          date: date,
          collection: collection.name,
        });

        const response = await fetch(`/api/technical-data/detailed?${params}`, { cache: 'no-store' });
        const data = await response.json();

        if (data.success) {
          return { name: collection.name, data: data.data || [], metrics: data.metrics || [] };
        }
        return { name: collection.name, data: [], metrics: [] };
      });

      const results = await Promise.all(promises);

      const newTechData: {[key: string]: any} = {};
      const newTechMetrics: {[key: string]: any[]} = {};

      results.forEach((result) => {
        newTechData[result.name] = result.data;
        newTechMetrics[result.name] = result.metrics;
      });

      setTechData(newTechData);
      setTechMetrics(newTechMetrics);
    } catch (error) {
      console.error('Error fetching technical data:', error);
    }
  };

  const totalProduction = productionData.reduce((sum, item) => sum + (item.total || 0), 0);
  const averageDaily = productionData.length > 0 ? totalProduction / productionData.length : 0;

  const getMetricColor = (index: number) => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    return colors[index % colors.length];
  };

  const toggleMetricSelection = (collectionName: string, metricTitle: string) => {
    setSelectedMetrics(prev => {
      const current = prev[collectionName] || [];
      const isSelected = current.includes(metricTitle);

      return {
        ...prev,
        [collectionName]: isSelected
          ? current.filter(m => m !== metricTitle)
          : [...current, metricTitle]
      };
    });
  };

  // Функции для кастомного графика технических параметров
  const toggleCustomTechMetric = (collection: string, metric: string) => {
    setCustomTechMetrics(prev => {
      const exists = prev.find(m => m.collection === collection && m.metric === metric);
      if (exists) {
        return prev.filter(m => !(m.collection === collection && m.metric === metric));
      } else {
        return [...prev, { collection, metric }];
      }
    });
  };

  const buildCustomTechGraph = async () => {
    if (customTechMetrics.length === 0 || !selectedDate) {
      alert('Выберите хотя бы один параметр');
      return;
    }

    setLoading(true);
    try {
      // Загружаем данные для выбранных метрик
      const allData: any[] = [];

      for (const { collection, metric } of customTechMetrics) {
        const params = new URLSearchParams({
          date: selectedDate,
          collection: collection,
        });

        const response = await fetch(`/api/technical-data/detailed?${params}`, { cache: 'no-store' });
        const data = await response.json();

        if (data.success && data.data.length > 0) {
          // Извлекаем данные для этой метрики из агрегированных данных
          const metricData = data.data
            .map((timePoint: any) => ({
              time: timePoint.time,
              value: timePoint[metric]
            }))
            .filter((d: any) => d.value !== undefined && d.value !== null);

          if (metricData.length > 0) {
            allData.push({
              collection,
              metric,
              data: metricData,
            });
          }
        }
      }

      setCustomTechGraphData(allData);
    } catch (error) {
      console.error('Error fetching custom tech graph data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderTechnicalChart = (collectionName: string, title: string) => {
    const data = techData[collectionName] || [];
    const metrics = techMetrics[collectionName] || [];

    if (data.length === 0 || metrics.length === 0) {
      return null;
    }

    const selected = selectedMetrics[collectionName] || [];
    const selectedMetricsData = metrics.filter((m: any) => selected.includes(m.title));

    return (
      <div key={collectionName} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-display font-bold text-slate-700 mb-4">{title}</h3>

        {/* Чекбоксы для выбора метрик */}
        <div className="mb-6 flex flex-wrap gap-3">
          {metrics.map((metric: any, metricIndex: number) => {
            const isSelected = selected.includes(metric.title);
            const color = getMetricColor(metricIndex);

            return (
              <label
                key={metric.title}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-slate-50 border-slate-400'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleMetricSelection(collectionName, metric.title)}
                  className="w-4 h-4 cursor-pointer"
                  style={{ accentColor: color }}
                />
                <span className="text-sm font-medium text-slate-700">{metric.title}</span>
                <span className="text-xs text-slate-500 font-mono">({metric.unit})</span>
              </label>
            );
          })}
        </div>

        {/* Объединенный график */}
        {selectedMetricsData.length > 0 && (
          <div>
            {/* Легенда */}
            <div className="mb-4 flex flex-wrap gap-4">
              {selectedMetricsData.map((metric: any, idx: number) => {
                const metricIndex = metrics.findIndex((m: any) => m.title === metric.title);
                const color = getMetricColor(metricIndex);

                return (
                  <div key={metric.title} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: color }}
                    ></div>
                    <span className="text-sm font-medium text-slate-700">
                      {metric.title} ({metric.unit})
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="relative bg-slate-50 rounded-lg p-6 border border-slate-200">
              <div className="relative h-80 overflow-x-auto">
                {selectedMetricsData.map((metric: any) => {
                  const metricIndex = metrics.findIndex((m: any) => m.title === metric.title);
                  const metricData = data.filter((d: any) => d[metric.title] !== undefined);

                  if (metricData.length === 0) return null;

                  // Получаем все значения метрики
                  const values = metricData.map((d: any) => d[metric.title]);
                  const dataMin = Math.min(...values);
                  const dataMax = Math.max(...values);

                  // Правильная обработка для отрицательных значений
                  let minValue: number, maxValue: number;
                  if (dataMax <= 0) {
                    minValue = dataMin * 1.2;
                    maxValue = dataMax * 0.8;
                  } else if (dataMin >= 0) {
                    minValue = dataMin * 0.8;
                    maxValue = dataMax * 1.2;
                  } else {
                    minValue = dataMin < 0 ? dataMin * 1.2 : dataMin * 0.8;
                    maxValue = dataMax * 1.2;
                  }

                  const valueRange = maxValue - minValue;

                  const points = metricData.map((point: any, index: number) => {
                    const x = (index / (metricData.length - 1 || 1)) * 100;
                    const normalizedValue = valueRange !== 0 ? ((point[metric.title] - minValue) / valueRange) : 0.5;
                    const y = 100 - (normalizedValue * 100);
                    return { x, y, point, value: point[metric.title] };
                  });

                  const linePath = points.map((p: any, index: number) => {
                    const command = index === 0 ? 'M' : 'L';
                    return `${command} ${p.x} ${p.y}`;
                  }).join(' ');

                  const color = getMetricColor(metricIndex);

                  // Проверяем есть ли норма для этой метрики
                  const normValue = metricNorms[metric.title];
                  let normY: number | null = null;
                  let normMinY: number | null = null;
                  let normMaxY: number | null = null;
                  let isRange = false;

                  if (normValue !== undefined && valueRange !== 0) {
                    if (Array.isArray(normValue)) {
                      // Диапазон норм [min, max]
                      isRange = true;
                      const normalizedMin = (normValue[0] - minValue) / valueRange;
                      const normalizedMax = (normValue[1] - minValue) / valueRange;
                      normMinY = 100 - (normalizedMin * 100);
                      normMaxY = 100 - (normalizedMax * 100);
                    } else {
                      // Одно значение нормы
                      const normalizedNorm = (normValue - minValue) / valueRange;
                      normY = 100 - (normalizedNorm * 100);
                    }
                  }

                  return (
                    <div key={metric.title}>
                      {/* SVG для линии */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path
                          d={linePath}
                          fill="none"
                          stroke={color}
                          strokeWidth="0.8"
                          vectorEffect="non-scaling-stroke"
                          opacity="0.8"
                        />
                        {/* Линия нормы (одно значение) */}
                        {normY !== null && (
                          <line
                            x1="0"
                            y1={normY}
                            x2="100"
                            y2={normY}
                            stroke="#ef4444"
                            strokeWidth="0.5"
                            strokeDasharray="2,2"
                            vectorEffect="non-scaling-stroke"
                            opacity="0.7"
                          />
                        )}
                        {/* Линии норм (диапазон) */}
                        {isRange && normMinY !== null && normMaxY !== null && (
                          <>
                            <line
                              x1="0"
                              y1={normMinY}
                              x2="100"
                              y2={normMinY}
                              stroke="#10b981"
                              strokeWidth="0.5"
                              strokeDasharray="2,2"
                              vectorEffect="non-scaling-stroke"
                              opacity="0.7"
                            />
                            <line
                              x1="0"
                              y1={normMaxY}
                              x2="100"
                              y2={normMaxY}
                              stroke="#10b981"
                              strokeWidth="0.5"
                              strokeDasharray="2,2"
                              vectorEffect="non-scaling-stroke"
                              opacity="0.7"
                            />
                            {/* Заливка между линиями норм */}
                            <rect
                              x="0"
                              y={normMaxY}
                              width="100"
                              height={normMinY - normMaxY}
                              fill="#10b981"
                              opacity="0.1"
                            />
                          </>
                        )}
                      </svg>

                      {/* Метка нормы (одно значение) */}
                      {normY !== null && (
                        <div
                          className="absolute left-1 pointer-events-none"
                          style={{
                            top: `${normY}%`,
                            transform: 'translateY(-50%)'
                          }}
                        >
                          <div className="bg-red-500 text-white text-xs px-2 py-0.5 rounded font-mono font-semibold shadow-md">
                            Норма: {normValue as number}
                          </div>
                        </div>
                      )}
                      {/* Метки норм (диапазон) */}
                      {isRange && normMinY !== null && normMaxY !== null && (
                        <>
                          <div
                            className="absolute left-1 pointer-events-none"
                            style={{
                              top: `${normMinY}%`,
                              transform: 'translateY(-50%)'
                            }}
                          >
                            <div className="bg-emerald-600 text-white text-xs px-2 py-0.5 rounded font-mono font-semibold shadow-md">
                              Мин: {(normValue as [number, number])[0]}
                            </div>
                          </div>
                          <div
                            className="absolute left-1 pointer-events-none"
                            style={{
                              top: `${normMaxY}%`,
                              transform: 'translateY(-50%)'
                            }}
                          >
                            <div className="bg-emerald-600 text-white text-xs px-2 py-0.5 rounded font-mono font-semibold shadow-md">
                              Макс: {(normValue as [number, number])[1]}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Точки */}
                      {points.map((p: any, index: number) => (
                        <div
                          key={`${metric.title}-${index}`}
                          className="absolute group"
                          style={{
                            left: `${p.x}%`,
                            bottom: `${100 - p.y}%`,
                            transform: 'translate(-50%, 50%)'
                          }}
                        >
                          <div
                            className="w-2.5 h-2.5 rounded-full cursor-pointer transition-all duration-200 hover:scale-150 border-2 border-white shadow-sm"
                            style={{ backgroundColor: color }}
                          ></div>

                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
                            <div className="bg-white border-2 rounded-lg p-3 shadow-xl whitespace-nowrap" style={{ borderColor: color }}>
                              <div className="text-xs text-slate-600 mb-1 font-mono">
                                {p.point.time}
                              </div>
                              <div className="text-sm font-medium text-slate-700 mb-1">
                                {metric.title}
                              </div>
                              <div className="text-lg font-bold" style={{ color }}>
                                {p.value?.toFixed(2)} {metric.unit}
                              </div>
                            </div>
                          </div>

                          {index % Math.max(1, Math.floor(metricData.length / 12)) === 0 && (
                            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-xs text-slate-500 font-mono -rotate-45 origin-top whitespace-nowrap">
                              {p.point.time}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {selectedMetricsData.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            Выберите метрики для отображения графика
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-8">
      {/* Фильтры */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
        <h3 className="text-base sm:text-lg font-display font-bold text-slate-700 mb-3 sm:mb-4">ФИЛЬТРЫ</h3>

        {/* Переключатель режима просмотра */}
        <div className="flex flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-6">
          <button
            onClick={() => setViewMode('daily')}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg border-2 transition-all text-sm sm:text-base ${
              viewMode === 'daily'
                ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-semibold'
                : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300'
            }`}
          >
            По суткам
          </button>
          <button
            onClick={() => setViewMode('detailed')}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg border-2 transition-all text-sm sm:text-base ${
              viewMode === 'detailed'
                ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-semibold'
                : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300'
            }`}
          >
            Технологические параметры
          </button>
        </div>

        {viewMode === 'daily' && (
          <>
            {/* Быстрые кнопки */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-6">
              <button
                onClick={() => applyQuickPeriod('week')}
                className={`px-4 py-2 rounded-lg border-2 transition-all ${
                  quickPeriod === 'week'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 font-semibold'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'
                }`}
              >
                За неделю
              </button>
              <button
                onClick={() => applyQuickPeriod('month')}
                className={`px-4 py-2 rounded-lg border-2 transition-all ${
                  quickPeriod === 'month'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 font-semibold'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'
                }`}
              >
                С начала месяца
              </button>
              <button
                onClick={() => applyQuickPeriod('year')}
                className={`px-4 py-2 rounded-lg border-2 transition-all ${
                  quickPeriod === 'year'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 font-semibold'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'
                }`}
              >
                С начала года
              </button>
              <button
                onClick={() => applyQuickPeriod('all')}
                className={`px-4 py-2 rounded-lg border-2 transition-all ${
                  quickPeriod === 'all'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 font-semibold'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'
                }`}
              >
                За весь период
              </button>
              <button
                onClick={() => setQuickPeriod('custom')}
                className={`px-4 py-2 rounded-lg border-2 transition-all ${
                  quickPeriod === 'custom'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 font-semibold'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'
                }`}
              >
                Произвольный период
              </button>
            </div>
          </>
        )}

        {viewMode === 'daily' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-600 mb-2">Начало периода</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setQuickPeriod('custom');
                }}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-600 mb-2">Конец периода</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setQuickPeriod('custom');
                }}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono text-sm focus:border-blue-500 focus:outline-none"
              />
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
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs text-slate-600 mb-2">Выберите дату для детального просмотра</label>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono text-sm focus:border-blue-500 focus:outline-none"
              >
                {productionData.map((day) => (
                  <option key={day.date} value={day.date}>
                    {new Date(day.date).toLocaleDateString('ru-RU', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })} - {day.total.toFixed(2)} т
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="text-2xl text-slate-700 font-display">Загрузка данных...</div>
        </div>
      ) : viewMode === 'daily' && productionData.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="text-slate-700 text-lg mb-2">Нет данных за выбранный период</div>
          <div className="text-slate-600 text-sm">Измените фильтры или добавьте новые данные</div>
        </div>
      ) : viewMode === 'detailed' && detailedData.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="text-slate-700 text-lg mb-2">Нет детальных данных за выбранную дату</div>
          <div className="text-slate-600 text-sm">Выберите другую дату</div>
        </div>
      ) : (
        <div className="space-y-8">
          {viewMode === 'daily' ? (
            <>
          {/* Статистика */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="text-sm text-slate-600 mb-2">Общее производство</div>
              <div className="text-3xl font-display font-bold text-blue-600">
                {totalProduction.toFixed(2)} т
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="text-sm text-slate-600 mb-2">Среднее в сутки</div>
              <div className="text-3xl font-display font-bold text-emerald-600">
                {averageDaily.toFixed(2)} т
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="text-sm text-slate-600 mb-2">Дней в выборке</div>
              <div className="text-3xl font-display font-bold text-slate-800">
                {productionData.length}
              </div>
            </div>
          </div>

          {/* График */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-display text-blue-600">
                ДИНАМИКА ПРОИЗВОДСТВА
              </h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showShiftsOnChart}
                  onChange={(e) => setShowShiftsOnChart(e.target.checked)}
                  className="w-4 h-4 cursor-pointer accent-blue-600"
                />
                <span className="text-sm text-slate-700">Показать смены</span>
              </label>
            </div>

            <div className="relative bg-slate-50 rounded-lg p-6 border border-slate-200">
              <div className="relative h-96 overflow-x-auto">
                {(() => {
                  const maxValue = Math.max(...productionData.map(d => d.total), DAILY_TARGET) * 1.15;
                  const minValue = 0;
                  const valueRange = maxValue - minValue;

                  // Линия нормы
                  const normY = 100 - ((DAILY_TARGET - minValue) / valueRange) * 100;

                  // Метки оси Y
                  const yAxisMarks = [
                    { value: 0, label: '0' },
                    { value: 400, label: '400' },
                    { value: 800, label: '800' },
                    { value: DAILY_TARGET, label: '1200', highlight: true },
                    { value: 1600, label: '1600' },
                  ].filter(mark => mark.value <= maxValue);

                  return (
                    <>
                      {/* Ось Y с метками */}
                      <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between py-2">
                        {yAxisMarks.map((mark) => {
                          const y = 100 - ((mark.value - minValue) / valueRange) * 100;
                          return (
                            <div
                              key={mark.value}
                              className={`text-xs font-mono ${mark.highlight ? 'text-red-600 font-bold' : 'text-slate-500'}`}
                              style={{
                                position: 'absolute',
                                top: `${y}%`,
                                transform: 'translateY(-50%)',
                              }}
                            >
                              {mark.label}
                            </div>
                          );
                        })}
                      </div>

                      {/* SVG для линий и графика */}
                      <svg className="absolute left-12 top-0 w-[calc(100%-3rem)] h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                        {/* Линия нормы */}
                        <line
                          x1="0"
                          y1={normY}
                          x2="100"
                          y2={normY}
                          stroke="#ef4444"
                          strokeWidth="0.4"
                          strokeDasharray="2,2"
                          vectorEffect="non-scaling-stroke"
                          opacity="0.7"
                        />

                        {!showShiftsOnChart ? (
                          // Общая линия производства
                          (() => {
                            const points = productionData.map((point, index) => {
                              const x = (index / (productionData.length - 1 || 1)) * 100;
                              const y = 100 - ((point.total - minValue) / valueRange) * 100;
                              return { x, y, point };
                            });

                            const linePath = points.map((p, index) => {
                              const command = index === 0 ? 'M' : 'L';
                              return `${command} ${p.x} ${p.y}`;
                            }).join(' ');

                            return (
                              <path
                                d={linePath}
                                fill="none"
                                stroke="#3b82f6"
                                strokeWidth="1"
                                vectorEffect="non-scaling-stroke"
                                opacity="0.9"
                              />
                            );
                          })()
                        ) : (
                          // Линии по сменам
                          <>
                            {/* Дневная смена */}
                            {(() => {
                              const points = productionData.map((point, index) => {
                                const x = (index / (productionData.length - 1 || 1)) * 100;
                                const y = 100 - ((point.dayShift - minValue) / valueRange) * 100;
                                return { x, y };
                              });

                              const linePath = points.map((p, index) => {
                                const command = index === 0 ? 'M' : 'L';
                                return `${command} ${p.x} ${p.y}`;
                              }).join(' ');

                              return (
                                <path
                                  d={linePath}
                                  fill="none"
                                  stroke="#f59e0b"
                                  strokeWidth="1"
                                  vectorEffect="non-scaling-stroke"
                                  opacity="0.8"
                                />
                              );
                            })()}

                            {/* Ночная смена */}
                            {(() => {
                              const points = productionData.map((point, index) => {
                                const x = (index / (productionData.length - 1 || 1)) * 100;
                                const y = 100 - ((point.nightShift - minValue) / valueRange) * 100;
                                return { x, y };
                              });

                              const linePath = points.map((p, index) => {
                                const command = index === 0 ? 'M' : 'L';
                                return `${command} ${p.x} ${p.y}`;
                              }).join(' ');

                              return (
                                <path
                                  d={linePath}
                                  fill="none"
                                  stroke="#8b5cf6"
                                  strokeWidth="1"
                                  vectorEffect="non-scaling-stroke"
                                  opacity="0.8"
                                />
                              );
                            })()}
                          </>
                        )}
                      </svg>

                      {/* Метка нормы */}
                      <div
                        className="absolute left-14 pointer-events-none"
                        style={{
                          top: `${normY}%`,
                          transform: 'translateY(-50%)'
                        }}
                      >
                        <div className="bg-red-500 text-white text-xs px-2 py-0.5 rounded font-mono font-semibold shadow-md">
                          Норма: {DAILY_TARGET} т
                        </div>
                      </div>

                      {/* Легенда при показе смен */}
                      {showShiftsOnChart && (
                        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg border border-slate-200 p-3 shadow-md">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-0.5 bg-amber-500"></div>
                              <span className="text-xs font-medium text-slate-700">Дневная смена (08:00-20:00)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-0.5 bg-purple-500"></div>
                              <span className="text-xs font-medium text-slate-700">Ночная смена (20:00-08:00)</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Точки */}
                      {productionData.map((point, index) => {
                        const x = (index / (productionData.length - 1 || 1)) * 100;
                        const yTotal = 100 - ((point.total - minValue) / valueRange) * 100;
                        const yDay = 100 - ((point.dayShift - minValue) / valueRange) * 100;
                        const yNight = 100 - ((point.nightShift - minValue) / valueRange) * 100;

                        // Цвет точки в зависимости от выполнения нормы
                        const isAboveTarget = point.total >= DAILY_TARGET;
                        const pointColor = isAboveTarget ? '#10b981' : '#ef4444';

                        return (
                          <div key={index}>
                            {!showShiftsOnChart ? (
                              // Точка общего производства
                              <div
                                className="absolute group"
                                style={{
                                  left: `calc(3rem + (100% - 3rem) * ${x} / 100)`,
                                  top: `${yTotal}%`,
                                  transform: 'translate(-50%, -50%)'
                                }}
                              >
                                <div
                                  className="w-3.5 h-3.5 rounded-full cursor-pointer transition-all duration-200 hover:scale-150 border-2 border-white shadow-md"
                                  style={{ backgroundColor: pointColor }}
                                ></div>

                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
                                  <div className="bg-white border-2 border-slate-300 rounded-lg p-3 shadow-xl whitespace-nowrap">
                                    <div className="text-xs text-slate-600 mb-2 font-mono">
                                      {new Date(point.date).toLocaleDateString('ru-RU', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                      })}
                                    </div>
                                    <div className="space-y-1">
                                      <div className="text-xs text-amber-600">
                                        <span className="font-medium">День:</span> {point.dayShift?.toFixed(2)} т
                                      </div>
                                      <div className="text-xs text-purple-600">
                                        <span className="font-medium">Ночь:</span> {point.nightShift?.toFixed(2)} т
                                      </div>
                                      <div className="text-sm font-bold pt-1 border-t border-slate-200" style={{ color: pointColor }}>
                                        Всего: {point.total?.toFixed(2)} т
                                      </div>
                                      {point.total < DAILY_TARGET && (
                                        <div className="text-xs text-red-600 pt-1">
                                          Ниже нормы на {(DAILY_TARGET - point.total).toFixed(2)} т
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {index % Math.max(1, Math.floor(productionData.length / 12)) === 0 && (
                                  <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-xs text-slate-500 font-mono -rotate-45 origin-top whitespace-nowrap">
                                    {new Date(point.date).toLocaleDateString('ru-RU', {
                                      day: '2-digit',
                                      month: '2-digit',
                                    })}
                                  </div>
                                )}
                              </div>
                            ) : (
                              // Точки для смен
                              <>
                                {/* Точка дневной смены */}
                                <div
                                  className="absolute group"
                                  style={{
                                    left: `calc(3rem + (100% - 3rem) * ${x} / 100)`,
                                    top: `${yDay}%`,
                                    transform: 'translate(-50%, -50%)'
                                  }}
                                >
                                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 cursor-pointer transition-all duration-200 hover:scale-150 border-2 border-white shadow-sm"></div>
                                </div>

                                {/* Точка ночной смены */}
                                <div
                                  className="absolute group"
                                  style={{
                                    left: `calc(3rem + (100% - 3rem) * ${x} / 100)`,
                                    top: `${yNight}%`,
                                    transform: 'translate(-50%, -50%)'
                                  }}
                                >
                                  <div className="w-2.5 h-2.5 rounded-full bg-purple-500 cursor-pointer transition-all duration-200 hover:scale-150 border-2 border-white shadow-sm"></div>

                                  {/* Tooltip для режима смен (показываем на ночной точке) */}
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
                                    <div className="bg-white border-2 border-slate-300 rounded-lg p-3 shadow-xl whitespace-nowrap">
                                      <div className="text-xs text-slate-600 mb-2 font-mono">
                                        {new Date(point.date).toLocaleDateString('ru-RU', {
                                          day: '2-digit',
                                          month: '2-digit',
                                          year: 'numeric',
                                        })}
                                      </div>
                                      <div className="space-y-1">
                                        <div className="text-xs text-amber-600">
                                          <span className="font-medium">День:</span> {point.dayShift?.toFixed(2)} т
                                        </div>
                                        <div className="text-xs text-purple-600">
                                          <span className="font-medium">Ночь:</span> {point.nightShift?.toFixed(2)} т
                                        </div>
                                        <div className="text-sm font-bold pt-1 border-t border-slate-200" style={{ color: pointColor }}>
                                          Всего: {point.total?.toFixed(2)} т
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {index % Math.max(1, Math.floor(productionData.length / 12)) === 0 && (
                                  <div
                                    className="absolute text-xs text-slate-500 font-mono -rotate-45 origin-top whitespace-nowrap"
                                    style={{
                                      left: `calc(3rem + ${x}% * (100% - 3rem) / 100)`,
                                      top: '100%',
                                      marginTop: '0.5rem',
                                      transform: 'translate(-50%, 0) rotate(-45deg)',
                                    }}
                                  >
                                    {new Date(point.date).toLocaleDateString('ru-RU', {
                                      day: '2-digit',
                                      month: '2-digit',
                                    })}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Таблица данных */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-lg font-display text-blue-600 mb-4">
              ДЕТАЛЬНЫЕ ДАННЫЕ
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Дата</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Дневная смена, т</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Ночная смена, т</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Всего, т</th>
                  </tr>
                </thead>
                <tbody>
                  {productionData.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-sm font-mono text-slate-800">
                        {new Date(item.date).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="py-3 px-4 text-sm font-mono text-slate-800 text-right">
                        {item.dayShift?.toFixed(2) || '0.00'}
                      </td>
                      <td className="py-3 px-4 text-sm font-mono text-slate-800 text-right">
                        {item.nightShift?.toFixed(2) || '0.00'}
                      </td>
                      <td className="py-3 px-4 text-sm font-mono font-bold text-blue-600 text-right">
                        {item.total?.toFixed(2) || '0.00'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
            </>
          ) : (
            <>
              {/* Детальный режим - 30 минутные интервалы */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-xl font-display font-bold text-blue-600 mb-6">
                  ДЕТАЛЬНАЯ ДИНАМИКА ПО 30 МИНУТАМ
                </h3>
                <div className="text-sm text-slate-600 mb-4">
                  Дата: {new Date(selectedDate).toLocaleDateString('ru-RU', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>

                {/* График */}
                <div className="relative bg-slate-50 rounded-lg p-6 border border-slate-200">
                  <div className="relative h-96 overflow-x-auto">
                    {(() => {
                      const maxValue = Math.max(...detailedData.map(d => d.totalProduction), 5) * 1.2;
                      const points = detailedData.map((point, index) => {
                        const x = (index / (detailedData.length - 1 || 1)) * 100;
                        const y = 100 - Math.max((point.totalProduction / maxValue) * 100, 0);
                        return { x, y, point };
                      });

                      const linePath = points.map((p, index) => {
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
                              strokeWidth="0.5"
                              vectorEffect="non-scaling-stroke"
                            />
                          </svg>

                          {/* Точки */}
                          {points.map((p, index) => (
                            <div
                              key={index}
                              className="absolute group"
                              style={{
                                left: `${p.x}%`,
                                bottom: `${100 - p.y}%`,
                                transform: 'translate(-50%, 50%)'
                              }}
                            >
                              <div className="w-2 h-2 rounded-full bg-blue-600 cursor-pointer transition-all duration-200 hover:scale-150"></div>

                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                                <div className="bg-white border border-slate-300 rounded-lg p-3 shadow-xl whitespace-nowrap">
                                  <div className="text-xs text-slate-600 mb-1 font-mono">
                                    {p.point.time}
                                  </div>
                                  <div className="text-base font-bold text-blue-600">
                                    {p.point.totalProduction?.toFixed(2)} т
                                  </div>
                                  <div className="text-xs text-slate-600">
                                    Скорость: {p.point.averageSpeed?.toFixed(2)} т/ч
                                  </div>
                                </div>
                              </div>

                              {index % Math.max(1, Math.floor(detailedData.length / 12)) === 0 && (
                                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-xs text-slate-500 font-mono -rotate-45 origin-top whitespace-nowrap">
                                  {p.point.time}
                                </div>
                              )}
                            </div>
                          ))}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Таблица детальных данных */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-lg font-display text-blue-600 mb-4">
                  ДАННЫЕ ПО 30-МИНУТНЫМ ИНТЕРВАЛАМ
                </h3>
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Время</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Производство, т</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Скорость, т/ч</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Записей</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailedData.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 text-sm font-mono text-slate-800">
                            {item.time}
                          </td>
                          <td className="py-3 px-4 text-sm font-mono font-bold text-blue-600 text-right">
                            {item.totalProduction?.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-sm font-mono text-slate-800 text-right">
                            {item.averageSpeed?.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-sm font-mono text-slate-600 text-right">
                            {item.recordCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Технические данные */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-display font-bold text-slate-700">
                    ТЕХНИЧЕСКИЕ ПАРАМЕТРЫ ОБОРУДОВАНИЯ
                  </h2>
                  <button
                    onClick={() => setShowCustomTechGraph(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all"
                  >
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="text-sm font-bold text-blue-700">Создать график</span>
                  </button>
                </div>
                <div className="space-y-6">
                  {techCollections.map((collection) =>
                    renderTechnicalChart(collection.name, collection.title)
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Модальное окно для создания кастомного графика технических параметров */}
      {showCustomTechGraph && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-display font-bold text-blue-600">СОЗДАТЬ КАСТОМНЫЙ ГРАФИК</h2>
                <button
                  onClick={() => {
                    setShowCustomTechGraph(false);
                    setCustomTechGraphData([]);
                    setCustomTechMetrics([]);
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
              {/* Информация о выбранной дате */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm font-semibold text-blue-800">
                  Дата: {selectedDate ? new Date(selectedDate).toLocaleDateString('ru-RU') : 'Не выбрана'}
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  График будет построен для данных этой даты
                </div>
              </div>

              {/* Выбор параметров */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-slate-800">
                    Выберите параметры ({customTechMetrics.length})
                  </label>
                  <button
                    onClick={() => setCustomTechMetrics([])}
                    className="text-xs px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all"
                  >
                    Очистить
                  </button>
                </div>

                <div className="space-y-4 bg-slate-50 rounded-lg p-4 border border-slate-200 max-h-96 overflow-y-auto">
                  {techCollections.map(collection => {
                    const metrics = techMetrics[collection.name] || [];
                    if (metrics.length === 0) return null;

                    return (
                      <div key={collection.name}>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">
                          {collection.title}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {metrics.map((metric: any) => {
                            const isSelected = customTechMetrics.some(
                              m => m.collection === collection.name && m.metric === metric.title
                            );
                            return (
                              <label
                                key={metric.title}
                                className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                  isSelected
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-slate-200 bg-white hover:border-blue-300'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleCustomTechMetric(collection.name, metric.title)}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm font-semibold text-slate-800">{metric.title}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Кнопка построения графика */}
              <button
                onClick={buildCustomTechGraph}
                disabled={loading || customTechMetrics.length === 0}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-display text-lg rounded-lg transition-all shadow-lg"
              >
                {loading ? 'Загрузка данных...' : 'Построить график'}
              </button>

              {/* Отображение кастомного графика */}
              {customTechGraphData.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-display font-bold text-blue-600 mb-4">
                    КОМБИНИРОВАННЫЙ ГРАФИК
                  </h3>

                  {(() => {
                    // Подготовка данных для графика
                    const colors = [
                      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
                      '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6'
                    ];

                    // Находим все уникальные временные точки
                    const allTimes = new Set<string>();
                    customTechGraphData.forEach(({ data }) => {
                      data.forEach((d: any) => allTimes.add(d.time));
                    });
                    const sortedTimes = Array.from(allTimes).sort();

                    // Находим min и max для масштабирования
                    const allValues = customTechGraphData.flatMap(({ data }) =>
                      data.map((d: any) => d.value)
                    );
                    const minValue = Math.min(...allValues);
                    const maxValue = Math.max(...allValues);
                    const valueRange = maxValue - minValue || 1;

                    return (
                      <div className="bg-slate-50 rounded-lg p-8 border border-slate-200">
                        <div className="relative h-96 overflow-visible">
                          {/* SVG для всех линий */}
                          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                            {customTechGraphData.map((line, lineIndex) => {
                              const points = line.data.map((point: any) => {
                                const timeIndex = sortedTimes.indexOf(point.time);
                                const x = (timeIndex / (sortedTimes.length - 1 || 1)) * 100;
                                const y = 100 - ((point.value - minValue) / valueRange) * 100;
                                return { x, y, point };
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
                          {customTechGraphData.map((line, lineIndex) => {
                            return line.data.map((point: any, pointIndex: number) => {
                              const timeIndex = sortedTimes.indexOf(point.time);
                              const x = (timeIndex / (sortedTimes.length - 1 || 1)) * 100;
                              const y = 100 - ((point.value - minValue) / valueRange) * 100;
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
                                      <div className="text-xs text-slate-600 mb-1">{line.metric}</div>
                                      <div className="text-xs text-slate-500 mb-1 font-mono">
                                        {point.time}
                                      </div>
                                      <div className="text-base font-bold" style={{ color: pointColor }}>
                                        {point.value.toFixed(2)}
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
                          {customTechGraphData.map((line, index) => {
                            const collectionTitle = techCollections.find(c => c.name === line.collection)?.title || line.collection;
                            return (
                              <div key={index} className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded"
                                  style={{ backgroundColor: colors[index % colors.length] }}
                                ></div>
                                <span className="text-xs text-slate-700">{collectionTitle}: {line.metric}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {customTechGraphData.length === 0 && customTechMetrics.length > 0 && !loading && (
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

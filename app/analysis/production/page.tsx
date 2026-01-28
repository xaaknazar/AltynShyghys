'use client';

import { useState, useEffect } from 'react';
import TechnicalChart from './TechnicalChart';

type QuickPeriod = 'week' | 'month' | 'season' | 'all';
type ViewMode = 'daily' | 'detailed' | 'monthly';

export default function ProductionAnalysisPage() {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [shiftFilter, setShiftFilter] = useState<'all' | 'day' | 'night'>('all');
  const [productionData, setProductionData] = useState<any[]>([]);
  const [detailedData, setDetailedData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [quickPeriod, setQuickPeriod] = useState<QuickPeriod>('week');
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [techData, setTechData] = useState<{[key: string]: any}>({});
  const [techMetrics, setTechMetrics] = useState<{[key: string]: any[]}>({});
  const [selectedMetrics, setSelectedMetrics] = useState<{[collectionName: string]: string[]}>({});
  const [showShiftsOnChart, setShowShiftsOnChart] = useState(false);

  // Фильтры для режима "По месяцам"
  const [startMonth, setStartMonth] = useState<string>('');
  const [startYear, setStartYear] = useState<string>('');
  const [endMonth, setEndMonth] = useState<string>('');
  const [endYear, setEndYear] = useState<string>('');

  // Кастомный график для технических параметров
  const [showCustomTechGraph, setShowCustomTechGraph] = useState(false);
  const [customTechMetrics, setCustomTechMetrics] = useState<{collection: string; metric: string}[]>([]);
  const [customTechGraphData, setCustomTechGraphData] = useState<any[]>([]);
  const [customGraphFullscreen, setCustomGraphFullscreen] = useState(false);
  const [customGraphScale, setCustomGraphScale] = useState(1);

  const DAILY_TARGET = 1200; // Целевое производство в сутки (тонн)
  const SHIFT_TARGET = 600; // Целевое производство за смену (тонн)

  const techCollections = [
    { name: 'combined_extractor', title: 'Экстрактор', group: 'combined_extractor', collections: ['Extractor_TechData_Job', 'Data_extractor_cooking'] },
    { name: 'Press_1_Job', title: 'Пресс 1', group: null, collections: ['Press_1_Job'] },
    { name: 'Press_2_Job', title: 'Пресс 2', group: null, collections: ['Press_2_Job'] },
    { name: 'Data_extractor_cooking', title: 'Жаровня', group: 'jarovnia', collections: ['Data_extractor_cooking'] },
    { name: 'Data_extractor_cooking', title: 'Тостер', group: 'toster', collections: ['Data_extractor_cooking'] },
  ];

  // Нормы для метрик (одно значение или диапазон [min, max])
  const metricNorms: {[key: string]: number | [number, number]} = {
    'Вакуум': -900,
    'Температура масла': [105, 110],
    'Мезга Жаровня 2': 105,
    'Жаровня 1': 105,
    // Data_Extractor_Cooking метрики (реальные названия из базы)
    'Верх.Темп. Мезги Жаровни 1': [100, 110],
    'Нижн.Темп. Мезги Жаровня 1': [80, 90],
    'Верх.Темп. Мезги Жаровни 2': [100, 120],
    'Нижн.Темп. Мезги Жаровня 2': [80, 90],
    ' Температура Тостера': [100, 110],
    'Коэффициент Экстрактора': [100, 120],
    'Подача в Экстрактор': [40, 60],
    'Процентаж Экстрактора': [45, 55],
    'Подача Чистого Гексана': [0, 100],
  };

  useEffect(() => {
    // Установка дат по умолчанию: последняя неделя
    setQuickPeriod('week');
    applyQuickPeriod('week');

    // Установка месяца и года по умолчанию для режима "По месяцам"
    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentYear = String(now.getFullYear());

    // По умолчанию: с января 2024 по текущий месяц
    setStartMonth('01');
    setStartYear('2024');
    setEndMonth(currentMonth);
    setEndYear(currentYear);
  }, []);

  const applyQuickPeriod = (period: QuickPeriod) => {
    const end = new Date();
    const start = new Date();

    if (period === 'week') {
      start.setDate(start.getDate() - 7);
    } else if (period === 'month') {
      start.setDate(1); // Начало текущего месяца
    } else if (period === 'season') {
      start.setMonth(8, 1); // Начало сезона (1 сентября текущего года)
    } else if (period === 'all') {
      start.setFullYear(2025, 8, 1); // 1 сентября 2025
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    setQuickPeriod(period);
  };

  useEffect(() => {
    if (viewMode === 'monthly' && startMonth && startYear && endMonth && endYear) {
      fetchMonthlyData();
    } else if (startDate && endDate && viewMode === 'daily') {
      fetchProductionData();
    }
  }, [startDate, endDate, shiftFilter, viewMode, startMonth, startYear, endMonth, endYear]);

  useEffect(() => {
    if (viewMode === 'detailed' && startDate && endDate) {
      fetchDetailedData(startDate);
      fetchTechnicalData(startDate, endDate);
    }
  }, [startDate, endDate, viewMode]);

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
      }
    } catch (error) {
      console.error('Error fetching production data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        start_month: startMonth,
        start_year: startYear,
        end_month: endMonth,
        end_year: endYear,
      });

      const response = await fetch(`/api/production/monthly-range?${params}`, { cache: 'no-store' });
      const data = await response.json();

      if (data.success) {
        setMonthlyData(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching monthly data:', error);
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

  const fetchTechnicalData = async (startDate: string, endDate: string) => {
    try {
      // Генерируем все даты в диапазоне
      const dates: string[] = [];
      const start = new Date(startDate);
      const end = new Date(endDate);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split('T')[0]);
      }

      console.log(`📅 Loading technical data for ${dates.length} days: ${dates[0]} to ${dates[dates.length - 1]}`);

      // Получаем уникальные названия коллекций
      const allCollectionNames = techCollections.flatMap(c => c.collections || [c.name]);
      const uniqueCollectionNames = [...new Set(allCollectionNames)];

      // Загружаем данные для каждой коллекции за весь период
      const promises = uniqueCollectionNames.map(async (collectionName) => {
        // Загружаем данные для каждого дня
        const dailyPromises = dates.map(async (date) => {
          const params = new URLSearchParams({
            date: date,
            collection: collectionName,
          });

          const response = await fetch(`/api/technical-data/detailed?${params}`, { cache: 'no-store' });
          const data = await response.json();

          if (data.success && data.data) {
            return data.data;
          }
          return [];
        });

        const dailyResults = await Promise.all(dailyPromises);
        // Объединяем данные за все дни
        const allData = dailyResults.flat();

        // Получаем метрики из первого успешного запроса
        const metricsPromise = fetch(`/api/technical-data/detailed?${new URLSearchParams({
          date: dates[0],
          collection: collectionName,
        })}`, { cache: 'no-store' });

        const metricsData = await metricsPromise.then(r => r.json());
        const metrics = metricsData.success ? metricsData.metrics || [] : [];

        return { name: collectionName, data: allData, metrics };
      });

      const results = await Promise.all(promises);

      const newTechData: {[key: string]: any} = {};
      const newTechMetrics: {[key: string]: any[]} = {};

      results.forEach((result) => {
        newTechData[result.name] = result.data;
        newTechMetrics[result.name] = result.metrics;
      });

      console.log(`✅ Loaded technical data: ${Object.values(newTechData).flat().length} total points`);

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

  // Функция экспорта данных в CSV (Excel)
  const exportToExcel = (data: any[], filename: string, columns: {key: string, label: string}[]) => {
    // Создаем CSV строку
    const headers = columns.map(col => col.label).join(',');
    const rows = data.map(row =>
      columns.map(col => {
        const value = row[col.key];
        // Экранируем значения с запятыми
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(',')
    );

    const csv = [headers, ...rows].join('\n');

    // Создаем Blob и скачиваем
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
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
    if (customTechMetrics.length === 0 || !startDate || !endDate) {
      alert('Выберите хотя бы один параметр и период');
      return;
    }

    setLoading(true);
    try {
      // Загружаем данные для выбранных метрик
      const allData: any[] = [];

      // Генерируем все даты в диапазоне
      const dates: string[] = [];
      const start = new Date(startDate);
      const end = new Date(endDate);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split('T')[0]);
      }

      console.log(`📅 Loading custom tech graph for ${dates.length} days: ${dates[0]} to ${dates[dates.length - 1]}`);

      for (const { collection, metric } of customTechMetrics) {
        // Загружаем данные для каждого дня
        const dailyPromises = dates.map(async (date) => {
          const params = new URLSearchParams({
            date: date,
            collection: collection,
          });

          const response = await fetch(`/api/technical-data/detailed?${params}`, { cache: 'no-store' });
          const data = await response.json();

          if (data.success && data.data) {
            return data.data;
          }
          return [];
        });

        const dailyResults = await Promise.all(dailyPromises);
        // Объединяем данные за все дни
        const combinedData = dailyResults.flat();

        if (combinedData.length > 0) {
          // Извлекаем данные для этой метрики из агрегированных данных
          const metricData = combinedData
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

  // Определяем какие метрики относятся к каждой группе
  const getMetricsForGroup = (group: string | null, allMetrics: any[]) => {
    if (group === null) {
      // Если нет группы, возвращаем все метрики
      return allMetrics;
    }

    if (group === 'combined_extractor') {
      // Экстрактор (объединенный): Вакуум, Температура масла, Коэффициент, Подача, Процентаж, Гексан
      return allMetrics.filter((m: any) =>
        m.title.includes('Вакуум') ||
        m.title.includes('Температура масла') ||
        m.title.includes('Коэффициент Экстрактора') ||
        m.title.includes('Подача в Экстрактор') ||
        m.title.includes('Процентаж Экстрактора') ||
        m.title.includes('Подача Чистого Гексана')
      );
    } else if (group === 'jarovnia') {
      // Жаровня: все температуры жаровни
      return allMetrics.filter((m: any) =>
        m.title.includes('Жаровни 1') ||
        m.title.includes('Жаровни 2')
      );
    } else if (group === 'toster') {
      // Тостер: температура тостера
      return allMetrics.filter((m: any) =>
        m.title.includes('Тостера')
      );
    }

    return allMetrics;
  };

  const renderTechnicalChart = (collections: string[], title: string, group: string | null, uniqueKey: string) => {
    // Объединяем данные и метрики из всех коллекций
    const allData = collections.flatMap(coll => techData[coll] || []);
    const allMetrics = collections.flatMap(coll => techMetrics[coll] || []);

    // Фильтруем метрики по группе
    const metrics = getMetricsForGroup(group, allMetrics);

    // Генерируем уникальный ключ для selectedMetrics
    const selectionKey = uniqueKey;

    const selected = selectedMetrics[selectionKey] || [];
    const selectedMetricsData = metrics.filter((m: any) => selected.includes(m.title));

    // Подробная отладка
    console.log(`========== [${title}] ==========`);
    console.log('Collections:', collections);
    console.log('techData keys:', Object.keys(techData));
    console.log('allData.length:', allData.length);
    if (allData.length > 0) {
      console.log('Sample allData item:', allData[0]);
    }
    console.log('allMetrics:', allMetrics);
    console.log('metrics after filter:', metrics);
    console.log('selected:', selected);
    console.log('selectedMetricsData:', selectedMetricsData);
    console.log('========== END ==========');

    return (
      <div key={uniqueKey} className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-2xl font-bold text-slate-900 mb-4">{title}</h3>

        {/* Проверка наличия данных */}
        {metrics.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-slate-500 mb-2">Нет данных для этой коллекции</div>
            <div className="text-xs text-slate-400">Коллекции: {collections.join(', ')}</div>
          </div>
        ) : (
          <>
            {/* Чекбоксы для выбора метрик */}
            <div className="mb-6 flex flex-wrap gap-3">
              {metrics.map((metric: any, metricIndex: number) => {
            const isSelected = selected.includes(metric.title);
            const color = getMetricColor(metricIndex);

            return (
              <label
                key={metric.title}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-slate-100 border-slate-400'
                    : 'bg-white border-slate-300 hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleMetricSelection(selectionKey, metric.title)}
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
            {/* Легенда и кнопка экспорта */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-wrap gap-4">
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
              {allData.length > 0 && metrics.length > 0 && (
                <button
                  onClick={() => {
                    // Экспортируем ВСЕ метрики, а не только выбранные
                    const exportData = allData.map(d => {
                      const row: any = {
                        time: new Date(d.time).toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      };

                      // Добавляем все метрики
                      metrics.forEach((metric: any) => {
                        const value = d[metric.title];
                        row[metric.title] = value !== undefined && value !== null ? value : '';
                      });

                      return row;
                    });

                    const columns = [
                      {key: 'time', label: 'Время'},
                      ...metrics.map((m: any) => ({key: m.title, label: `${m.title} (${m.unit})`}))
                    ];

                    exportToExcel(exportData, `tech_${title}_${selectedDate}`, columns);
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-semibold">Экспорт</span>
                </button>
              )}
            </div>

            <div className="relative bg-slate-50 rounded-lg p-6 border border-slate-200 overflow-x-auto">
              {(() => {
                // Вычисляем минимальную ширину графика в зависимости от количества точек
                const minWidth = Math.max(800, allData.length * 15); // минимум 15px на точку

                return (
                  <div className="relative h-96 pt-16 pb-16 px-20" style={{ minWidth: `${minWidth}px` }}>
                    {(() => {
                      // Подготовка данных для всех метрик
                      const metricsWithData = selectedMetricsData.map((metric: any) => {
                    const metricIndex = metrics.findIndex((m: any) => m.title === metric.title);
                    const metricData = allData.filter((d: any) => d[metric.title] !== undefined);

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
                      // Добавляем margin 3% слева и справа для видимости крайних точек
                      const xMargin = 3;
                      const xRange = 100 - (2 * xMargin);
                      const x = xMargin + (index / (metricData.length - 1 || 1)) * xRange;
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

                    return {
                      metric,
                      metricIndex,
                      metricData,
                      points,
                      linePath,
                      color,
                      normValue,
                      normY,
                      normMinY,
                      normMaxY,
                      isRange
                    };
                  }).filter(Boolean);

                  if (metricsWithData.length === 0) {
                    return (
                      <div className="text-center py-8 text-slate-500">
                        Нет данных для выбранных метрик за указанный период
                      </div>
                    );
                  }

                  return (
                    <>
                      {/* ОДИН SVG для всех линий */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                        {/* Сетка */}
                        <defs>
                          <pattern id={`grid-tech-${uniqueKey}`} width="10" height="10" patternUnits="userSpaceOnUse">
                            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e2e8f0" strokeWidth="0.3" />
                          </pattern>
                        </defs>
                        <rect width="100" height="100" fill={`url(#grid-tech-${uniqueKey})`} />

                        {/* Все линии метрик */}
                        {metricsWithData.map((data: any) => (
                          <g key={data.metric.title}>
                            <path
                              d={data.linePath}
                              fill="none"
                              stroke={data.color}
                              strokeWidth="2.5"
                              vectorEffect="non-scaling-stroke"
                            />
                            {/* Линия нормы (одно значение) */}
                            {data.normY !== null && (
                              <line
                                x1="3"
                                y1={data.normY}
                                x2="97"
                                y2={data.normY}
                                stroke="#ef4444"
                                strokeWidth="2"
                                strokeDasharray="4,4"
                                vectorEffect="non-scaling-stroke"
                                opacity="0.7"
                              />
                            )}
                            {/* Линии норм (диапазон) */}
                            {data.isRange && data.normMinY !== null && data.normMaxY !== null && (
                              <>
                                <line
                                  x1="3"
                                  y1={data.normMinY}
                                  x2="97"
                                  y2={data.normMinY}
                                  stroke="#10b981"
                                  strokeWidth="2"
                                  strokeDasharray="4,4"
                                  vectorEffect="non-scaling-stroke"
                                  opacity="0.7"
                                />
                                <line
                                  x1="3"
                                  y1={data.normMaxY}
                                  x2="97"
                                  y2={data.normMaxY}
                                  stroke="#10b981"
                                  strokeWidth="2"
                                  strokeDasharray="4,4"
                                  vectorEffect="non-scaling-stroke"
                                  opacity="0.7"
                                />
                                {/* Заливка между линиями норм */}
                                <rect
                                  x="3"
                                  y={data.normMaxY}
                                  width="94"
                                  height={data.normMinY - data.normMaxY}
                                  fill="#10b981"
                                  opacity="0.1"
                                />
                              </>
                            )}
                          </g>
                        ))}
                      </svg>

                      {/* Метки норм как div */}
                      {metricsWithData.map((data: any) => (
                        <div key={`norms-${data.metric.title}`}>
                          {/* Метка нормы (одно значение) */}
                          {data.normY !== null && (
                            <div
                              className="absolute left-1 pointer-events-none"
                              style={{
                                top: `${data.normY}%`,
                                transform: 'translateY(-50%)'
                              }}
                            >
                              <div className="bg-red-500 text-white text-xs px-2 py-0.5 rounded font-mono font-semibold shadow-md">
                                Норма: {data.normValue as number}
                              </div>
                            </div>
                          )}
                          {/* Метки норм (диапазон) */}
                          {data.isRange && data.normMinY !== null && data.normMaxY !== null && (
                            <>
                              <div
                                className="absolute left-1 pointer-events-none"
                                style={{
                                  top: `${data.normMinY}%`,
                                  transform: 'translateY(-50%)'
                                }}
                              >
                                <div className="bg-emerald-600 text-white text-xs px-2 py-0.5 rounded font-mono font-semibold shadow-md">
                                  Мин: {(data.normValue as [number, number])[0]}
                                </div>
                              </div>
                              <div
                                className="absolute left-1 pointer-events-none"
                                style={{
                                  top: `${data.normMaxY}%`,
                                  transform: 'translateY(-50%)'
                                }}
                              >
                                <div className="bg-emerald-600 text-white text-xs px-2 py-0.5 rounded font-mono font-semibold shadow-md">
                                  Макс: {(data.normValue as [number, number])[1]}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ))}

                      {/* Точки как div */}
                      {metricsWithData.map((data: any) =>
                        data.points.map((p: any, index: number) => {
                          // Для крайних точек (первых 20% и последних 20%) показываем tooltip с противоположной стороны
                          const tooltipRight = p.x < 20 ? false : p.x > 80 ? true : p.x > 50;
                          return (
                            <div
                              key={`${data.metric.title}-${index}`}
                              className="absolute group"
                              style={{
                                left: `${p.x}%`,
                                bottom: `${100 - p.y}%`,
                                transform: 'translate(-50%, 50%)'
                              }}
                            >
                              <div
                                className="w-4 h-4 rounded-full cursor-pointer transition-all duration-200 hover:scale-150 border-2 border-white shadow-lg z-10"
                                style={{ backgroundColor: data.color }}
                              ></div>

                              {/* Постоянное отображение значения - только для каждой N-ой точки при большом количестве данных */}
                              {index % Math.max(1, Math.floor(data.metricData.length / 20)) === 0 && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none">
                                  <div
                                    className="text-white text-xs font-bold px-2 py-1 rounded shadow-md whitespace-nowrap"
                                    style={{ backgroundColor: data.color }}
                                  >
                                    {p.value?.toFixed(1)}
                                  </div>
                                </div>
                              )}

                              {/* Детальный tooltip при наведении */}
                              <div
                                className={`absolute ${tooltipRight ? 'right-full mr-3' : 'left-full ml-3'} top-1/2 -translate-y-1/2 hidden group-hover:block z-30`}
                              >
                                <div className="bg-white border-2 rounded-xl p-4 shadow-2xl whitespace-nowrap min-w-[220px]" style={{ borderColor: data.color }}>
                                  <div className="text-sm text-slate-600 mb-3 font-semibold border-b border-slate-200 pb-2">
                                    {(() => {
                                      // Форматируем время для tooltip: "дд.мм.гггг HH:MM"
                                      const timeStr = p.point.time;
                                      if (timeStr.includes(' ')) {
                                        const [datePart, timePart] = timeStr.split(' ');
                                        const [year, month, day] = datePart.split('-');
                                        return `${day}.${month}.${year} ${timePart}`;
                                      }
                                      return timeStr;
                                    })()}
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs text-slate-600">{data.metric.title}:</span>
                                      <span className="text-lg font-bold" style={{ color: data.color }}>{p.value?.toFixed(2)} {data.metric.unit}</span>
                                    </div>
                                    {data.normValue !== undefined && (
                                      <div className="pt-2 border-t border-slate-200">
                                        <div className="text-xs text-slate-600">
                                          Норма: {Array.isArray(data.normValue) ? `${data.normValue[0]} - ${data.normValue[1]}` : data.normValue} {data.metric.unit}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {/* Стрелка указатель */}
                                <div
                                  className={`absolute top-1/2 -translate-y-1/2 w-0 h-0 border-solid ${
                                    tooltipRight
                                      ? 'left-full border-l-[8px] border-y-transparent border-y-[8px] border-r-0'
                                      : 'right-full border-r-[8px] border-y-transparent border-y-[8px] border-l-0'
                                  }`}
                                  style={{
                                    borderLeftColor: tooltipRight ? data.color : 'transparent',
                                    borderRightColor: tooltipRight ? 'transparent' : data.color,
                                  }}
                                ></div>
                              </div>

                              {index % Math.max(1, Math.floor(data.metricData.length / 12)) === 0 && (
                                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-xs text-slate-500 font-mono -rotate-45 origin-top whitespace-nowrap">
                                  {(() => {
                                    // Форматируем время: "дд.мм HH:MM"
                                    const timeStr = p.point.time;
                                    if (timeStr.includes(' ')) {
                                      const [datePart, timePart] = timeStr.split(' ');
                                      const [year, month, day] = datePart.split('-');
                                      return `${day}.${month} ${timePart}`;
                                    }
                                    return timeStr;
                                  })()}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </>
                  );
                })()}
              </div>
            );
          })()}
            </div>
          </div>
        )}

        {selectedMetricsData.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            Выберите метрики для отображения графика
          </div>
        )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-8">
      {/* Фильтры */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-6">
        <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-600 mb-3 sm:mb-4">ФИЛЬТРЫ</h3>

        {/* Переключатель режима просмотра */}
        <div className="flex flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-6">
          <button
            onClick={() => setViewMode('daily')}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg border transition-all text-sm sm:text-base ${
              viewMode === 'daily'
                ? 'bg-slate-100 border-slate-400 text-slate-900 font-semibold'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            По суткам
          </button>
          <button
            onClick={() => setViewMode('monthly')}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg border transition-all text-sm sm:text-base ${
              viewMode === 'monthly'
                ? 'bg-slate-100 border-slate-400 text-slate-900 font-semibold'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            По месяцам
          </button>
          <button
            onClick={() => setViewMode('detailed')}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg border transition-all text-sm sm:text-base ${
              viewMode === 'detailed'
                ? 'bg-slate-100 border-slate-400 text-slate-900 font-semibold'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
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
                className={`px-4 py-2 rounded-lg border transition-all ${
                  quickPeriod === 'week'
                    ? 'bg-slate-100 border-slate-400 text-slate-900 font-semibold'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                За неделю
              </button>
              <button
                onClick={() => applyQuickPeriod('month')}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  quickPeriod === 'month'
                    ? 'bg-slate-100 border-slate-400 text-slate-900 font-semibold'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                С начала месяца
              </button>
              <button
                onClick={() => applyQuickPeriod('season')}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  quickPeriod === 'season'
                    ? 'bg-slate-100 border-slate-400 text-slate-900 font-semibold'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                С начала сезона
              </button>
              <button
                onClick={() => applyQuickPeriod('all')}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  quickPeriod === 'all'
                    ? 'bg-slate-100 border-slate-400 text-slate-900 font-semibold'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                За весь период
              </button>
            </div>
          </>
        )}

        {viewMode === 'daily' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-slate-600 mb-2">Начало периода</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setQuickPeriod('custom');
                }}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-slate-600 mb-2">Конец периода</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setQuickPeriod('custom');
                }}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-slate-600 mb-2">Смена</label>
              <select
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value as 'all' | 'day' | 'night')}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono text-sm focus:border-slate-500 focus:outline-none"
              >
                <option value="all">Все смены</option>
                <option value="day">Дневная</option>
                <option value="night">Ночная</option>
              </select>
            </div>
          </div>
        ) : viewMode === 'monthly' ? (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-sm text-slate-700 font-medium">
                Выберите период для анализа производства по месяцам
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Начальный месяц */}
              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-wider font-semibold text-slate-600">Начальный период</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Месяц</label>
                    <select
                      value={startMonth}
                      onChange={(e) => setStartMonth(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-semibold text-sm focus:border-slate-500 focus:outline-none transition-all"
                    >
                      <option value="01">Январь</option>
                      <option value="02">Февраль</option>
                      <option value="03">Март</option>
                      <option value="04">Апрель</option>
                      <option value="05">Май</option>
                      <option value="06">Июнь</option>
                      <option value="07">Июль</option>
                      <option value="08">Август</option>
                      <option value="09">Сентябрь</option>
                      <option value="10">Октябрь</option>
                      <option value="11">Ноябрь</option>
                      <option value="12">Декабрь</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Год</label>
                    <select
                      value={startYear}
                      onChange={(e) => setStartYear(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-semibold text-sm focus:border-slate-500 focus:outline-none transition-all"
                    >
                      {Array.from({ length: 10 }, (_, i) => 2024 + i).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Конечный месяц */}
              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-wider font-semibold text-slate-600">Конечный период</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Месяц</label>
                    <select
                      value={endMonth}
                      onChange={(e) => setEndMonth(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-semibold text-sm focus:border-slate-500 focus:outline-none transition-all"
                    >
                      <option value="01">Январь</option>
                      <option value="02">Февраль</option>
                      <option value="03">Март</option>
                      <option value="04">Апрель</option>
                      <option value="05">Май</option>
                      <option value="06">Июнь</option>
                      <option value="07">Июль</option>
                      <option value="08">Август</option>
                      <option value="09">Сентябрь</option>
                      <option value="10">Октябрь</option>
                      <option value="11">Ноябрь</option>
                      <option value="12">Декабрь</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Год</label>
                    <select
                      value={endYear}
                      onChange={(e) => setEndYear(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-semibold text-sm focus:border-slate-500 focus:outline-none transition-all"
                    >
                      {Array.from({ length: 10 }, (_, i) => 2024 + i).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-slate-600 mb-2">Начало периода</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setQuickPeriod('custom');
                }}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-slate-600 mb-2">Конец периода</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setQuickPeriod('custom');
                }}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="text-2xl text-slate-900 font-bold">Загрузка данных...</div>
        </div>
      ) : viewMode === 'daily' && productionData.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <div className="text-slate-900 text-lg font-bold mb-2">Нет данных за выбранный период</div>
          <div className="text-slate-600 text-sm">Измените фильтры или добавьте новые данные</div>
        </div>
      ) : viewMode === 'detailed' && detailedData.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <div className="text-slate-900 text-lg font-bold mb-2">Нет детальных данных за выбранный период</div>
          <div className="text-slate-600 text-sm">Измените период или добавьте новые данные</div>
        </div>
      ) : (
        <div className="space-y-8">
          {viewMode === 'monthly' ? (
            <>
              {/* Месячная статистика */}
              {(() => {
                const totalMonthlyProduction = monthlyData.reduce((sum, item) => sum + (item.total || 0), 0);
                const averageMonthly = monthlyData.length > 0 ? totalMonthlyProduction / monthlyData.length : 0;
                const monthlyTarget = 36000; // 1200 т/день * 30 дней

                return (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white rounded-lg border border-slate-200 p-6 text-center">
                        <div className="text-xs uppercase tracking-wider font-semibold text-slate-600 mb-2">Общее производство</div>
                        <div className="text-4xl font-bold text-slate-900">
                          {totalMonthlyProduction.toFixed(1)}
                          <span className="text-xl ml-2 text-slate-500">т</span>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg border border-slate-200 p-6 text-center">
                        <div className="text-xs uppercase tracking-wider font-semibold text-slate-600 mb-2">Среднее за месяц</div>
                        <div className="text-4xl font-bold text-slate-900">
                          {averageMonthly.toFixed(1)}
                          <span className="text-xl ml-2 text-slate-500">т</span>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg border border-slate-200 p-6 text-center">
                        <div className="text-xs uppercase tracking-wider font-semibold text-slate-600 mb-2">Месяцев в выборке</div>
                        <div className="text-4xl font-bold text-slate-900">
                          {monthlyData.length}
                          <span className="text-xl ml-2 text-slate-500">мес</span>
                        </div>
                      </div>
                    </div>

                    {/* График месячных данных */}
                    <div className="bg-white rounded-lg border border-slate-200 p-8">
                      <div className="mb-8 pb-4 border-b border-slate-200 flex items-center justify-between">
                        <div>
                          <h3 className="text-2xl font-bold text-slate-900 mb-2">
                            Динамика производства по месяцам
                          </h3>
                          <p className="text-sm text-slate-600">Общее производство за каждый месяц</p>
                        </div>
                        <button
                          onClick={() => exportToExcel(
                            monthlyData,
                            `monthly_${startMonth}-${startYear}_${endMonth}-${endYear}`,
                            [
                              {key: 'month', label: 'Месяц'},
                              {key: 'total', label: 'Производство (т)'},
                            ]
                          )}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-sm font-semibold">Экспорт</span>
                        </button>
                      </div>

                      <div className="relative bg-slate-50 rounded-lg p-8 border border-slate-200">
                        <div className="relative h-96 pt-8 pb-12 px-16">
                          {(() => {
                            if (monthlyData.length === 0) return null;

                            const maxValue = Math.max(...monthlyData.map(d => d.total)) * 1.15;
                            const minValue = 0;
                            const valueRange = maxValue - minValue;

                            return (
                              <>
                                {/* SVG для линии графика */}
                                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                                  {/* Сетка */}
                                  <defs>
                                    <pattern id="grid-monthly" width="10" height="10" patternUnits="userSpaceOnUse">
                                      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e2e8f0" strokeWidth="0.3" />
                                    </pattern>
                                  </defs>
                                  <rect width="100" height="100" fill="url(#grid-monthly)" />

                                  {(() => {
                                    const points = monthlyData.map((point, index) => {
                                      const x = (index / (monthlyData.length - 1 || 1)) * 100;
                                      const y = 100 - ((point.total - minValue) / valueRange) * 100;
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
                                        stroke="#3b82f6"
                                        strokeWidth="2.5"
                                        vectorEffect="non-scaling-stroke"
                                      />
                                    );
                                  })()}
                                </svg>

                                {/* Точки */}
                                {monthlyData.map((point, index) => {
                                  const x = (index / (monthlyData.length - 1 || 1)) * 100;
                                  const y = 100 - ((point.total - minValue) / valueRange) * 100;

                                  // Определяем позицию tooltip (слева или справа)
                                  const tooltipRight = x > 50;

                                  return (
                                    <div
                                      key={index}
                                      className="absolute group"
                                      style={{
                                        left: `${x}%`,
                                        bottom: `${100 - y}%`,
                                        transform: 'translate(-50%, 50%)'
                                      }}
                                    >
                                      <div className="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-lg cursor-pointer transition-all duration-200 hover:scale-150 z-10"></div>

                                      {/* Постоянное отображение значения */}
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none">
                                        <div className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded shadow-md whitespace-nowrap">
                                          {point.total?.toFixed(0)}
                                        </div>
                                      </div>

                                      {/* Детальный tooltip при наведении */}
                                      <div
                                        className={`absolute ${tooltipRight ? 'right-full mr-3' : 'left-full ml-3'} top-1/2 -translate-y-1/2 hidden group-hover:block z-30`}
                                      >
                                        <div className="bg-white border border-slate-300 rounded-lg p-4 shadow-2xl whitespace-nowrap min-w-[240px]">
                                          <div className="text-sm text-slate-600 mb-3 font-semibold border-b border-slate-200 pb-2">
                                            {point.month}
                                          </div>
                                          <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                              <span className="text-xs text-slate-600">Общее производство:</span>
                                              <span className="text-lg font-bold text-blue-600">{point.total?.toFixed(1)} т</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                              <span className="text-xs text-slate-600">Среднее в день:</span>
                                              <span className="text-sm font-semibold text-slate-700">{point.averageDaily?.toFixed(1)} т</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                              <span className="text-xs text-slate-600">Дней с данными:</span>
                                              <span className="text-sm font-semibold text-slate-700">{point.daysCount}</span>
                                            </div>
                                          </div>
                                        </div>
                                        {/* Стрелка указатель */}
                                        <div
                                          className={`absolute top-1/2 -translate-y-1/2 w-0 h-0 border-solid ${
                                            tooltipRight
                                              ? 'left-full border-l-[8px] border-l-slate-300 border-y-transparent border-y-[8px] border-r-0'
                                              : 'right-full border-r-[8px] border-r-slate-300 border-y-transparent border-y-[8px] border-l-0'
                                          }`}
                                        ></div>
                                      </div>

                                      {/* Подписи месяцев снизу */}
                                      {(index % Math.max(1, Math.floor(monthlyData.length / 12)) === 0 || monthlyData.length <= 12) && (
                                        <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 text-xs text-slate-600 font-semibold -rotate-45 origin-top whitespace-nowrap">
                                          {point.month}
                                        </div>
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

                    {/* Таблица месячных данных */}
                    <div className="bg-white rounded-lg border border-slate-200 p-8">
                      <div className="mb-6 pb-4 border-b border-slate-200">
                        <h3 className="text-2xl font-bold text-slate-900">
                          Детальные данные по месяцам
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                              <th className="text-left py-4 px-4 text-xs font-semibold text-slate-600">Месяц</th>
                              <th className="text-right py-4 px-4 text-xs font-semibold text-slate-600">Производство, т</th>
                              <th className="text-right py-4 px-4 text-xs font-semibold text-slate-600">Среднее в день, т</th>
                              <th className="text-right py-4 px-4 text-xs font-semibold text-slate-600">Дней</th>
                            </tr>
                          </thead>
                          <tbody>
                            {monthlyData.map((item, idx) => (
                              <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                <td className="py-4 px-4 text-sm font-semibold text-slate-800">
                                  {item.month}
                                </td>
                                <td className="py-4 px-4 text-base font-mono font-bold text-slate-900 text-right">
                                  {item.total?.toFixed(1)}
                                </td>
                                <td className="py-4 px-4 text-sm font-mono text-slate-700 text-right">
                                  {item.averageDaily?.toFixed(1)}
                                </td>
                                <td className="py-4 px-4 text-sm font-mono text-slate-600 text-right">
                                  {item.daysCount}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                );
              })()}
            </>
          ) : viewMode === 'daily' ? (
            <>
          {/* Статистика */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="text-xs uppercase tracking-wider font-semibold text-slate-600 mb-2">Общее производство</div>
              <div className="text-3xl font-bold text-slate-900">
                {totalProduction.toFixed(2)} т
              </div>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="text-xs uppercase tracking-wider font-semibold text-slate-600 mb-2">Среднее в сутки</div>
              <div className="text-3xl font-bold text-slate-900">
                {averageDaily.toFixed(2)} т
              </div>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="text-xs uppercase tracking-wider font-semibold text-slate-600 mb-2">Дней в выборке</div>
              <div className="text-3xl font-bold text-slate-900">
                {productionData.length}
              </div>
            </div>
          </div>

          {/* График */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-slate-900">
                Динамика производства
              </h3>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => exportToExcel(
                    productionData,
                    `daily_${startDate}_${endDate}`,
                    [
                      {key: 'date', label: 'Дата'},
                      {key: 'total', label: 'Производство (т)'},
                      {key: 'shift_type', label: 'Смена'},
                    ]
                  )}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-semibold">Экспорт</span>
                </button>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showShiftsOnChart}
                    onChange={(e) => setShowShiftsOnChart(e.target.checked)}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span className="text-sm text-slate-700">Показать смены</span>
                </label>
              </div>
            </div>

            <div className="relative bg-slate-50 rounded-lg p-6 border border-slate-200">
              <div className="relative h-96 pt-8 pb-12 px-16 overflow-x-auto">
                {(() => {
                  const maxValue = Math.max(...productionData.map(d => d.total), DAILY_TARGET) * 1.15;
                  const minValue = 0;
                  const valueRange = maxValue - minValue;

                  // Линия нормы
                  const normY = 100 - ((DAILY_TARGET - minValue) / valueRange) * 100;
                  const shiftNormY = 100 - ((SHIFT_TARGET - minValue) / valueRange) * 100;

                  // Метки оси Y
                  const yAxisMarks = showShiftsOnChart ? [
                    { value: 0, label: '0' },
                    { value: 200, label: '200' },
                    { value: 400, label: '400' },
                    { value: SHIFT_TARGET, label: '600', highlight: true },
                    { value: 800, label: '800' },
                    { value: 1000, label: '1000' },
                    { value: DAILY_TARGET, label: '1200' },
                  ].filter(mark => mark.value <= maxValue) : [
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
                        {/* Сетка */}
                        <defs>
                          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e2e8f0" strokeWidth="0.3" />
                          </pattern>
                        </defs>
                        <rect width="100" height="100" fill="url(#grid)" />

                        {/* Линия нормы суточная */}
                        {!showShiftsOnChart && (
                          <line
                            x1="0"
                            y1={normY}
                            x2="100"
                            y2={normY}
                            stroke="#ef4444"
                            strokeWidth="2"
                            strokeDasharray="4,4"
                            vectorEffect="non-scaling-stroke"
                            opacity="0.7"
                          />
                        )}

                        {/* Линия нормы для смены */}
                        {showShiftsOnChart && (
                          <line
                            x1="0"
                            y1={shiftNormY}
                            x2="100"
                            y2={shiftNormY}
                            stroke="#ef4444"
                            strokeWidth="2"
                            strokeDasharray="4,4"
                            vectorEffect="non-scaling-stroke"
                            opacity="0.7"
                          />
                        )}

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
                                strokeWidth="2.5"
                                vectorEffect="non-scaling-stroke"
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
                                  strokeWidth="2.5"
                                  vectorEffect="non-scaling-stroke"
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
                                  strokeWidth="2.5"
                                  vectorEffect="non-scaling-stroke"
                                />
                              );
                            })()}
                          </>
                        )}
                      </svg>

                      {/* Метка нормы */}
                      {!showShiftsOnChart ? (
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
                      ) : (
                        <div
                          className="absolute left-14 pointer-events-none"
                          style={{
                            top: `${shiftNormY}%`,
                            transform: 'translateY(-50%)'
                          }}
                        >
                          <div className="bg-red-500 text-white text-xs px-2 py-0.5 rounded font-mono font-semibold shadow-md">
                            Норма смены: {SHIFT_TARGET} т
                          </div>
                        </div>
                      )}

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
                                  className="w-4 h-4 rounded-full cursor-pointer transition-all duration-200 hover:scale-150 border-2 border-white shadow-md z-10"
                                  style={{ backgroundColor: pointColor }}
                                ></div>

                                {/* Постоянное отображение значения */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none">
                                  <div
                                    className="text-white text-xs font-bold px-2 py-1 rounded shadow-md whitespace-nowrap"
                                    style={{ backgroundColor: pointColor }}
                                  >
                                    {point.total?.toFixed(0)}
                                  </div>
                                </div>

                                {/* Детальный tooltip при наведении */}
                                {(() => {
                                  const tooltipRight = x > 50;
                                  return (
                                    <div
                                      className={`absolute ${tooltipRight ? 'right-full mr-3' : 'left-full ml-3'} top-1/2 -translate-y-1/2 hidden group-hover:block z-30`}
                                    >
                                      <div className="bg-white border-2 border-blue-400 rounded-xl p-4 shadow-2xl whitespace-nowrap min-w-[240px]">
                                        <div className="text-sm text-slate-600 mb-3 font-semibold border-b border-slate-200 pb-2">
                                          {new Date(point.date).toLocaleDateString('ru-RU', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                          })}
                                        </div>
                                        <div className="space-y-2">
                                          <div className="flex justify-between items-center">
                                            <span className="text-xs text-slate-600">Дневная смена:</span>
                                            <span className="text-sm font-semibold text-amber-600">{point.dayShift?.toFixed(2)} т</span>
                                          </div>
                                          <div className="flex justify-between items-center">
                                            <span className="text-xs text-slate-600">Ночная смена:</span>
                                            <span className="text-sm font-semibold text-purple-600">{point.nightShift?.toFixed(2)} т</span>
                                          </div>
                                          <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                                            <span className="text-xs text-slate-600">Всего:</span>
                                            <span className="text-lg font-bold" style={{ color: pointColor }}>{point.total?.toFixed(2)} т</span>
                                          </div>
                                          {point.total < DAILY_TARGET && (
                                            <div className="pt-2 border-t border-red-200">
                                              <div className="text-xs text-red-600">
                                                Ниже нормы на <span className="font-bold">{(DAILY_TARGET - point.total).toFixed(2)} т</span>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      {/* Стрелка указатель */}
                                      <div
                                        className={`absolute top-1/2 -translate-y-1/2 w-0 h-0 border-solid ${
                                          tooltipRight
                                            ? 'left-full border-l-[8px] border-l-blue-400 border-y-transparent border-y-[8px] border-r-0'
                                            : 'right-full border-r-[8px] border-r-blue-400 border-y-transparent border-y-[8px] border-l-0'
                                        }`}
                                      ></div>
                                    </div>
                                  );
                                })()}

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
                                  className="absolute group/day"
                                  style={{
                                    left: `calc(3rem + (100% - 3rem) * ${x} / 100)`,
                                    top: `${yDay}%`,
                                    transform: 'translate(-50%, -50%)'
                                  }}
                                >
                                  <div className="w-3 h-3 rounded-full bg-amber-500 cursor-pointer transition-all duration-200 hover:scale-150 border-2 border-white shadow-sm z-10"></div>

                                  {/* Постоянное отображение значения дневной смены */}
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none">
                                    <div className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
                                      {point.dayShift?.toFixed(0)}
                                    </div>
                                  </div>

                                  {/* Детальный tooltip при наведении на дневную точку */}
                                  {(() => {
                                    const tooltipRight = x > 50;
                                    return (
                                      <div
                                        className={`absolute ${tooltipRight ? 'right-full mr-3' : 'left-full ml-3'} top-1/2 -translate-y-1/2 hidden group-hover/day:block z-30`}
                                      >
                                        <div className="bg-white border-2 border-amber-400 rounded-xl p-4 shadow-2xl whitespace-nowrap min-w-[220px]">
                                          <div className="text-sm text-slate-600 mb-3 font-semibold border-b border-slate-200 pb-2">
                                            {new Date(point.date).toLocaleDateString('ru-RU', {
                                              day: '2-digit',
                                              month: '2-digit',
                                              year: 'numeric',
                                            })}
                                          </div>
                                          <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                              <span className="text-xs text-slate-600">Дневная смена:</span>
                                              <span className="text-lg font-bold text-amber-600">{point.dayShift?.toFixed(2)} т</span>
                                            </div>
                                          </div>
                                        </div>
                                        {/* Стрелка указатель */}
                                        <div
                                          className={`absolute top-1/2 -translate-y-1/2 w-0 h-0 border-solid ${
                                            tooltipRight
                                              ? 'left-full border-l-[8px] border-l-amber-400 border-y-transparent border-y-[8px] border-r-0'
                                              : 'right-full border-r-[8px] border-r-amber-400 border-y-transparent border-y-[8px] border-l-0'
                                          }`}
                                        ></div>
                                      </div>
                                    );
                                  })()}
                                </div>

                                {/* Точка ночной смены */}
                                <div
                                  className="absolute group/night"
                                  style={{
                                    left: `calc(3rem + (100% - 3rem) * ${x} / 100)`,
                                    top: `${yNight}%`,
                                    transform: 'translate(-50%, -50%)'
                                  }}
                                >
                                  <div className="w-3 h-3 rounded-full bg-purple-500 cursor-pointer transition-all duration-200 hover:scale-150 border-2 border-white shadow-sm z-10"></div>

                                  {/* Постоянное отображение значения ночной смены */}
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none">
                                    <div className="bg-purple-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
                                      {point.nightShift?.toFixed(0)}
                                    </div>
                                  </div>

                                  {/* Детальный tooltip при наведении на ночную точку */}
                                  {(() => {
                                    const tooltipRight = x > 50;
                                    return (
                                      <div
                                        className={`absolute ${tooltipRight ? 'right-full mr-3' : 'left-full ml-3'} top-1/2 -translate-y-1/2 hidden group-hover/night:block z-30`}
                                      >
                                        <div className="bg-white border-2 border-purple-400 rounded-xl p-4 shadow-2xl whitespace-nowrap min-w-[240px]">
                                          <div className="text-sm text-slate-600 mb-3 font-semibold border-b border-slate-200 pb-2">
                                            {new Date(point.date).toLocaleDateString('ru-RU', {
                                              day: '2-digit',
                                              month: '2-digit',
                                              year: 'numeric',
                                            })}
                                          </div>
                                          <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                              <span className="text-xs text-slate-600">Дневная смена:</span>
                                              <span className="text-sm font-semibold text-amber-600">{point.dayShift?.toFixed(2)} т</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                              <span className="text-xs text-slate-600">Ночная смена:</span>
                                              <span className="text-sm font-semibold text-purple-600">{point.nightShift?.toFixed(2)} т</span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                                              <span className="text-xs text-slate-600">Всего:</span>
                                              <span className="text-lg font-bold" style={{ color: pointColor }}>{point.total?.toFixed(2)} т</span>
                                            </div>
                                          </div>
                                        </div>
                                        {/* Стрелка указатель */}
                                        <div
                                          className={`absolute top-1/2 -translate-y-1/2 w-0 h-0 border-solid ${
                                            tooltipRight
                                              ? 'left-full border-l-[8px] border-l-purple-400 border-y-transparent border-y-[8px] border-r-0'
                                              : 'right-full border-r-[8px] border-r-purple-400 border-y-transparent border-y-[8px] border-l-0'
                                          }`}
                                        ></div>
                                      </div>
                                    );
                                  })()}
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
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-2xl font-bold text-slate-900 mb-4">
              Детальные данные
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600">Дата</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600">Дневная смена, т</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600">Ночная смена, т</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600">Всего, т</th>
                  </tr>
                </thead>
                <tbody>
                  {productionData.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="py-3 px-4 text-sm font-mono text-slate-800">
                        {new Date(item.date).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="py-3 px-4 text-sm font-mono text-slate-800 text-right">
                        {item.dayShift?.toFixed(2) || '0.00'}
                      </td>
                      <td className="py-3 px-4 text-sm font-mono text-slate-800 text-right">
                        {item.nightShift?.toFixed(2) || '0.00'}
                      </td>
                      <td className="py-3 px-4 text-sm font-mono font-bold text-slate-900 text-right">
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
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">
                      Детальная динамика по 30 минутам
                    </h3>
                    <div className="text-sm text-slate-600">
                      Период: {new Date(startDate).toLocaleDateString('ru-RU')} - {new Date(endDate).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                  <button
                    onClick={() => exportToExcel(
                      detailedData,
                      `detailed_${selectedDate}`,
                      [
                        {key: 'time', label: 'Время'},
                        {key: 'averageSpeed', label: 'Скорость (т/ч)'},
                        {key: 'totalProduction', label: 'Производство (т)'},
                      ]
                    )}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm font-semibold">Экспорт</span>
                  </button>
                </div>

                {/* График */}
                <div className="relative bg-slate-50 rounded-lg p-6 border border-slate-200">
                  <div className="relative h-96 pt-8 pb-12 px-16 overflow-x-auto">
                    {(() => {
                      const maxValue = Math.max(...detailedData.map(d => d.averageSpeed || 0), 5) * 1.2;
                      const points = detailedData.map((point, index) => {
                        const x = (index / (detailedData.length - 1 || 1)) * 100;
                        const y = 100 - Math.max(((point.averageSpeed || 0) / maxValue) * 100, 0);
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
                            {/* Сетка */}
                            <defs>
                              <pattern id="grid-detailed" width="10" height="10" patternUnits="userSpaceOnUse">
                                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e2e8f0" strokeWidth="0.3" />
                              </pattern>
                            </defs>
                            <rect width="100" height="100" fill="url(#grid-detailed)" />

                            <path
                              d={linePath}
                              fill="none"
                              stroke="#3b82f6"
                              strokeWidth="2.5"
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
                              <div className="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-lg cursor-pointer transition-all duration-200 hover:scale-150 z-10"></div>

                              {/* Постоянное отображение значения скорости */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none">
                                <div className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded shadow-md whitespace-nowrap">
                                  {p.point.averageSpeed?.toFixed(1)} т/ч
                                </div>
                              </div>

                              {/* Детальный tooltip при наведении */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-12 hidden group-hover:block z-30">
                                <div className="bg-white border-2 border-blue-500 rounded-lg p-3 shadow-2xl whitespace-nowrap">
                                  <div className="text-xs text-slate-600 mb-2 font-mono font-semibold">
                                    {p.point.time}
                                  </div>
                                  <div className="text-lg font-bold text-blue-600 mb-1">
                                    {p.point.averageSpeed?.toFixed(2)} т/ч
                                  </div>
                                  <div className="text-xs text-slate-600">
                                    Производство: {p.point.totalProduction?.toFixed(2)} т
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
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="text-2xl font-bold text-slate-900 mb-4">
                  Данные по 30-минутным интервалам
                </h3>
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-slate-50">
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600">Время</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600">Производство, т</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600">Скорость, т/ч</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600">Записей</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailedData.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="py-3 px-4 text-sm font-mono text-slate-800">
                            {item.time}
                          </td>
                          <td className="py-3 px-4 text-sm font-mono font-bold text-slate-900 text-right">
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
                  <h2 className="text-2xl font-bold text-slate-900">
                    Технические параметры оборудования
                  </h2>
                  <button
                    onClick={() => setShowCustomTechGraph(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-all"
                  >
                    <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="text-sm font-semibold text-slate-700">Создать график</span>
                  </button>
                </div>
                <div className="space-y-6">
                  {techCollections.map((collection, idx) => (
                    <TechnicalChart
                      key={`${collection.name}_${collection.group || idx}`}
                      collections={collection.collections}
                      title={collection.title}
                      group={collection.group}
                      uniqueKey={`${collection.name}_${collection.group || idx}`}
                      techData={techData}
                      techMetrics={techMetrics}
                      selectedMetrics={selectedMetrics}
                      onToggleMetric={toggleMetricSelection}
                      onExport={exportToExcel}
                      metricNorms={metricNorms}
                      getMetricsForGroup={getMetricsForGroup}
                      selectedDate={selectedDate}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Модальное окно для создания кастомного графика технических параметров */}
      {showCustomTechGraph && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">Создать кастомный график</h2>
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
              {/* Информация о выбранном периоде */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="text-sm font-semibold text-slate-800">
                  Период: {startDate && endDate ? `${new Date(startDate).toLocaleDateString('ru-RU')} - ${new Date(endDate).toLocaleDateString('ru-RU')}` : 'Не выбран'}
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  График будет построен для данных этого периода
                </div>
              </div>

              {/* Выбор параметров */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-xs uppercase tracking-wider font-semibold text-slate-600">
                    Выберите параметры ({customTechMetrics.length})
                  </label>
                  <button
                    onClick={() => setCustomTechMetrics([])}
                    className="text-xs px-3 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg transition-all"
                  >
                    Очистить
                  </button>
                </div>

                <div className="space-y-4 bg-slate-50 rounded-lg p-4 border border-slate-200 max-h-96 overflow-y-auto">
                  {techCollections.map((collection, idx) => {
                    // Объединяем метрики из всех коллекций группы
                    const allCollectionMetrics = collection.collections.flatMap(coll => techMetrics[coll] || []);
                    const metrics = getMetricsForGroup(collection.group, allCollectionMetrics);
                    if (metrics.length === 0) return null;

                    return (
                      <div key={`${collection.name}_${collection.group || idx}`}>
                        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 px-2">
                          {collection.title}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {metrics.map((metric: any) => {
                            // Находим в какой реальной коллекции находится эта метрика
                            const realCollection = collection.collections.find(coll =>
                              (techMetrics[coll] || []).some((m: any) => m.title === metric.title)
                            ) || collection.collections[0];

                            const isSelected = customTechMetrics.some(
                              m => m.collection === realCollection && m.metric === metric.title
                            );
                            return (
                              <label
                                key={metric.title}
                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                  isSelected
                                    ? 'border-slate-400 bg-slate-100'
                                    : 'border-slate-300 bg-white hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleCustomTechMetric(realCollection, metric.title)}
                                  className="w-4 h-4 rounded"
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
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-bold text-lg rounded-lg transition-all"
              >
                {loading ? 'Загрузка данных...' : 'Построить график'}
              </button>

              {/* Отображение кастомного графика */}
              {customTechGraphData.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold text-slate-900">
                      Комбинированный график
                    </h3>
                    <div className="flex items-center gap-3">
                      {/* Кнопка полноэкранного режима */}
                      <button
                        onClick={() => setCustomGraphFullscreen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                        <span className="text-sm font-semibold">Полный экран</span>
                      </button>

                      {/* Кнопка экспорта */}
                      <button
                        onClick={() => {
                          // Подготовка данных для экспорта
                          const allTimes = new Set<string>();
                          customTechGraphData.forEach(({ data }) => {
                            data.forEach((d: any) => allTimes.add(d.time));
                          });
                          const sortedTimes = Array.from(allTimes).sort();

                          const exportData = sortedTimes.map(time => {
                            const row: any = {time};
                            customTechGraphData.forEach(({ collection, metric, data }) => {
                              const point = data.find((d: any) => d.time === time);
                              const collectionTitle = techCollections.find(c => c.name === collection)?.title || collection;
                              row[`${collectionTitle}: ${metric}`] = point?.value || '';
                            });
                            return row;
                          });

                          const columns = [
                            {key: 'time', label: 'Время'},
                            ...customTechGraphData.map(({ collection, metric }) => {
                              const collectionTitle = techCollections.find(c => c.name === collection)?.title || collection;
                              return {key: `${collectionTitle}: ${metric}`, label: `${collectionTitle}: ${metric}`};
                            })
                          ];

                          exportToExcel(exportData, `custom_${startDate}_${endDate}`, columns);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-sm font-semibold">Экспорт</span>
                      </button>
                    </div>
                  </div>

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
                        <div className="relative h-96 pt-8 pb-12 px-16 overflow-visible">
                          {/* SVG для всех линий */}
                          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                            {/* Сетка */}
                            <defs>
                              <pattern id="grid-custom" width="10" height="10" patternUnits="userSpaceOnUse">
                                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e2e8f0" strokeWidth="0.3" />
                              </pattern>
                            </defs>
                            <rect width="100" height="100" fill="url(#grid-custom)" />

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
                                  strokeWidth="2.5"
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
                                    className="w-4 h-4 rounded-full cursor-pointer transition-all duration-200 hover:scale-150 border-2 border-white shadow-lg z-10"
                                    style={{ backgroundColor: pointColor }}
                                  ></div>

                                  {/* Постоянное отображение значения */}
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none">
                                    <div
                                      className="text-white text-xs font-bold px-2 py-1 rounded shadow-md whitespace-nowrap"
                                      style={{ backgroundColor: pointColor }}
                                    >
                                      {point.value.toFixed(1)}
                                    </div>
                                  </div>

                                  {/* Детальный tooltip при наведении */}
                                  <div className={`absolute hidden group-hover:block z-30 ${
                                    x < 20 ? 'left-full ml-3' : x > 80 ? 'right-full mr-3' : x < 50 ? 'left-full ml-2' : 'right-full mr-2'
                                  } ${
                                    y < 20 ? 'top-0' : y > 80 ? 'bottom-0' : y < 50 ? 'top-0' : 'bottom-0'
                                  }`}>
                                    <div className="bg-white border-2 rounded-lg p-3 shadow-2xl whitespace-nowrap" style={{ borderColor: pointColor }}>
                                      <div className="text-xs text-slate-600 mb-1 font-semibold">{line.metric}</div>
                                      <div className="text-xs text-slate-500 mb-2 font-mono">
                                        {point.time}
                                      </div>
                                      <div className="text-lg font-bold" style={{ color: pointColor }}>
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

              {/* Модальное окно для полноэкранного режима */}
              {customGraphFullscreen && customTechGraphData.length > 0 && (
                <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
                  {/* Панель управления */}
                  <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Комбинированный график</h2>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3">
                        <span className="text-sm">Масштаб:</span>
                        <input
                          type="range"
                          min="0.5"
                          max="3"
                          step="0.1"
                          value={customGraphScale}
                          onChange={(e) => setCustomGraphScale(parseFloat(e.target.value))}
                          className="w-32"
                        />
                        <span className="text-sm font-mono w-12">{(customGraphScale * 100).toFixed(0)}%</span>
                      </div>
                      <button
                        onClick={() => {
                          setCustomGraphFullscreen(false);
                          setCustomGraphScale(1);
                        }}
                        className="text-white hover:text-red-400 transition-colors"
                      >
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* График в полноэкранном режиме */}
                  <div className="flex-1 overflow-auto p-8 bg-slate-50">
                    <div className="bg-white rounded-lg border border-slate-200 p-6 h-full">
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

                        // Вычисляем ширину графика: минимум 20px на точку
                        const graphWidth = Math.max(1400, sortedTimes.length * 20);

                        // Функция для форматирования времени
                        const formatTime = (timeStr: string, short = false) => {
                          if (!timeStr.includes(' ')) return timeStr;
                          const [datePart, timePart] = timeStr.split(' ');
                          const [year, month, day] = datePart.split('-');
                          if (short) {
                            return `${day}.${month} ${timePart}`;
                          }
                          return `${day}.${month}.${year} ${timePart}`;
                        };

                        return (
                          <>
                            {/* Легенда */}
                            <div className="flex flex-wrap gap-4 mb-4">
                              {customTechGraphData.map((line, index) => {
                                const collectionTitle = techCollections.find(c => c.name === line.collection)?.title || line.collection;
                                return (
                                  <div key={index} className="flex items-center gap-2">
                                    <div
                                      className="w-4 h-4 rounded-full"
                                      style={{ backgroundColor: colors[index % colors.length] }}
                                    ></div>
                                    <span className="text-base font-medium text-slate-700">
                                      {collectionTitle}: {line.metric}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>

                            {/* График с масштабом */}
                            <div className="overflow-auto" style={{ height: 'calc(100% - 60px)' }}>
                              <div
                                className="relative"
                                style={{
                                  width: `${graphWidth * customGraphScale}px`,
                                  height: `${600 * customGraphScale}px`,
                                  paddingTop: `${30 * customGraphScale}px`,
                                  paddingBottom: `${80 * customGraphScale}px`,
                                  paddingLeft: `${60 * customGraphScale}px`
                                }}
                              >
                                {/* SVG с графиком */}
                                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                  <defs>
                                    <pattern id="grid-custom-fullscreen" width="10" height="10" patternUnits="userSpaceOnUse">
                                      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e2e8f0" strokeWidth="0.3" />
                                    </pattern>
                                  </defs>
                                  <rect width="100" height="100" fill="url(#grid-custom-fullscreen)" />

                                  <g>
                                    {[0, 25, 50, 75, 100].map((tick) => (
                                      <line
                                        key={`y-tick-${tick}`}
                                        x1="2"
                                        y1={98 - (tick * 0.96)}
                                        x2="98"
                                        y2={98 - (tick * 0.96)}
                                        stroke="#94a3b8"
                                        strokeWidth="1"
                                        strokeDasharray="2,2"
                                        opacity="0.3"
                                        vectorEffect="non-scaling-stroke"
                                      />
                                    ))}
                                  </g>

                                  {/* Линии для каждой метрики */}
                                  {customTechGraphData.map((line, lineIndex) => {
                                    const color = colors[lineIndex % colors.length];
                                    const points = line.data.map((point: any, index: number) => {
                                      const x = 2 + (index / Math.max(1, line.data.length - 1)) * 96;
                                      const normalizedValue = valueRange !== 0 ? ((point.value - minValue) / valueRange) : 0.5;
                                      const y = 98 - (normalizedValue * 96);
                                      return { x, y, value: point.value, time: point.time };
                                    });

                                    const linePath = points.map((p: any, i: number) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

                                    return (
                                      <path
                                        key={lineIndex}
                                        d={linePath}
                                        fill="none"
                                        stroke={color}
                                        strokeWidth="2.5"
                                        vectorEffect="non-scaling-stroke"
                                      />
                                    );
                                  })}
                                </svg>

                                {/* Метки Y */}
                                {[0, 25, 50, 75, 100].map((tick) => {
                                  const value = minValue + (tick / 100) * (maxValue - minValue);
                                  const yPos = 98 - (tick * 0.96);

                                  return (
                                    <div
                                      key={`y-label-fs-${tick}`}
                                      className="absolute left-0 pointer-events-none text-sm font-mono text-slate-700 font-bold bg-white px-2 py-1 rounded border border-slate-300"
                                      style={{
                                        top: `${yPos}%`,
                                        transform: 'translate(-100%, -50%)',
                                        marginLeft: '-8px',
                                        fontSize: `${12 * customGraphScale}px`
                                      }}
                                    >
                                      {value.toFixed(1)}
                                    </div>
                                  );
                                })}

                                {/* Точки */}
                                {customTechGraphData.map((line, lineIndex) => {
                                  const color = colors[lineIndex % colors.length];

                                  return line.data.map((point: any, index: number) => {
                                    const x = 2 + (index / Math.max(1, line.data.length - 1)) * 96;
                                    const normalizedValue = valueRange !== 0 ? ((point.value - minValue) / valueRange) : 0.5;
                                    const y = 2 + (1 - normalizedValue) * 96;

                                    const showTime = index % Math.max(1, Math.floor(line.data.length / 10)) === 0;
                                    const currentDate = point.time.split(' ')[0];
                                    const prevDate = index > 0 ? line.data[index - 1].time.split(' ')[0] : '';
                                    const isNewDay = currentDate !== prevDate;

                                    return (
                                      <div
                                        key={`${lineIndex}-fs-${index}`}
                                        className="absolute group"
                                        style={{
                                          left: `${x}%`,
                                          top: `${y}%`,
                                          transform: 'translate(-50%, -50%)'
                                        }}
                                      >
                                        <div
                                          className="rounded-full cursor-pointer transition-all hover:scale-150 border-2 border-white shadow-lg"
                                          style={{
                                            backgroundColor: color,
                                            width: `${12 * customGraphScale}px`,
                                            height: `${12 * customGraphScale}px`
                                          }}
                                        />

                                        <div
                                          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none text-white font-bold px-2 py-1 rounded shadow-md whitespace-nowrap"
                                          style={{
                                            backgroundColor: color,
                                            fontSize: `${12 * customGraphScale}px`
                                          }}
                                        >
                                          {point.value.toFixed(1)}
                                        </div>

                                        {isNewDay && (
                                          <>
                                            <div
                                              className="absolute pointer-events-none"
                                              style={{
                                                left: '50%',
                                                top: '50%',
                                                transform: 'translate(-50%, -50%)',
                                                width: '2px',
                                                height: `${600 * customGraphScale}px`,
                                                backgroundColor: '#ef4444',
                                                opacity: 0.3,
                                                zIndex: 1
                                              }}
                                            />
                                            <div
                                              className="absolute left-1/2 -translate-x-1/2 font-bold text-red-600 bg-white px-3 py-1 rounded border-2 border-red-600 shadow-lg whitespace-nowrap"
                                              style={{
                                                top: '100%',
                                                marginTop: '8px',
                                                fontSize: `${14 * customGraphScale}px`
                                              }}
                                            >
                                              {formatTime(point.time, false)}
                                            </div>
                                          </>
                                        )}

                                        {showTime && !isNewDay && (
                                          <div
                                            className="absolute left-1/2 -translate-x-1/2 text-slate-700 font-semibold font-mono whitespace-nowrap"
                                            style={{
                                              top: '100%',
                                              marginTop: '8px',
                                              fontSize: `${12 * customGraphScale}px`
                                            }}
                                          >
                                            {point.time.split(' ')[1]}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  });
                                })}
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

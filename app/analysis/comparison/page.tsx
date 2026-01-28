'use client';

import { useState, useEffect } from 'react';

type ShiftFilter = 'all' | 'day' | 'night';
type QuickPeriod = 'week' | 'month' | 'season' | 'custom';

interface QualityMetric {
  id: string;
  label: string;
  unit: string;
}

interface TechnicalMetric {
  collection: string;
  title: string;
  unit: string;
}

interface ComparisonData {
  date: string;
  shift_type?: string;
  [key: string]: any;
}

// Доступные типы качественного анализа
const QUALITY_METRICS: QualityMetric[] = [
  { id: 'Топ 0 Влага,%', label: 'Топ 0 Влага', unit: '%' },
  { id: 'Топ 0 Сор,%', label: 'Топ 0 Сор', unit: '%' },
  { id: 'Топ 0 Масличность,%', label: 'Топ 0 Масличность', unit: '%' },
  { id: 'РВО Масличность,%', label: 'РВО Масличность', unit: '%' },
  { id: 'РВО Лузжистость,%', label: 'РВО Лузжистость', unit: '%' },
  { id: 'Экстракция Жмых Масличность,%', label: 'Экстракция Жмых Масличность', unit: '%' },
  { id: 'Экстракция Шрот масличность,%', label: 'Экстракция Шрот масличность', unit: '%' },
  { id: 'Грануляция Влага,%', label: 'Грануляция Влага', unit: '%' },
];

// Технические коллекции
const TECH_COLLECTIONS = [
  { name: 'Extractor_TechData_Job', label: 'Экстрактор' },
  { name: 'Data_extractor_cooking', label: 'Экстрактор (готовка)' },
  { name: 'Press_1_Job', label: 'Пресс 1' },
  { name: 'Press_2_Job', label: 'Пресс 2' },
];

export default function ComparisonPage() {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [shiftFilter, setShiftFilter] = useState<ShiftFilter>('all');
  const [quickPeriod, setQuickPeriod] = useState<QuickPeriod>('week');

  // Выбранные метрики
  const [selectedQualityMetrics, setSelectedQualityMetrics] = useState<string[]>([]);
  const [selectedTechMetrics, setSelectedTechMetrics] = useState<{collection: string, metric: string}[]>([]);

  // Данные
  const [qualityData, setQualityData] = useState<any[]>([]);
  const [techData, setTechData] = useState<{[key: string]: any[]}>({});
  const [availableTechMetrics, setAvailableTechMetrics] = useState<{[key: string]: TechnicalMetric[]}>({});
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Установка дат по умолчанию
  useEffect(() => {
    applyQuickPeriod('week');
  }, []);

  const applyQuickPeriod = (period: QuickPeriod) => {
    const end = new Date();
    const start = new Date();

    if (period === 'week') {
      start.setDate(start.getDate() - 7);
    } else if (period === 'month') {
      start.setDate(1);
    } else if (period === 'season') {
      start.setMonth(8, 1);
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    setQuickPeriod(period);
  };

  // Загрузка качественных данных
  const fetchQualityData = async () => {
    if (!startDate || !endDate) return;

    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        shift_type: shiftFilter,
        analysis_type: 'all',
      });

      const response = await fetch(`/api/quality-analysis?${params}`);
      if (!response.ok) throw new Error('Failed to fetch quality data');

      const data = await response.json();
      setQualityData(data.analyses || []);
    } catch (err: any) {
      console.error('Error fetching quality data:', err);
      setError(err.message);
    }
  };

  // Загрузка технических данных
  const fetchTechnicalData = async () => {
    if (!startDate || !endDate) return;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates: string[] = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }

    const techDataTemp: {[key: string]: any[]} = {};
    const metricsTemp: {[key: string]: TechnicalMetric[]} = {};

    for (const collection of TECH_COLLECTIONS.map(c => c.name)) {
      const collectionData: any[] = [];
      const collectionMetrics: TechnicalMetric[] = [];

      for (const date of dates) {
        try {
          const response = await fetch(`/api/technical-data/detailed?date=${date}&collection=${collection}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              collectionData.push(...(data.data || []));

              // Собираем уникальные метрики
              if (data.metrics && collectionMetrics.length === 0) {
                data.metrics.forEach((m: any) => {
                  if (!collectionMetrics.some(cm => cm.title === m.title)) {
                    collectionMetrics.push({
                      collection,
                      title: m.title,
                      unit: m.unit,
                    });
                  }
                });
              }
            }
          }
        } catch (err) {
          console.error(`Error fetching ${collection} for ${date}:`, err);
        }
      }

      techDataTemp[collection] = collectionData;
      metricsTemp[collection] = collectionMetrics;
    }

    setTechData(techDataTemp);
    setAvailableTechMetrics(metricsTemp);
  };

  // Загрузка всех данных
  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([fetchQualityData(), fetchTechnicalData()]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Агрегация данных для сравнения
  useEffect(() => {
    if (qualityData.length === 0 && Object.keys(techData).length === 0) return;

    const aggregated: {[key: string]: ComparisonData} = {};

    // Агрегируем качественные данные
    qualityData.forEach((item) => {
      const key = shiftFilter === 'all'
        ? `${item.shift_date}_${item.shift_type}`
        : item.shift_date;

      if (!aggregated[key]) {
        aggregated[key] = {
          date: item.shift_date,
          shift_type: item.shift_type,
        };
      }

      if (selectedQualityMetrics.includes(item.analysis_type)) {
        if (!aggregated[key][item.analysis_type]) {
          aggregated[key][item.analysis_type] = [];
        }
        aggregated[key][item.analysis_type].push(item.value);
      }
    });

    // Вычисляем средние для качественных данных
    Object.values(aggregated).forEach((item) => {
      selectedQualityMetrics.forEach((metric) => {
        if (item[metric] && Array.isArray(item[metric])) {
          const values = item[metric];
          item[metric] = values.reduce((sum: number, v: number) => sum + v, 0) / values.length;
        }
      });
    });

    // Агрегируем технические данные
    selectedTechMetrics.forEach(({ collection, metric }) => {
      const data = techData[collection] || [];

      data.forEach((point: any) => {
        const date = point.time.split(' ')[0];
        const key = shiftFilter === 'all'
          ? `${date}_${point.shift || 'all'}`
          : date;

        if (!aggregated[key]) {
          aggregated[key] = { date };
        }

        const metricKey = `${collection}_${metric}`;
        if (!aggregated[key][metricKey]) {
          aggregated[key][metricKey] = [];
        }

        if (point[metric] !== undefined) {
          aggregated[key][metricKey].push(point[metric]);
        }
      });
    });

    // Вычисляем средние для технических данных
    Object.values(aggregated).forEach((item) => {
      selectedTechMetrics.forEach(({ collection, metric }) => {
        const metricKey = `${collection}_${metric}`;
        if (item[metricKey] && Array.isArray(item[metricKey])) {
          const values = item[metricKey];
          item[metricKey] = values.reduce((sum: number, v: number) => sum + v, 0) / values.length;
        }
      });
    });

    setComparisonData(Object.values(aggregated).sort((a, b) => a.date.localeCompare(b.date)));
  }, [qualityData, techData, selectedQualityMetrics, selectedTechMetrics, shiftFilter]);

  // Экспорт в CSV (Excel)
  const exportToExcel = () => {
    if (comparisonData.length === 0) return;

    // Создаем заголовки
    const columns = [
      { key: 'date', label: 'Дата' },
      ...(shiftFilter === 'all' ? [{ key: 'shift_type', label: 'Смена' }] : []),
      ...selectedQualityMetrics.map(metric => ({
        key: metric,
        label: QUALITY_METRICS.find(m => m.id === metric)?.label || metric
      })),
      ...selectedTechMetrics.map(({ collection, metric }) => ({
        key: `${collection}_${metric}`,
        label: metric
      }))
    ];

    // Создаем CSV строку
    const headers = columns.map(col => col.label).join(',');
    const rows = comparisonData.map(row =>
      columns.map(col => {
        let value = row[col.key];
        if (col.key === 'shift_type') {
          value = value === 'day' ? 'Дневная' : value === 'night' ? 'Ночная' : value;
        }
        if (typeof value === 'number') {
          value = value.toFixed(2);
        }
        if (value === undefined || value === null) {
          value = '-';
        }
        // Экранируем значения с запятыми
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(',')
    );

    const csv = [headers, ...rows].join('\n');

    // Создаем Blob и скачиваем
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `comparison_${startDate}_${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Сводный анализ</h1>
        <p className="text-slate-600">Сравнение количественных и качественных показателей</p>
      </div>

      {/* Фильтры периода */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Период анализа</h2>

        {/* Быстрый выбор периода */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => applyQuickPeriod('week')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              quickPeriod === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Неделя
          </button>
          <button
            onClick={() => applyQuickPeriod('month')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              quickPeriod === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Месяц
          </button>
          <button
            onClick={() => applyQuickPeriod('season')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              quickPeriod === 'season'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Сезон
          </button>
        </div>

        {/* Детальный выбор дат */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Начало периода</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setQuickPeriod('custom');
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Конец периода</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setQuickPeriod('custom');
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Смена</label>
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value as ShiftFilter)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="all">Все смены</option>
              <option value="day">Дневная</option>
              <option value="night">Ночная</option>
            </select>
          </div>
        </div>

        <button
          onClick={loadData}
          disabled={loading || !startDate || !endDate}
          className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg font-semibold transition-colors"
        >
          {loading ? 'Загрузка...' : 'Загрузить данные'}
        </button>
      </div>

      {/* Выбор метрик качественного анализа */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Качественные показатели</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {QUALITY_METRICS.map((metric) => (
            <label
              key={metric.id}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${
                selectedQualityMetrics.includes(metric.id)
                  ? 'bg-blue-50 border-blue-500'
                  : 'bg-white border-slate-200 hover:border-blue-300'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedQualityMetrics.includes(metric.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedQualityMetrics([...selectedQualityMetrics, metric.id]);
                  } else {
                    setSelectedQualityMetrics(selectedQualityMetrics.filter(m => m !== metric.id));
                  }
                }}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-slate-700">{metric.label}</span>
              <span className="text-xs text-slate-500 ml-auto">({metric.unit})</span>
            </label>
          ))}
        </div>
      </div>

      {/* Выбор технических параметров */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Технические параметры</h2>
        {TECH_COLLECTIONS.map((collection) => {
          const metrics = availableTechMetrics[collection.name] || [];
          if (metrics.length === 0) return null;

          return (
            <div key={collection.name} className="mb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-3">{collection.label}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {metrics.map((metric) => {
                  const isSelected = selectedTechMetrics.some(
                    m => m.collection === collection.name && m.metric === metric.title
                  );

                  return (
                    <label
                      key={`${collection.name}_${metric.title}`}
                      className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-green-50 border-green-500'
                          : 'bg-white border-slate-200 hover:border-green-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTechMetrics([
                              ...selectedTechMetrics,
                              { collection: collection.name, metric: metric.title }
                            ]);
                          } else {
                            setSelectedTechMetrics(
                              selectedTechMetrics.filter(
                                m => !(m.collection === collection.name && m.metric === metric.title)
                              )
                            );
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-medium text-slate-700">{metric.title}</span>
                      <span className="text-xs text-slate-500 ml-auto">({metric.unit})</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Таблица сравнения */}
      {comparisonData.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">Результаты сравнения</h2>
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Экспорт в Excel</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Дата</th>
                  {shiftFilter === 'all' && (
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Смена</th>
                  )}
                  {selectedQualityMetrics.map((metric) => (
                    <th key={metric} className="px-4 py-3 text-left font-semibold text-slate-700">
                      {QUALITY_METRICS.find(m => m.id === metric)?.label}
                    </th>
                  ))}
                  {selectedTechMetrics.map(({ collection, metric }) => (
                    <th key={`${collection}_${metric}`} className="px-4 py-3 text-left font-semibold text-slate-700">
                      {metric}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-slate-600">{row.date}</td>
                    {shiftFilter === 'all' && (
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          row.shift_type === 'day'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {row.shift_type === 'day' ? 'Дневная' : 'Ночная'}
                        </span>
                      </td>
                    )}
                    {selectedQualityMetrics.map((metric) => (
                      <td key={metric} className="px-4 py-3 font-mono text-slate-700">
                        {row[metric] !== undefined ? row[metric].toFixed(2) : '-'}
                      </td>
                    ))}
                    {selectedTechMetrics.map(({ collection, metric }) => {
                      const key = `${collection}_${metric}`;
                      return (
                        <td key={key} className="px-4 py-3 font-mono text-slate-700">
                          {row[key] !== undefined ? row[key].toFixed(2) : '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Сообщение об ошибке */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">{error}</p>
        </div>
      )}

      {/* Сообщение о пустом состоянии */}
      {!loading && comparisonData.length === 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
          <svg className="w-16 h-16 mx-auto text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-slate-600 text-lg font-medium mb-2">Нет данных для отображения</p>
          <p className="text-slate-500">Выберите период и метрики, затем нажмите &quot;Загрузить данные&quot;</p>
        </div>
      )}
    </div>
  );
}

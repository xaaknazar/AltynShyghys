'use client';

import { useState, useEffect } from 'react';

type ShiftFilter = 'all' | 'day' | 'night';
type QuickPeriod = 'week' | 'month' | 'season' | 'custom';

interface QualityMetric {
  id: string;
  label: string;
  unit: string;
}

interface ChartDataPoint {
  date: string;
  time: string;
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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#14b8a6', '#f97316'];

export default function ComparisonPage() {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [shiftFilter, setShiftFilter] = useState<ShiftFilter>('all');
  const [quickPeriod, setQuickPeriod] = useState<QuickPeriod>('week');

  // Выбранные метрики
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);

  // Данные
  const [qualityData, setQualityData] = useState<any[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [graphScale, setGraphScale] = useState(1);

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
  const loadData = async () => {
    if (!startDate || !endDate) return;

    setLoading(true);
    setError(null);

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
    } finally {
      setLoading(false);
    }
  };

  // Агрегация данных для графика
  useEffect(() => {
    if (qualityData.length === 0 || selectedMetrics.length === 0) {
      setChartData([]);
      return;
    }

    // Группируем данные по дате и смене
    const grouped: { [key: string]: ChartDataPoint } = {};

    qualityData.forEach((item) => {
      const key = shiftFilter === 'all'
        ? `${item.shift_date}_${item.shift_type}`
        : item.shift_date;

      if (!grouped[key]) {
        grouped[key] = {
          date: item.shift_date,
          time: item.sample_time,
          shift_type: item.shift_type,
        };
      }

      if (selectedMetrics.includes(item.analysis_type)) {
        const metricLabel = QUALITY_METRICS.find(m => m.id === item.analysis_type)?.label || item.analysis_type;

        if (!grouped[key][metricLabel]) {
          grouped[key][metricLabel] = [];
        }
        grouped[key][metricLabel].push(item.value);
      }
    });

    // Вычисляем средние значения
    Object.values(grouped).forEach((point) => {
      selectedMetrics.forEach((metricId) => {
        const metricLabel = QUALITY_METRICS.find(m => m.id === metricId)?.label || metricId;
        if (point[metricLabel] && Array.isArray(point[metricLabel])) {
          const values = point[metricLabel];
          point[metricLabel] = values.reduce((sum: number, v: number) => sum + v, 0) / values.length;
        }
      });
    });

    const sortedData = Object.values(grouped).sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      if (shiftFilter === 'all') {
        return a.shift_type === 'day' ? -1 : 1;
      }
      return 0;
    });

    setChartData(sortedData);
  }, [qualityData, selectedMetrics, shiftFilter]);

  // Экспорт в CSV
  const exportToCSV = () => {
    if (chartData.length === 0) return;

    const headers = ['Дата', ...(shiftFilter === 'all' ? ['Смена'] : []), ...selectedMetrics.map(id => QUALITY_METRICS.find(m => m.id === id)?.label || id)];
    const rows = chartData.map(row => [
      row.date,
      ...(shiftFilter === 'all' ? [row.shift_type === 'day' ? 'Дневная' : 'Ночная'] : []),
      ...selectedMetrics.map(id => {
        const label = QUALITY_METRICS.find(m => m.id === id)?.label || id;
        const value = row[label];
        return typeof value === 'number' ? value.toFixed(2) : '-';
      })
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `comparison_${startDate}_${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // Вычисляем ширину графика
  const graphWidth = Math.max(1400, chartData.length * 50);

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}.${month}.${year}`;
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Сводный анализ</h1>
        <p className="text-slate-600">Сравнение качественных показателей</p>
      </div>

      {/* Фильтры периода */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Период анализа</h2>

        {/* Быстрый выбор периода */}
        <div className="flex flex-wrap gap-2 mb-4">
          {(['week', 'month', 'season'] as QuickPeriod[]).map((period) => (
            <button
              key={period}
              onClick={() => applyQuickPeriod(period)}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                quickPeriod === period
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {period === 'week' ? 'Неделя' : period === 'month' ? 'Месяц' : 'Сезон'}
            </button>
          ))}
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

      {/* Выбор метрик */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Качественные показатели</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {QUALITY_METRICS.map((metric, idx) => {
            const isSelected = selectedMetrics.includes(metric.id);
            const color = COLORS[idx % COLORS.length];

            return (
              <label
                key={metric.id}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-blue-50 border-blue-500'
                    : 'bg-white border-slate-200 hover:border-blue-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedMetrics([...selectedMetrics, metric.id]);
                    } else {
                      setSelectedMetrics(selectedMetrics.filter(m => m !== metric.id));
                    }
                  }}
                  className="w-4 h-4"
                  style={{ accentColor: color }}
                />
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                <span className="text-sm font-medium text-slate-700">{metric.label}</span>
                <span className="text-xs text-slate-500 ml-auto">({metric.unit})</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* График */}
      {chartData.length > 0 && selectedMetrics.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">График сравнения</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFullscreen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                <span>Полный экран</span>
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Экспорт</span>
              </button>
            </div>
          </div>

          {/* Легенда */}
          <div className="flex flex-wrap gap-4 mb-6">
            {selectedMetrics.map((metricId, idx) => {
              const metric = QUALITY_METRICS.find(m => m.id === metricId);
              if (!metric) return null;
              const color = COLORS[idx % COLORS.length];

              return (
                <div key={metricId} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                  <span className="text-sm font-medium text-slate-700">
                    {metric.label} ({metric.unit})
                  </span>
                </div>
              );
            })}
          </div>

          {/* График с прокруткой */}
          <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 overflow-x-auto">
            <div className="relative" style={{ width: `${graphWidth}px`, height: '500px', paddingTop: '30px', paddingBottom: '80px', paddingLeft: '60px' }}>
              {/* SVG */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <pattern id="grid-comparison" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e2e8f0" strokeWidth="0.3" />
                  </pattern>
                </defs>
                <rect width="100" height="100" fill="url(#grid-comparison)" />

                {/* Горизонтальные линии */}
                {[0, 25, 50, 75, 100].map((tick) => (
                  <line
                    key={tick}
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

                {/* Линии метрик */}
                {selectedMetrics.map((metricId, metricIdx) => {
                  const metric = QUALITY_METRICS.find(m => m.id === metricId);
                  if (!metric) return null;
                  const color = COLORS[metricIdx % COLORS.length];

                  const dataPoints = chartData
                    .map((point, idx) => ({ point, idx }))
                    .filter(({ point }) => point[metric.label] !== undefined && point[metric.label] !== null);

                  if (dataPoints.length === 0) return null;

                  const values = dataPoints.map(({ point }) => point[metric.label]);
                  const dataMin = Math.min(...values);
                  const dataMax = Math.max(...values);
                  const padding = (dataMax - dataMin) * 0.1 || 1;
                  const minValue = dataMin - padding;
                  const maxValue = dataMax + padding;
                  const valueRange = maxValue - minValue;

                  const points = dataPoints.map(({ point, idx }) => {
                    const x = 2 + (idx / Math.max(1, dataPoints.length - 1)) * 96;
                    const normalizedValue = valueRange !== 0 ? ((point[metric.label] - minValue) / valueRange) : 0.5;
                    const y = 98 - (normalizedValue * 96);
                    return { x, y, value: point[metric.label], point, idx };
                  });

                  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

                  return (
                    <g key={metricId}>
                      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
                    </g>
                  );
                })}
              </svg>

              {/* Метки оси Y */}
              {selectedMetrics.length > 0 && (() => {
                const metricId = selectedMetrics[0];
                const metric = QUALITY_METRICS.find(m => m.id === metricId);
                if (!metric) return null;

                const dataPoints = chartData.filter(point => point[metric.label] !== undefined && point[metric.label] !== null);
                if (dataPoints.length === 0) return null;

                const values = dataPoints.map(point => point[metric.label]);
                const dataMin = Math.min(...values);
                const dataMax = Math.max(...values);
                const padding = (dataMax - dataMin) * 0.1 || 1;
                const minValue = dataMin - padding;
                const maxValue = dataMax + padding;

                return [0, 25, 50, 75, 100].map((tick) => {
                  const value = minValue + (tick / 100) * (maxValue - minValue);
                  const yPos = 98 - (tick * 0.96);

                  return (
                    <div
                      key={tick}
                      className="absolute left-0 pointer-events-none text-xs font-mono text-slate-700 font-bold bg-white px-2 py-1 rounded border border-slate-300"
                      style={{
                        top: `${yPos}%`,
                        transform: 'translate(-100%, -50%)',
                        marginLeft: '-8px'
                      }}
                    >
                      {value.toFixed(2)}
                    </div>
                  );
                });
              })()}

              {/* Точки данных */}
              {selectedMetrics.map((metricId, metricIdx) => {
                const metric = QUALITY_METRICS.find(m => m.id === metricId);
                if (!metric) return null;
                const color = COLORS[metricIdx % COLORS.length];

                const dataPoints = chartData
                  .map((point, idx) => ({ point, idx }))
                  .filter(({ point }) => point[metric.label] !== undefined && point[metric.label] !== null);

                if (dataPoints.length === 0) return null;

                const values = dataPoints.map(({ point }) => point[metric.label]);
                const dataMin = Math.min(...values);
                const dataMax = Math.max(...values);
                const padding = (dataMax - dataMin) * 0.1 || 1;
                const minValue = dataMin - padding;
                const maxValue = dataMax + padding;
                const valueRange = maxValue - minValue;

                return dataPoints.map(({ point, idx }, pointIdx) => {
                  const x = 2 + (pointIdx / Math.max(1, dataPoints.length - 1)) * 96;
                  const normalizedValue = valueRange !== 0 ? ((point[metric.label] - minValue) / valueRange) : 0.5;
                  const y = 2 + (1 - normalizedValue) * 96;

                  const showDate = pointIdx % Math.max(1, Math.floor(dataPoints.length / 10)) === 0;
                  const prevDate = pointIdx > 0 ? dataPoints[pointIdx - 1].point.date : '';
                  const isNewDate = point.date !== prevDate;

                  return (
                    <div
                      key={`${metricId}-${idx}`}
                      className="absolute group"
                      style={{
                        left: `${x}%`,
                        top: `${y}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                    >
                      <div
                        className="w-3 h-3 rounded-full cursor-pointer transition-all hover:scale-150 border-2 border-white shadow-lg"
                        style={{ backgroundColor: color }}
                      />

                      {/* Значение над точкой */}
                      <div
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none text-white text-xs font-bold px-2 py-1 rounded shadow-md whitespace-nowrap"
                        style={{ backgroundColor: color }}
                      >
                        {point[metric.label].toFixed(2)}
                      </div>

                      {/* Вертикальная линия при смене даты */}
                      {isNewDate && (
                        <div
                          className="absolute pointer-events-none"
                          style={{
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '2px',
                            height: '500px',
                            backgroundColor: '#ef4444',
                            opacity: 0.3,
                            zIndex: 1
                          }}
                        />
                      )}

                      {/* Метка даты */}
                      {(isNewDate || showDate) && (
                        <div
                          className={`absolute left-1/2 -translate-x-1/2 text-xs font-semibold font-mono whitespace-nowrap ${
                            isNewDate ? 'text-red-600 bg-white px-2 py-1 rounded border border-red-600' : 'text-slate-700'
                          }`}
                          style={{ top: '100%', marginTop: '8px' }}
                        >
                          {formatDate(point.date)}
                          {shiftFilter === 'all' && ` (${point.shift_type === 'day' ? 'Д' : 'Н'})`}
                        </div>
                      )}

                      {/* Tooltip */}
                      <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:block z-50">
                        <div
                          className="bg-white border-2 rounded-xl p-4 shadow-2xl whitespace-nowrap min-w-[220px]"
                          style={{ borderColor: color }}
                        >
                          <div className="text-sm text-slate-600 mb-2 font-semibold border-b border-slate-200 pb-2">
                            {formatDate(point.date)}
                            {shiftFilter === 'all' && ` (${point.shift_type === 'day' ? 'Дневная' : 'Ночная'})`}
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-600">{metric.label}:</span>
                            <span className="text-lg font-bold ml-3" style={{ color }}>
                              {point[metric.label].toFixed(2)} {metric.unit}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                });
              })}
            </div>
          </div>
        </div>
      )}

      {/* Ошибка */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">{error}</p>
        </div>
      )}

      {/* Пустое состояние */}
      {!loading && chartData.length === 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
          <svg className="w-16 h-16 mx-auto text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-slate-600 text-lg font-medium mb-2">Нет данных для отображения</p>
          <p className="text-slate-500">Выберите период, метрики и нажмите &quot;Загрузить данные&quot;</p>
        </div>
      )}

      {/* Полноэкранный режим */}
      {isFullscreen && chartData.length > 0 && selectedMetrics.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
          <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Сводный анализ</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm">Масштаб:</span>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={graphScale}
                  onChange={(e) => setGraphScale(parseFloat(e.target.value))}
                  className="w-32"
                />
                <span className="text-sm font-mono w-12">{(graphScale * 100).toFixed(0)}%</span>
              </div>
              <button
                onClick={() => {
                  setIsFullscreen(false);
                  setGraphScale(1);
                }}
                className="text-white hover:text-red-400 transition-colors"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-8 bg-slate-50">
            <div className="bg-white rounded-lg border border-slate-200 p-6 h-full">
              {/* Легенда */}
              <div className="flex flex-wrap gap-4 mb-4">
                {selectedMetrics.map((metricId, idx) => {
                  const metric = QUALITY_METRICS.find(m => m.id === metricId);
                  if (!metric) return null;
                  const color = COLORS[idx % COLORS.length];

                  return (
                    <div key={metricId} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }}></div>
                      <span className="text-base font-medium text-slate-700">
                        {metric.label} ({metric.unit})
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* График на весь экран - упрощенная версия */}
              <div className="text-center py-20 text-slate-500">
                <p className="text-lg">Полноэкранный график в разработке</p>
                <p className="text-sm mt-2">Используйте основной график с прокруткой</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

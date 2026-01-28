'use client';

import { useState, useEffect } from 'react';

type QuickPeriod = 'week' | 'month' | 'season' | 'custom';

interface QualityMetric {
  id: string;
  label: string;
  unit: string;
}

interface ChartDataPoint {
  date: string;
  time: string;
  [key: string]: any;
}

// Доступные качественные показатели
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
  const [quickPeriod, setQuickPeriod] = useState<QuickPeriod>('week');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [qualityData, setQualityData] = useState<any[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    applyQuickPeriod('week');
  }, []);

  const applyQuickPeriod = (period: QuickPeriod) => {
    const end = new Date();
    const start = new Date();

    if (period === 'week') start.setDate(start.getDate() - 7);
    else if (period === 'month') start.setDate(1);
    else if (period === 'season') start.setMonth(8, 1);

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    setQuickPeriod(period);
  };

  const loadData = async () => {
    if (!startDate || !endDate) return;
    setLoading(true);

    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        shift_type: 'all',
        analysis_type: 'all',
      });

      const response = await fetch(`/api/quality-analysis?${params}`);
      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      setQualityData(data.analyses || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (qualityData.length === 0 || selectedMetrics.length === 0) {
      setChartData([]);
      return;
    }

    const grouped: { [key: string]: ChartDataPoint } = {};

    qualityData.forEach((item) => {
      const key = `${item.shift_date}_${item.shift_type}`;

      if (!grouped[key]) {
        grouped[key] = {
          date: item.shift_date,
          time: item.sample_time,
          shift_type: item.shift_type,
        };
      }

      if (selectedMetrics.includes(item.analysis_type)) {
        const metricLabel = QUALITY_METRICS.find(m => m.id === item.analysis_type)?.label || item.analysis_type;
        if (!grouped[key][metricLabel]) grouped[key][metricLabel] = [];
        grouped[key][metricLabel].push(item.value);
      }
    });

    Object.values(grouped).forEach((point) => {
      selectedMetrics.forEach((metricId) => {
        const metricLabel = QUALITY_METRICS.find(m => m.id === metricId)?.label || metricId;
        if (point[metricLabel] && Array.isArray(point[metricLabel])) {
          const values = point[metricLabel];
          point[metricLabel] = values.reduce((sum: number, v: number) => sum + v, 0) / values.length;
        }
      });
    });

    setChartData(Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date)));
  }, [qualityData, selectedMetrics]);

  const graphWidth = Math.max(1400, chartData.length * 50);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h1 className="text-3xl font-bold text-slate-900">Сводный анализ</h1>
      </div>

      {/* Период */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Период</h2>

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Начало</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setQuickPeriod('custom');
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Конец</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setQuickPeriod('custom');
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg font-semibold"
        >
          {loading ? 'Загрузка...' : 'Загрузить'}
        </button>
      </div>

      {/* Выбор метрик */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Показатели</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {QUALITY_METRICS.map((metric, idx) => {
            const isSelected = selectedMetrics.includes(metric.id);
            const color = COLORS[idx % COLORS.length];

            return (
              <label
                key={metric.id}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${
                  isSelected ? 'bg-blue-50 border-blue-500' : 'bg-white border-slate-200'
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
                <span className="text-sm font-medium">{metric.label}</span>
                <span className="text-xs text-slate-500 ml-auto">({metric.unit})</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* График */}
      {chartData.length > 0 && selectedMetrics.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">График</h2>

          <div className="flex flex-wrap gap-4 mb-4">
            {selectedMetrics.map((metricId, idx) => {
              const metric = QUALITY_METRICS.find(m => m.id === metricId);
              if (!metric) return null;
              const color = COLORS[idx % COLORS.length];

              return (
                <div key={metricId} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                  <span className="text-sm font-medium">{metric.label}</span>
                </div>
              );
            })}
          </div>

          <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 overflow-x-auto">
            <div className="relative" style={{ width: `${graphWidth}px`, height: '500px', paddingTop: '30px', paddingBottom: '80px', paddingLeft: '60px' }}>
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <rect width="100" height="100" fill="#f8fafc" />

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
                      className="absolute left-0 text-xs font-mono text-slate-700 font-bold bg-white px-2 py-1 rounded border border-slate-300"
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

                      <div
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 text-white text-xs font-bold px-2 py-1 rounded shadow-md whitespace-nowrap"
                        style={{ backgroundColor: color }}
                      >
                        {point[metric.label].toFixed(2)}
                      </div>

                      <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:block z-50">
                        <div
                          className="bg-white border-2 rounded-xl p-4 shadow-2xl whitespace-nowrap"
                          style={{ borderColor: color }}
                        >
                          <div className="text-sm text-slate-600 mb-2 font-semibold">
                            {point.date}
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

      {!loading && chartData.length === 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
          <p className="text-slate-600">Выберите период, метрики и нажмите &quot;Загрузить&quot;</p>
        </div>
      )}
    </div>
  );
}

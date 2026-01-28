'use client';

import { useState, useEffect } from 'react';

interface Metric {
  id: string;
  label: string;
  unit: string;
  type: 'quality' | 'technical';
  source?: string;
}

interface ChartDataPoint {
  date: string;
  [key: string]: any;
}

// Качественные показатели
const QUALITY_METRICS: Metric[] = [
  { id: 'Топ 0 Влага,%', label: 'Топ 0 Влага', unit: '%', type: 'quality' },
  { id: 'Топ 0 Сор,%', label: 'Топ 0 Сор', unit: '%', type: 'quality' },
  { id: 'Топ 0 Масличность,%', label: 'Топ 0 Масличность', unit: '%', type: 'quality' },
  { id: 'РВО Масличность,%', label: 'РВО Масличность', unit: '%', type: 'quality' },
  { id: 'РВО Лузжистость,%', label: 'РВО Лузжистость', unit: '%', type: 'quality' },
  { id: 'Экстракция Жмых Масличность,%', label: 'Экстракция Жмых Масличность', unit: '%', type: 'quality' },
  { id: 'Экстракция Шрот масличность,%', label: 'Экстракция Шрот масличность', unit: '%', type: 'quality' },
  { id: 'Грануляция Влага,%', label: 'Грануляция Влага', unit: '%', type: 'quality' },
];

// Количественные показатели (технические)
const TECH_METRICS: Metric[] = [
  { id: 'Вакуум', label: 'Вакуум', unit: '', type: 'technical', source: 'Extractor_TechData_Job' },
  { id: 'Температура масла', label: 'Температура масла', unit: '°C', type: 'technical', source: 'Extractor_TechData_Job' },
  { id: 'Коэффициент Экстрактора', label: 'Коэффициент Экстрактора', unit: '', type: 'technical', source: 'Data_extractor_cooking' },
  { id: 'Температура Тостера', label: 'Температура Тостера', unit: '°C', type: 'technical', source: 'Data_extractor_cooking' },
];

const ALL_METRICS = [...QUALITY_METRICS, ...TECH_METRICS];
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#14b8a6', '#f97316', '#ec4899', '#84cc16'];

export default function ComparisonPage() {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(false);

  // Установка дат по умолчанию
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, []);

  // Автоматическая загрузка при изменении дат или метрик
  useEffect(() => {
    if (startDate && endDate && selectedMetrics.length > 0) {
      loadData();
    } else {
      setChartData([]);
    }
  }, [startDate, endDate, selectedMetrics]);

  const loadData = async () => {
    setLoading(true);

    try {
      const qualityMetrics = selectedMetrics.filter(id =>
        QUALITY_METRICS.some(m => m.id === id)
      );
      const techMetrics = selectedMetrics.filter(id =>
        TECH_METRICS.some(m => m.id === id)
      );

      const allData: ChartDataPoint[] = [];

      // Загружаем качественные данные
      if (qualityMetrics.length > 0) {
        const params = new URLSearchParams({
          start_date: startDate,
          end_date: endDate,
          shift_type: 'all',
          analysis_type: 'all',
        });

        const response = await fetch(`/api/quality-analysis?${params}`);
        if (response.ok) {
          const data = await response.json();
          const analyses = data.analyses || [];

          // Группируем по дате
          const grouped: { [key: string]: any } = {};

          analyses.forEach((item: any) => {
            if (!qualityMetrics.includes(item.analysis_type)) return;

            const key = item.shift_date;
            if (!grouped[key]) {
              grouped[key] = { date: key };
            }

            const metric = QUALITY_METRICS.find(m => m.id === item.analysis_type);
            if (metric) {
              if (!grouped[key][metric.label]) grouped[key][metric.label] = [];
              grouped[key][metric.label].push(item.value);
            }
          });

          // Вычисляем средние
          Object.values(grouped).forEach((point: any) => {
            qualityMetrics.forEach(metricId => {
              const metric = QUALITY_METRICS.find(m => m.id === metricId);
              if (metric && point[metric.label] && Array.isArray(point[metric.label])) {
                const values = point[metric.label];
                point[metric.label] = values.reduce((sum: number, v: number) => sum + v, 0) / values.length;
              }
            });
          });

          allData.push(...Object.values(grouped));
        }
      }

      setChartData(allData.sort((a, b) => a.date.localeCompare(b.date)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const graphWidth = Math.max(1400, chartData.length * 50);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h1 className="text-3xl font-bold text-slate-900">Сводный анализ</h1>
      </div>

      {/* Период и метрики в одной карточке */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">С</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">По</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Качественный анализ</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
            {QUALITY_METRICS.map((metric, idx) => {
              const isSelected = selectedMetrics.includes(metric.id);
              const color = COLORS[idx % COLORS.length];

              return (
                <label
                  key={metric.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                    isSelected ? 'bg-blue-50 border-blue-500' : 'border-slate-200'
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
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></div>
                  <span className="text-xs font-medium">{metric.label}</span>
                </label>
              );
            })}
          </div>

          <h3 className="text-sm font-bold text-slate-900 mb-3 mt-4">Количественный анализ</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            {TECH_METRICS.map((metric, idx) => {
              const isSelected = selectedMetrics.includes(metric.id);
              const colorIdx = QUALITY_METRICS.length + idx;
              const color = COLORS[colorIdx % COLORS.length];

              return (
                <label
                  key={metric.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                    isSelected ? 'bg-green-50 border-green-500' : 'border-slate-200'
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
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></div>
                  <span className="text-xs font-medium">{metric.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* График */}
      {loading && (
        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
          <div className="text-slate-600">Загрузка данных...</div>
        </div>
      )}

      {!loading && chartData.length > 0 && selectedMetrics.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex flex-wrap gap-3 mb-4">
            {selectedMetrics.map((metricId, idx) => {
              const metric = ALL_METRICS.find(m => m.id === metricId);
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
                  const metric = ALL_METRICS.find(m => m.id === metricId);
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
                const metric = ALL_METRICS.find(m => m.id === metricId);
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
                      {value.toFixed(1)}
                    </div>
                  );
                });
              })()}

              {selectedMetrics.map((metricId, metricIdx) => {
                const metric = ALL_METRICS.find(m => m.id === metricId);
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
                        {point[metric.label].toFixed(1)}
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
    </div>
  );
}

'use client';

import { useState } from 'react';

interface TechnicalChartProps {
  collections: string[];
  title: string;
  group: string | null;
  uniqueKey: string;
  techData: { [key: string]: any[] };
  techMetrics: { [key: string]: any[] };
  selectedMetrics: { [key: string]: string[] };
  onToggleMetric: (key: string, metricTitle: string) => void;
  onExport: (data: any[], filename: string, columns: any[]) => void;
  metricNorms: { [key: string]: number | [number, number] };
  getMetricsForGroup: (group: string | null, metrics: any[]) => any[];
  selectedDate: string;
}

export default function TechnicalChart({
  collections,
  title,
  group,
  uniqueKey,
  techData,
  techMetrics,
  selectedMetrics,
  onToggleMetric,
  onExport,
  metricNorms,
  getMetricsForGroup,
  selectedDate
}: TechnicalChartProps) {
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  // Объединяем данные из всех коллекций
  const allData = collections.flatMap(coll => techData[coll] || []);
  const allMetrics = collections.flatMap(coll => techMetrics[coll] || []);
  const metrics = getMetricsForGroup(group, allMetrics);

  const selected = selectedMetrics[uniqueKey] || [];
  const selectedMetricsData = metrics.filter((m: any) => selected.includes(m.title));

  // Если нет метрик
  if (metrics.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-2xl font-bold text-slate-900 mb-4">{title}</h3>
        <div className="text-center py-8 text-slate-500">
          Нет данных для этой коллекции
        </div>
      </div>
    );
  }

  // Вычисляем ширину графика: минимум 15px на точку
  const graphWidth = Math.max(1000, allData.length * 15);

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

  // Экспорт данных
  const handleExport = () => {
    const exportData = allData.map(d => {
      const row: any = { time: formatTime(d.time, false) };
      metrics.forEach((metric: any) => {
        const value = d[metric.title];
        row[metric.title] = value !== undefined && value !== null ? value : '';
      });
      return row;
    });

    const columns = [
      { key: 'time', label: 'Время' },
      ...metrics.map((m: any) => ({ key: m.title, label: `${m.title} (${m.unit})` }))
    ];

    onExport(exportData, `tech_${title}_${selectedDate}`, columns);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h3 className="text-2xl font-bold text-slate-900 mb-4">{title}</h3>

      {/* Выбор метрик */}
      <div className="mb-6 flex flex-wrap gap-3">
        {metrics.map((metric: any, idx: number) => {
          const isSelected = selected.includes(metric.title);
          const color = COLORS[idx % COLORS.length];

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
                onChange={() => onToggleMetric(uniqueKey, metric.title)}
                className="w-4 h-4"
                style={{ accentColor: color }}
              />
              <span className="text-sm font-medium text-slate-700">{metric.title}</span>
              <span className="text-xs text-slate-500 font-mono">({metric.unit})</span>
            </label>
          );
        })}
      </div>

      {/* График */}
      {selectedMetricsData.length > 0 && allData.length > 0 && (
        <div>
          {/* Легенда и экспорт */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-wrap gap-4">
              {selectedMetricsData.map((metric: any, idx: number) => {
                const metricIndex = metrics.findIndex((m: any) => m.title === metric.title);
                const color = COLORS[metricIndex % COLORS.length];

                return (
                  <div key={metric.title} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                    <span className="text-sm font-medium text-slate-700">
                      {metric.title} ({metric.unit})
                    </span>
                  </div>
                );
              })}
            </div>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm font-semibold">Экспорт</span>
            </button>
          </div>

          {/* Контейнер графика со скроллом */}
          <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 overflow-x-auto">
            <div className="relative" style={{ width: `${graphWidth}px`, height: '400px' }}>
              {/* SVG с графиком */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Сетка */}
                <defs>
                  <pattern id={`grid-${uniqueKey}`} width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e2e8f0" strokeWidth="0.3" />
                  </pattern>
                </defs>
                <rect width="100" height="100" fill={`url(#grid-${uniqueKey})`} />

                {/* Линии метрик */}
                {selectedMetricsData.map((metric: any) => {
                  const metricIndex = metrics.findIndex((m: any) => m.title === metric.title);
                  const color = COLORS[metricIndex % COLORS.length];

                  const metricData = allData.filter((d: any) => d[metric.title] !== undefined);
                  if (metricData.length === 0) return null;

                  const values = metricData.map((d: any) => d[metric.title]);
                  const dataMin = Math.min(...values);
                  const dataMax = Math.max(...values);

                  const padding = (dataMax - dataMin) * 0.1 || 1;
                  const minValue = dataMin - padding;
                  const maxValue = dataMax + padding;
                  const valueRange = maxValue - minValue;

                  // Создаем точки с margin 2%
                  const points = metricData.map((point: any, index: number) => {
                    const x = 2 + (index / Math.max(1, metricData.length - 1)) * 96;
                    const normalizedValue = valueRange !== 0 ? ((point[metric.title] - minValue) / valueRange) : 0.5;
                    const y = 98 - (normalizedValue * 96);
                    return { x, y, value: point[metric.title], time: point.time };
                  });

                  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

                  // Норма
                  const normValue = metricNorms[metric.title];
                  let normLines: JSX.Element[] = [];

                  if (normValue !== undefined && valueRange !== 0) {
                    if (Array.isArray(normValue)) {
                      const normMinY = 98 - ((normValue[0] - minValue) / valueRange) * 96;
                      const normMaxY = 98 - ((normValue[1] - minValue) / valueRange) * 96;
                      normLines.push(
                        <g key={`norm-range-${metric.title}`}>
                          <line x1="2" y1={normMinY} x2="98" y2={normMinY} stroke="#10b981" strokeWidth="2" strokeDasharray="4" opacity="0.7" vectorEffect="non-scaling-stroke" />
                          <line x1="2" y1={normMaxY} x2="98" y2={normMaxY} stroke="#10b981" strokeWidth="2" strokeDasharray="4" opacity="0.7" vectorEffect="non-scaling-stroke" />
                          <rect x="2" y={normMaxY} width="96" height={normMinY - normMaxY} fill="#10b981" opacity="0.1" />
                        </g>
                      );
                    } else {
                      const normY = 98 - ((normValue - minValue) / valueRange) * 96;
                      normLines.push(
                        <line key={`norm-${metric.title}`} x1="2" y1={normY} x2="98" y2={normY} stroke="#ef4444" strokeWidth="2" strokeDasharray="4" opacity="0.7" vectorEffect="non-scaling-stroke" />
                      );
                    }
                  }

                  return (
                    <g key={metric.title}>
                      {normLines}
                      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
                    </g>
                  );
                })}
              </svg>

              {/* Точки и tooltips как HTML элементы */}
              {selectedMetricsData.map((metric: any) => {
                const metricIndex = metrics.findIndex((m: any) => m.title === metric.title);
                const color = COLORS[metricIndex % COLORS.length];

                const metricData = allData.filter((d: any) => d[metric.title] !== undefined);
                if (metricData.length === 0) return null;

                const values = metricData.map((d: any) => d[metric.title]);
                const dataMin = Math.min(...values);
                const dataMax = Math.max(...values);

                const padding = (dataMax - dataMin) * 0.1 || 1;
                const minValue = dataMin - padding;
                const maxValue = dataMax + padding;
                const valueRange = maxValue - minValue;

                const points = metricData.map((point: any, index: number) => {
                  const x = 2 + (index / Math.max(1, metricData.length - 1)) * 96;
                  const normalizedValue = valueRange !== 0 ? ((point[metric.title] - minValue) / valueRange) : 0.5;
                  const y = 2 + (1 - normalizedValue) * 96;
                  return { x, y, value: point[metric.title], time: point.time };
                });

                // Показываем значения только для каждой N-ой точки
                const step = Math.max(1, Math.floor(points.length / 20));

                return points.map((p, index) => {
                  const showValue = index % step === 0;
                  const showTime = index % Math.max(1, Math.floor(points.length / 12)) === 0;

                  return (
                    <div
                      key={`${metric.title}-${index}`}
                      className="absolute group"
                      style={{
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                    >
                      {/* Точка */}
                      <div
                        className="w-3 h-3 rounded-full cursor-pointer transition-all hover:scale-150 border-2 border-white shadow-lg"
                        style={{ backgroundColor: color }}
                      />

                      {/* Значение над точкой */}
                      {showValue && (
                        <div
                          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none text-white text-xs font-bold px-2 py-1 rounded shadow-md whitespace-nowrap"
                          style={{ backgroundColor: color }}
                        >
                          {p.value?.toFixed(1)}
                        </div>
                      )}

                      {/* Время под точкой */}
                      {showTime && (
                        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-xs text-slate-500 font-mono -rotate-45 origin-top whitespace-nowrap">
                          {formatTime(p.time, true)}
                        </div>
                      )}

                      {/* Tooltip при наведении */}
                      <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:block z-50">
                        <div
                          className="bg-white border-2 rounded-xl p-4 shadow-2xl whitespace-nowrap min-w-[220px]"
                          style={{ borderColor: color }}
                        >
                          <div className="text-sm text-slate-600 mb-3 font-semibold border-b border-slate-200 pb-2">
                            {formatTime(p.time, false)}
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-600">{metric.title}:</span>
                            <span className="text-lg font-bold ml-3" style={{ color }}>
                              {p.value?.toFixed(2)} {metric.unit}
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

      {selectedMetricsData.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          Выберите метрики для отображения графика
        </div>
      )}
    </div>
  );
}

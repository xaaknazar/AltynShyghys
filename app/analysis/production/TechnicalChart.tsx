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

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [graphScale, setGraphScale] = useState(1);

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

  // Вычисляем ширину графика: минимум 20px на точку для большей читаемости
  const graphWidth = Math.max(1400, allData.length * 20);

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
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFullscreen(true)}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                <span className="text-sm font-semibold">Полный экран</span>
              </button>
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
          </div>

          {/* Контейнер графика со скроллом */}
          <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 overflow-x-auto">
            <div className="relative" style={{ width: `${graphWidth}px`, height: '500px', paddingTop: '30px', paddingBottom: '80px', paddingLeft: '60px' }}>
              {/* SVG с графиком */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Сетка */}
                <defs>
                  <pattern id={`grid-${uniqueKey}`} width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e2e8f0" strokeWidth="0.3" />
                  </pattern>
                </defs>
                <rect width="100" height="100" fill={`url(#grid-${uniqueKey})`} />

                {/* Горизонтальные линии-сетка */}
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

              {/* Метки на Y */}
              {selectedMetricsData.length > 0 && (() => {
                const metric = selectedMetricsData[0];
                const metricData = allData.filter((d: any) => d[metric.title] !== undefined);
                if (metricData.length === 0) return null;

                const values = metricData.map((d: any) => d[metric.title]);
                const dataMin = Math.min(...values);
                const dataMax = Math.max(...values);
                const padding = (dataMax - dataMin) * 0.1 || 1;
                const minValue = dataMin - padding;
                const maxValue = dataMax + padding;

                return (
                  <>
                    {/* Метки значений */}
                    {[0, 25, 50, 75, 100].map((tick) => {
                      const value = minValue + (tick / 100) * (maxValue - minValue);
                      const yPos = 98 - (tick * 0.96);

                      return (
                        <div
                          key={`y-label-${tick}`}
                          className="absolute left-0 pointer-events-none text-xs font-mono text-slate-700 font-bold bg-white px-2 py-1 rounded border border-slate-300"
                          style={{
                            top: `${yPos}%`,
                            transform: 'translate(-100%, -50%)',
                            marginLeft: '-8px'
                          }}
                        >
                          {value.toFixed(1)} {metric.unit}
                        </div>
                      );
                    })}
                  </>
                );
              })()}

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

                return points.map((p, index) => {
                  const showTime = index % Math.max(1, Math.floor(points.length / 10)) === 0;

                  // Проверяем, меняется ли дата
                  const currentDate = p.time.split(' ')[0];
                  const prevDate = index > 0 ? points[index - 1].time.split(' ')[0] : '';
                  const isNewDay = currentDate !== prevDate;

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

                      {/* Значение над точкой - ВСЕГДА показываем */}
                      <div
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none text-white text-xs font-bold px-2 py-1 rounded shadow-md whitespace-nowrap"
                        style={{ backgroundColor: color }}
                      >
                        {p.value?.toFixed(1)}
                      </div>

                      {/* Вертикальная линия при смене даты */}
                      {isNewDay && (
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

                      {/* Метка даты при смене дня */}
                      {isNewDay && (
                        <div className="absolute left-1/2 -translate-x-1/2 text-sm font-bold text-red-600 bg-white px-3 py-1 rounded border-2 border-red-600 shadow-lg whitespace-nowrap" style={{ top: '100%', marginTop: '8px' }}>
                          {formatTime(p.time, false)}
                        </div>
                      )}

                      {/* Метка времени */}
                      {showTime && !isNewDay && (
                        <div className="absolute left-1/2 -translate-x-1/2 text-xs text-slate-700 font-semibold font-mono whitespace-nowrap" style={{ top: '100%', marginTop: '8px' }}>
                          {p.time.split(' ')[1]}
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

      {/* Модальное окно с полноэкранным графиком */}
      {isFullscreen && selectedMetricsData.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
          {/* Заголовок и контролы */}
          <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold">{title}</h2>
            <div className="flex items-center gap-4">
              {/* Контроль масштаба */}
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
              {/* Кнопка закрыть */}
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

          {/* График на весь экран */}
          <div className="flex-1 overflow-auto p-8 bg-slate-50">
            <div className="bg-white rounded-lg border border-slate-200 p-6 h-full">
              {/* Легенда */}
              <div className="flex flex-wrap gap-4 mb-4">
                {selectedMetricsData.map((metric: any, idx: number) => {
                  const metricIndex = metrics.findIndex((m: any) => m.title === metric.title);
                  const color = COLORS[metricIndex % COLORS.length];

                  return (
                    <div key={metric.title} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }}></div>
                      <span className="text-base font-medium text-slate-700">
                        {metric.title} ({metric.unit})
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
                    width: `${graphWidth * graphScale}px`,
                    height: `${600 * graphScale}px`,
                    paddingTop: `${30 * graphScale}px`,
                    paddingBottom: `${80 * graphScale}px`,
                    paddingLeft: `${60 * graphScale}px`
                  }}
                >
                  {/* SVG с графиком */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                      <pattern id={`grid-fullscreen-${uniqueKey}`} width="10" height="10" patternUnits="userSpaceOnUse">
                        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e2e8f0" strokeWidth="0.3" />
                      </pattern>
                    </defs>
                    <rect width="100" height="100" fill={`url(#grid-fullscreen-${uniqueKey})`} />

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

                      const points = metricData.map((point: any, index: number) => {
                        const x = 2 + (index / Math.max(1, metricData.length - 1)) * 96;
                        const normalizedValue = valueRange !== 0 ? ((point[metric.title] - minValue) / valueRange) : 0.5;
                        const y = 98 - (normalizedValue * 96);
                        return { x, y, value: point[metric.title], time: point.time };
                      });

                      const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

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

                  {/* Метки Y */}
                  {(() => {
                    const metric = selectedMetricsData[0];
                    const metricData = allData.filter((d: any) => d[metric.title] !== undefined);
                    if (metricData.length === 0) return null;

                    const values = metricData.map((d: any) => d[metric.title]);
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
                          key={`y-label-fs-${tick}`}
                          className="absolute left-0 pointer-events-none text-sm font-mono text-slate-700 font-bold bg-white px-2 py-1 rounded border border-slate-300"
                          style={{
                            top: `${yPos}%`,
                            transform: 'translate(-100%, -50%)',
                            marginLeft: '-8px',
                            fontSize: `${12 * graphScale}px`
                          }}
                        >
                          {value.toFixed(1)} {metric.unit}
                        </div>
                      );
                    });
                  })()}

                  {/* Точки */}
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

                    return points.map((p, index) => {
                      const showTime = index % Math.max(1, Math.floor(points.length / 10)) === 0;
                      const currentDate = p.time.split(' ')[0];
                      const prevDate = index > 0 ? points[index - 1].time.split(' ')[0] : '';
                      const isNewDay = currentDate !== prevDate;

                      return (
                        <div
                          key={`${metric.title}-fs-${index}`}
                          className="absolute group"
                          style={{
                            left: `${p.x}%`,
                            top: `${p.y}%`,
                            transform: 'translate(-50%, -50%)'
                          }}
                        >
                          <div
                            className="rounded-full cursor-pointer transition-all hover:scale-150 border-2 border-white shadow-lg"
                            style={{
                              backgroundColor: color,
                              width: `${12 * graphScale}px`,
                              height: `${12 * graphScale}px`
                            }}
                          />

                          <div
                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none text-white font-bold px-2 py-1 rounded shadow-md whitespace-nowrap"
                            style={{
                              backgroundColor: color,
                              fontSize: `${12 * graphScale}px`
                            }}
                          >
                            {p.value?.toFixed(1)}
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
                                  height: `${600 * graphScale}px`,
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
                                  fontSize: `${14 * graphScale}px`
                                }}
                              >
                                {formatTime(p.time, false)}
                              </div>
                            </>
                          )}

                          {showTime && !isNewDay && (
                            <div
                              className="absolute left-1/2 -translate-x-1/2 text-slate-700 font-semibold font-mono whitespace-nowrap"
                              style={{
                                top: '100%',
                                marginTop: '8px',
                                fontSize: `${12 * graphScale}px`
                              }}
                            >
                              {p.time.split(' ')[1]}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

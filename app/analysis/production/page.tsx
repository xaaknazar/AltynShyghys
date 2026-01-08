'use client';

import { useState, useEffect } from 'react';

type QuickPeriod = 'week' | 'month' | 'custom';
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

  const techCollections = [
    { name: 'Extractor_TechData_Job', title: 'Экстрактор - Технические данные' },
    { name: 'Press_1_Job', title: 'Пресс 1' },
    { name: 'Press_2_Job', title: 'Пресс 2' },
    { name: 'Press_Extractor_Job', title: 'Экстрактор пресса' },
    { name: 'Press_Jarovnia_Mezga', title: 'Жаровня и Мезга' },
  ];

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

  const renderTechnicalChart = (collectionName: string, title: string) => {
    const data = techData[collectionName] || [];
    const metrics = techMetrics[collectionName] || [];

    if (data.length === 0 || metrics.length === 0) {
      return null;
    }

    return (
      <div key={collectionName} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-display font-bold text-slate-700 mb-4">{title}</h3>

        {metrics.map((metric: any, metricIndex: number) => {
          const metricData = data.filter((d: any) => d[metric.title] !== undefined);

          if (metricData.length === 0) return null;

          const maxValue = Math.max(...metricData.map((d: any) => d[metric.title] || 0), 1) * 1.2;
          const minValue = Math.min(...metricData.map((d: any) => d[metric.title] || 0), 0) * (maxValue > 0 ? 0.8 : 1.2);
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

          return (
            <div key={metric.title} className="mb-8 last:mb-0">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-base font-semibold text-slate-700">
                  {metric.title}
                </h4>
                <span className="text-sm text-slate-600 font-mono">{metric.unit}</span>
              </div>

              <div className="relative bg-slate-50 rounded-lg p-6 border border-slate-200">
                <div className="relative h-64 overflow-x-auto">
                  {/* SVG для линии */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path
                      d={linePath}
                      fill="none"
                      stroke={color}
                      strokeWidth="0.5"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>

                  {/* Точки */}
                  {points.map((p: any, index: number) => (
                    <div
                      key={index}
                      className="absolute group"
                      style={{
                        left: `${p.x}%`,
                        bottom: `${100 - p.y}%`,
                        transform: 'translate(-50%, 50%)'
                      }}
                    >
                      <div
                        className="w-2 h-2 rounded-full cursor-pointer transition-all duration-200 hover:scale-150"
                        style={{ backgroundColor: color }}
                      ></div>

                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                        <div className="bg-white border border-slate-300 rounded-lg p-3 shadow-xl whitespace-nowrap">
                          <div className="text-xs text-slate-600 mb-1 font-mono">
                            {p.point.time}
                          </div>
                          <div className="text-base font-bold" style={{ color }}>
                            {p.value?.toFixed(2)} {metric.unit}
                          </div>
                        </div>
                      </div>

                      {index % Math.max(1, Math.floor(metricData.length / 10)) === 0 && (
                        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-xs text-slate-500 font-mono -rotate-45 origin-top whitespace-nowrap">
                          {p.point.time}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Фильтры */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-display font-bold text-slate-700 mb-4">ФИЛЬТРЫ</h3>

        {/* Переключатель режима просмотра */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => setViewMode('daily')}
            className={`px-4 py-2 rounded-lg border-2 transition-all ${
              viewMode === 'daily'
                ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-semibold'
                : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300'
            }`}
          >
            По суткам
          </button>
          <button
            onClick={() => setViewMode('detailed')}
            className={`px-4 py-2 rounded-lg border-2 transition-all ${
              viewMode === 'detailed'
                ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-semibold'
                : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300'
            }`}
          >
            Детально (30 мин)
          </button>
        </div>

        {viewMode === 'daily' && (
          <>
            {/* Быстрые кнопки */}
            <div className="flex flex-wrap gap-3 mb-6">
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
            <h3 className="text-lg font-display text-blue-600 mb-6">
              ДИНАМИКА ПРОИЗВОДСТВА
            </h3>

            <div className="relative bg-slate-50 rounded-lg p-6 border border-slate-200">
              <div className="relative h-80 overflow-x-auto">
                {(() => {
                  const maxValue = Math.max(...productionData.map(d => d.total), 120) * 1.2;
                  const points = productionData.map((point, index) => {
                    const x = (index / (productionData.length - 1 || 1)) * 100;
                    const y = 100 - Math.max((point.total / maxValue) * 100, 0);
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
                          <div className="w-3 h-3 rounded-full bg-blue-600 cursor-pointer transition-all duration-200 hover:scale-150"></div>

                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                            <div className="bg-white border border-slate-300 rounded-lg p-3 shadow-xl whitespace-nowrap">
                              <div className="text-xs text-slate-600 mb-1 font-mono">
                                {p.point.date}
                              </div>
                              <div className="text-base font-bold text-blue-600">
                                {p.point.total?.toFixed(2)} т
                              </div>
                            </div>
                          </div>

                          {index % Math.max(1, Math.floor(productionData.length / 10)) === 0 && (
                            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-xs text-slate-500 font-mono -rotate-45 origin-top whitespace-nowrap">
                              {new Date(p.point.date).toLocaleDateString('ru-RU', {
                                day: '2-digit',
                                month: '2-digit',
                              })}
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
                <h2 className="text-2xl font-display font-bold text-slate-700 mb-6">
                  ТЕХНИЧЕСКИЕ ПАРАМЕТРЫ ОБОРУДОВАНИЯ
                </h2>
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
    </div>
  );
}

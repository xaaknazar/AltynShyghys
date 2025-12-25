'use client';

import { useState, useEffect } from 'react';

type QuickPeriod = 'week' | 'month' | 'custom';

export default function ProductionAnalysisPage() {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [shiftFilter, setShiftFilter] = useState<'all' | 'day' | 'night'>('all');
  const [productionData, setProductionData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [quickPeriod, setQuickPeriod] = useState<QuickPeriod>('week');

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
      fetchProductionData();
    }
  }, [startDate, endDate, shiftFilter]);

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

  const totalProduction = productionData.reduce((sum, item) => sum + (item.total || 0), 0);
  const averageDaily = productionData.length > 0 ? totalProduction / productionData.length : 0;

  return (
    <div className="space-y-8">
      {/* Фильтры */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-display font-bold text-slate-700 mb-4">ФИЛЬТРЫ</h3>

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
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="text-2xl text-slate-700 font-display">Загрузка данных...</div>
        </div>
      ) : productionData.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="text-slate-700 text-lg mb-2">Нет данных за выбранный период</div>
          <div className="text-slate-600 text-sm">Измените фильтры или добавьте новые данные</div>
        </div>
      ) : (
        <div className="space-y-8">
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
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { ANALYSIS_CONFIG, type AnalysisType } from '@/lib/quality-types';

export default function OverviewPage() {
  const [currentDate, setCurrentDate] = useState<string>('');
  const [productionData, setProductionData] = useState<any>(null);
  const [qualityData, setQualityData] = useState<any[]>([]);
  const [shiftEvents, setShiftEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch data without specifying date to get last completed production day
    fetchDataInitial();
  }, []);

  const fetchDataInitial = async () => {
    setLoading(true);
    try {
      // Fetch production data without date to get last completed day
      const prodResponse = await fetch(`/api/production/current`, { cache: 'no-store' });
      const prodData = await prodResponse.json();

      if (prodData.success && prodData.date) {
        const lastCompletedDate = prodData.date;
        setCurrentDate(lastCompletedDate);

        // Fetch quality analyses for that date
        const qualityResponse = await fetch(`/api/quality-analysis?shift_date=${lastCompletedDate}`, { cache: 'no-store' });
        const qualityDataResult = await qualityResponse.json();

        // Fetch shift events for that date
        const eventsResponse = await fetch(`/api/shift-logs?shift_date=${lastCompletedDate}`, { cache: 'no-store' });
        const eventsData = await eventsResponse.json();

        setProductionData(prodData);
        setQualityData(qualityDataResult.analyses || []);
        setShiftEvents(eventsData.logs || []);
      }
    } catch (error) {
      console.error('Error fetching overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async (date: string) => {
    setLoading(true);
    try {
      // Fetch production data
      const prodResponse = await fetch(`/api/production/current?date=${date}`, { cache: 'no-store' });
      const prodData = await prodResponse.json();

      // Fetch quality analyses
      const qualityResponse = await fetch(`/api/quality-analysis?shift_date=${date}`, { cache: 'no-store' });
      const qualityDataResult = await qualityResponse.json();

      // Fetch shift events
      const eventsResponse = await fetch(`/api/shift-logs?shift_date=${date}`, { cache: 'no-store' });
      const eventsData = await eventsResponse.json();

      setProductionData(prodData);
      setQualityData(qualityDataResult.analyses || []);
      setShiftEvents(eventsData.logs || []);
    } catch (error) {
      console.error('Error fetching overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (newDate: string) => {
    setCurrentDate(newDate);
    fetchData(newDate);
  };

  return (
    <div className="space-y-8">
      {/* Выбор даты */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-display font-bold text-slate-700">ИТОГИ СУТОК</h3>
          <input
            type="date"
            value={currentDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="text-2xl text-slate-700 font-display">Загрузка данных...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Количественный анализ (производство) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-xl font-display font-bold text-blue-600 mb-6">
              КОЛИЧЕСТВЕННЫЙ АНАЛИЗ
            </h3>
            {productionData && productionData.success ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <span className="text-sm font-semibold text-slate-700">Общее производство</span>
                  <span className="text-2xl font-display font-bold text-blue-600">
                    {productionData.totalProduction?.toFixed(2) || '0.00'} т
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-xs text-slate-600 mb-1">Дневная смена</div>
                    <div className="text-lg font-mono font-bold text-slate-800">
                      {productionData.dayShift?.toFixed(2) || '0.00'} т
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-xs text-slate-600 mb-1">Ночная смена</div>
                    <div className="text-lg font-mono font-bold text-slate-800">
                      {productionData.nightShift?.toFixed(2) || '0.00'} т
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="text-xs text-emerald-700 mb-1">Процент выполнения плана</div>
                  <div className="text-2xl font-display font-bold text-emerald-600">
                    {productionData.planPercentage?.toFixed(1) || '0.0'}%
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-600">
                Нет данных о производстве за эту дату
              </div>
            )}
          </div>

          {/* Качественный анализ */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-xl font-display font-bold text-blue-600 mb-6">
              КАЧЕСТВЕННЫЙ АНАЛИЗ
            </h3>
            {qualityData.length > 0 ? (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {(() => {
                  // Группировка по типам анализов и расчет средних
                  const grouped: Record<string, { values: number[]; count: number }> = {};

                  qualityData.forEach((analysis) => {
                    const type = analysis.analysis_type;
                    if (!grouped[type]) {
                      grouped[type] = { values: [], count: 0 };
                    }
                    grouped[type].values.push(analysis.value);
                    grouped[type].count++;
                  });

                  // Расчет средних значений
                  const averages = Object.entries(grouped).map(([type, data]) => {
                    const average = data.values.reduce((sum, v) => sum + v, 0) / data.count;
                    const config = ANALYSIS_CONFIG[type as AnalysisType];
                    return {
                      type: type as AnalysisType,
                      average: average,
                      count: data.count,
                      label: config?.label || type,
                      unit: config?.unit || '',
                    };
                  });

                  // Сортировка по типу анализа
                  averages.sort((a, b) => a.label.localeCompare(b.label, 'ru'));

                  return averages.map((item, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-slate-700">{item.label}</div>
                          <div className="text-xs text-slate-500 mt-1">Среднее за сутки ({item.count} измер.)</div>
                        </div>
                        <div className="text-lg font-mono font-bold text-blue-600">
                          {item.average.toFixed(2)} {item.unit}
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-600">
                Нет данных качественного анализа за эту дату
              </div>
            )}
          </div>
        </div>
      )}

      {/* Shift Events Section */}
      {!loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-xl font-display font-bold text-blue-600 mb-6">
            ПРОИСШЕСТВИЯ ЗА СУТКИ
          </h3>
          {shiftEvents.length > 0 ? (
            <div className="space-y-4">
              {shiftEvents.map((event) => {
                const eventTypeLabels: Record<string, string> = {
                  production_issue: 'Проблема производства',
                  equipment_failure: 'Поломка оборудования',
                  material_shortage: 'Недостаток материалов',
                  maintenance: 'Техническое обслуживание',
                  quality_issue: 'Проблема качества',
                  speed_change: 'Изменение скорости',
                  other: 'Другое',
                };

                const eventTypeColors: Record<string, string> = {
                  production_issue: 'border-orange-200 bg-orange-50',
                  equipment_failure: 'border-red-200 bg-red-50',
                  material_shortage: 'border-yellow-200 bg-yellow-50',
                  maintenance: 'border-blue-200 bg-blue-50',
                  quality_issue: 'border-purple-200 bg-purple-50',
                  speed_change: 'border-cyan-200 bg-cyan-50',
                  other: 'border-slate-200 bg-slate-50',
                };

                return (
                  <div
                    key={event.id}
                    className={`p-4 rounded-xl border-2 ${eventTypeColors[event.event_type] || 'border-slate-200 bg-slate-50'}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`px-3 py-1 rounded-lg text-xs font-bold ${
                          event.shift_type === 'day'
                            ? 'bg-amber-100 text-amber-700 border border-amber-300'
                            : 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                        }`}>
                          {event.shift_type === 'day' ? 'Дневная смена' : 'Ночная смена'}
                        </div>
                        <div className="px-3 py-1 rounded-lg text-xs font-bold bg-white border-2 border-slate-300 text-slate-700">
                          {eventTypeLabels[event.event_type] || event.event_type}
                        </div>
                      </div>
                      <div className="text-sm text-slate-600 font-mono">
                        {new Date(event.event_time).toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>

                    {event.workshop && (
                      <div className="text-sm text-slate-600 mb-2">
                        <span className="font-semibold">Цех:</span> {event.workshop}
                      </div>
                    )}

                    <div className="mb-3">
                      <div className="text-sm font-semibold text-slate-700 mb-1">Описание:</div>
                      <div className="text-sm text-slate-800 bg-white rounded-lg p-3 border border-slate-200">
                        {event.description}
                      </div>
                    </div>

                    {event.actions_taken && (
                      <div className="mb-3">
                        <div className="text-sm font-semibold text-slate-700 mb-1">Принятые меры:</div>
                        <div className="text-sm text-slate-800 bg-white rounded-lg p-3 border border-slate-200">
                          {event.actions_taken}
                        </div>
                      </div>
                    )}

                    {(event.speed_before !== null || event.speed_after !== null) && (
                      <div className="flex items-center gap-4 text-sm">
                        {event.speed_before !== null && (
                          <div>
                            <span className="font-semibold text-slate-700">Скорость до:</span>{' '}
                            <span className="font-mono text-slate-800">{event.speed_before} т/ч</span>
                          </div>
                        )}
                        {event.speed_after !== null && (
                          <div>
                            <span className="font-semibold text-slate-700">Скорость после:</span>{' '}
                            <span className="font-mono text-slate-800">{event.speed_after} т/ч</span>
                          </div>
                        )}
                      </div>
                    )}

                    {event.master_name && (
                      <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-600">
                        <span className="font-semibold">Мастер смены:</span> {event.master_name}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-600">
              Происшествий за эти сутки не зафиксировано
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
        const qualityResponse = await fetch(`/api/quality-analysis?start_date=${lastCompletedDate}&end_date=${lastCompletedDate}`, { cache: 'no-store' });
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
      const qualityResponse = await fetch(`/api/quality-analysis?start_date=${date}&end_date=${date}`, { cache: 'no-store' });
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
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <h3 className="text-base sm:text-lg font-display font-bold text-slate-700">ИТОГИ СУТОК</h3>
          <input
            type="date"
            value={currentDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="text-2xl text-slate-700 font-display">Загрузка данных...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
          {/* Количественный анализ (производство) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
            <h3 className="text-lg sm:text-xl font-display font-bold text-blue-600 mb-4 sm:mb-6">
              КОЛИЧЕСТВЕННЫЙ АНАЛИЗ
            </h3>
            {productionData && productionData.success ? (
              <div className="space-y-3 sm:space-y-4">
                <div className="flex justify-between items-center p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <span className="text-xs sm:text-sm font-semibold text-slate-700">Общее производство</span>
                  <span className="text-lg sm:text-2xl font-display font-bold text-blue-600">
                    {productionData.totalProduction?.toFixed(2) || '0.00'} т
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="p-3 sm:p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-xs text-slate-600 mb-1">Дневная смена</div>
                    <div className="text-base sm:text-lg font-mono font-bold text-slate-800">
                      {productionData.dayShift?.toFixed(2) || '0.00'} т
                    </div>
                  </div>
                  <div className="p-3 sm:p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-xs text-slate-600 mb-1">Ночная смена</div>
                    <div className="text-base sm:text-lg font-mono font-bold text-slate-800">
                      {productionData.nightShift?.toFixed(2) || '0.00'} т
                    </div>
                  </div>
                </div>
                <div className="p-3 sm:p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="text-xs text-emerald-700 mb-1">Процент выполнения плана</div>
                  <div className="text-lg sm:text-2xl font-display font-bold text-emerald-600">
                    {productionData.planPercentage?.toFixed(1) || '0.0'}%
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-sm sm:text-base text-slate-600">
                Нет данных о производстве за эту дату
              </div>
            )}
          </div>

          {/* Качественный анализ */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
            <h3 className="text-lg sm:text-xl font-display font-bold text-blue-600 mb-4 sm:mb-6">
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
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
          <h3 className="text-lg sm:text-xl font-display font-bold text-blue-600 mb-4 sm:mb-6">
            ПРОИСШЕСТВИЯ ЗА СУТКИ
          </h3>
          {shiftEvents.length > 0 ? (
            <div className="space-y-4">
              {shiftEvents.map((event) => {
                const eventTypeLabels: Record<string, string> = {
                  reduction: 'Снижение',
                  stoppage: 'Остановка',
                  production_issue: 'Проблема производства',
                  equipment_failure: 'Поломка оборудования',
                  material_shortage: 'Недостаток материалов',
                  maintenance: 'Техническое обслуживание',
                  quality_issue: 'Проблема качества',
                  speed_change: 'Изменение скорости',
                  other: 'Другое',
                };

                const eventTypeColors: Record<string, string> = {
                  reduction: 'border-amber-300 bg-amber-50',
                  stoppage: 'border-red-300 bg-red-50',
                  production_issue: 'border-orange-200 bg-orange-50',
                  equipment_failure: 'border-red-200 bg-red-50',
                  material_shortage: 'border-yellow-200 bg-yellow-50',
                  maintenance: 'border-blue-200 bg-blue-50',
                  quality_issue: 'border-purple-200 bg-purple-50',
                  speed_change: 'border-cyan-200 bg-cyan-50',
                  other: 'border-slate-200 bg-slate-50',
                };

                const startTime = event.start_time || event.event_time;
                const endTime = event.end_time;

                // Расчет длительности
                let duration = null;
                if (startTime && endTime) {
                  const start = new Date(startTime);
                  const end = new Date(endTime);
                  const diffMs = end.getTime() - start.getTime();
                  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                  duration = `${diffHours}ч ${diffMinutes}м`;
                }

                return (
                  <div
                    key={event.id}
                    className={`p-4 rounded-xl border-2 ${eventTypeColors[event.event_type] || 'border-slate-200 bg-slate-50'}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className={`px-3 py-1 rounded-lg text-xs font-bold ${
                          event.shift_type === 'day'
                            ? 'bg-amber-100 text-amber-700 border border-amber-300'
                            : 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                        }`}>
                          {event.shift_type === 'day' ? 'Дневная смена' : 'Ночная смена'}
                        </div>
                        <div className={`px-3 py-1 rounded-lg text-xs font-bold border-2 ${
                          event.event_type === 'reduction'
                            ? 'bg-amber-100 text-amber-800 border-amber-400'
                            : event.event_type === 'stoppage'
                            ? 'bg-red-100 text-red-800 border-red-400'
                            : 'bg-white border-slate-300 text-slate-700'
                        }`}>
                          {eventTypeLabels[event.event_type] || event.event_type}
                        </div>
                        {event.workshop && (
                          <div className="px-3 py-1 rounded-lg text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
                            {event.workshop}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Время начала и окончания */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-white rounded-lg p-3 border border-slate-200">
                        <div className="text-xs text-slate-600 mb-1">Время начала</div>
                        <div className="text-sm font-mono font-semibold text-slate-800">
                          {new Date(startTime).toLocaleString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                      <div className={`rounded-lg p-3 border ${
                        endTime ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="text-xs text-slate-600 mb-1">Время окончания</div>
                        <div className="text-sm font-mono font-semibold text-slate-800">
                          {endTime
                            ? new Date(endTime).toLocaleString('ru-RU', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Не восстановлено'
                          }
                        </div>
                      </div>
                    </div>

                    {/* Длительность */}
                    {duration && (
                      <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <span className="text-sm font-semibold text-blue-800">
                          Длительность: {duration}
                        </span>
                      </div>
                    )}

                    {/* Скорость снижения (для reduction) */}
                    {event.event_type === 'reduction' && event.reduced_speed !== null && (
                      <div className="mb-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <span className="text-sm font-semibold text-amber-800">
                          Снижена до: {event.reduced_speed} т/ч
                        </span>
                      </div>
                    )}

                    {/* Причина */}
                    <div className="mb-3">
                      <div className="text-sm font-semibold text-slate-700 mb-1">Причина:</div>
                      <div className="text-sm text-slate-800 bg-white rounded-lg p-3 border border-slate-200">
                        {event.description}
                      </div>
                    </div>

                    {/* Принятые меры (если есть) */}
                    {event.actions_taken && (
                      <div className="mb-3">
                        <div className="text-sm font-semibold text-slate-700 mb-1">Принятые меры:</div>
                        <div className="text-sm text-slate-800 bg-white rounded-lg p-3 border border-slate-200">
                          {event.actions_taken}
                        </div>
                      </div>
                    )}

                    {/* ФИО мастера */}
                    {event.master_name && (
                      <div className="pt-3 border-t border-slate-200 text-sm">
                        <span className="font-semibold text-slate-700">Мастер смены:</span>{' '}
                        <span className="text-slate-800">{event.master_name}</span>
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

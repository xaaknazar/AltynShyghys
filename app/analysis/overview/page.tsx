'use client';

import { useState, useEffect } from 'react';
import { getCurrentShift } from '@/lib/quality-types';

export default function OverviewPage() {
  const [currentDate, setCurrentDate] = useState<string>('');
  const [productionData, setProductionData] = useState<any>(null);
  const [qualityData, setQualityData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const shift = getCurrentShift();
    setCurrentDate(shift.date);
    fetchData(shift.date);
  }, []);

  const fetchData = async (date: string) => {
    setLoading(true);
    try {
      // Fetch production data
      const prodResponse = await fetch(`/api/production/current?date=${date}`, { cache: 'no-store' });
      const prodData = await prodResponse.json();

      // Fetch quality analyses
      const qualityResponse = await fetch(`/api/quality-analysis?shift_date=${date}`, { cache: 'no-store' });
      const qualityDataResult = await qualityResponse.json();

      setProductionData(prodData);
      setQualityData(qualityDataResult.analyses || []);
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
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-slate-700">Всего анализов</span>
                    <span className="text-2xl font-display font-bold text-blue-600">
                      {qualityData.length}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-xs text-slate-600 mb-1">Дневная смена</div>
                    <div className="text-lg font-mono font-bold text-slate-800">
                      {qualityData.filter(a => a.shift_type === 'day').length}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-xs text-slate-600 mb-1">Ночная смена</div>
                    <div className="text-lg font-mono font-bold text-slate-800">
                      {qualityData.filter(a => a.shift_type === 'night').length}
                    </div>
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  <div className="text-xs font-semibold text-slate-600 mb-2">Последние анализы:</div>
                  {qualityData.slice(0, 5).map((analysis, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex justify-between items-start">
                        <div className="text-sm text-slate-700 flex-1">
                          {analysis.analysis_type}
                        </div>
                        <div className="text-xs text-slate-600">
                          {new Date(analysis.sample_time).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-600">
                Нет данных качественного анализа за эту дату
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

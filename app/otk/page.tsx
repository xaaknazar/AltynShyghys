'use client';

import { useState, useEffect } from 'react';
import { ANALYSIS_TYPES, ANALYSIS_CONFIG, getCurrentShift, getAnalysisStatus, AnalysisType, ShiftType } from '@/lib/quality-types';

export default function OTKAddPage() {
  const [selectedType, setSelectedType] = useState<AnalysisType>(ANALYSIS_TYPES.MOISTURE_ROASTER_1);
  const [value, setValue] = useState<string>('');
  const [technicianName, setTechnicianName] = useState<string>('');
  const [comments, setComments] = useState<string>('');
  const [sampleTime, setSampleTime] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    // Установка текущего времени
    const now = new Date();
    const localTime = new Date(now.getTime() + 5 * 60 * 60 * 1000); // UTC+5
    setSampleTime(localTime.toISOString().slice(0, 16));
  }, []);

  // Функция для определения смены из времени отбора
  const getShiftFromSampleTime = (sampleTimeStr: string): { date: string; type: ShiftType } => {
    const sampleDate = new Date(sampleTimeStr);
    const localTime = new Date(sampleDate.getTime() + 5 * 60 * 60 * 1000); // UTC+5
    const hour = localTime.getUTCHours();

    // Дневная смена: 08:00-20:00, Ночная смена: 20:00-08:00
    const isDayShift = hour >= 8 && hour < 20;
    const shiftType: ShiftType = isDayShift ? 'day' : 'night';

    // Дата смены
    const shiftDate = new Date(localTime);
    if (hour < 8) {
      // Если до 8 утра, это ночная смена предыдущего дня
      shiftDate.setUTCDate(shiftDate.getUTCDate() - 1);
    }

    return {
      date: shiftDate.toISOString().split('T')[0],
      type: shiftType,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < 0) {
        setMessage({ type: 'error', text: 'Введите корректное значение' });
        setSubmitting(false);
        return;
      }

      // Автоматически определяем смену из времени отбора
      const shift = getShiftFromSampleTime(sampleTime);

      const response = await fetch('/api/quality-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shift_date: shift.date,
          shift_type: shift.type,
          sample_time: sampleTime,
          analysis_type: selectedType,
          value: numValue,
          technician_name: technicianName || null,
          comments: comments || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Анализ успешно сохранен!' });
        setValue('');
        setComments('');

        // Обновление времени для следующего анализа
        const now = new Date();
        const localTime = new Date(now.getTime() + 5 * 60 * 60 * 1000);
        setSampleTime(localTime.toISOString().slice(0, 16));
      } else {
        setMessage({ type: 'error', text: data.error || 'Ошибка при сохранении' });
      }
    } catch (error) {
      console.error('Error submitting analysis:', error);
      setMessage({ type: 'error', text: 'Ошибка при отправке данных' });
    } finally {
      setSubmitting(false);
    }
  };

  const config = ANALYSIS_CONFIG[selectedType];
  const numValue = parseFloat(value);
  const status = !isNaN(numValue) ? getAnalysisStatus(selectedType, numValue) : null;

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Время отбора пробы */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div>
              <label className="block text-xs text-slate-600 mb-2">Время отбора пробы</label>
              <input
                type="datetime-local"
                value={sampleTime}
                onChange={(e) => setSampleTime(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono text-sm focus:border-blue-500 focus:outline-none"
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                Смена определяется автоматически из времени отбора
              </p>
            </div>
          </div>

          {/* Тип анализа */}
          <div>
            <label className="block text-sm text-slate-800 mb-3 font-semibold">Тип анализа</label>

            {/* Поиск */}
            <div className="relative mb-3">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Поиск анализа..."
                className="w-full px-4 py-2 pl-10 bg-white border border-slate-300 rounded-lg text-slate-800 text-sm focus:border-blue-500 focus:outline-none"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto bg-slate-50 rounded-lg p-3 border border-slate-200">
              {(() => {
                // Группируем типы анализов по категориям
                const categories = [
                  { name: 'Входящее сырье', types: [ANALYSIS_TYPES.MOISTURE_RAW_MATERIAL, ANALYSIS_TYPES.OIL_CONTENT_RAW_MATERIAL] },
                  { name: 'Лузга', types: [ANALYSIS_TYPES.MOISTURE_HUSK, ANALYSIS_TYPES.FAT_HUSK, ANALYSIS_TYPES.KERNEL_LOSS_HUSK] },
                  { name: 'Рушанка', types: [ANALYSIS_TYPES.MOISTURE_CRUSHED, ANALYSIS_TYPES.HUSK_CONTENT_CRUSHED] },
                  { name: 'Мезга с жаровни', types: [ANALYSIS_TYPES.MOISTURE_ROASTER_1, ANALYSIS_TYPES.MOISTURE_ROASTER_2] },
                  { name: 'Жмых с пресса', types: [ANALYSIS_TYPES.MOISTURE_PRESS_1, ANALYSIS_TYPES.MOISTURE_PRESS_2, ANALYSIS_TYPES.FAT_PRESS_1, ANALYSIS_TYPES.FAT_PRESS_2] },
                  { name: 'Шрот', types: [ANALYSIS_TYPES.MOISTURE_TOASTED_MEAL, ANALYSIS_TYPES.OIL_CONTENT_MEAL] },
                  { name: 'Мисцелла', types: [ANALYSIS_TYPES.MISCELLA_CONCENTRATION] },
                ];

                // Фильтруем типы анализов по поисковому запросу
                const filteredCategories = categories.map(category => ({
                  ...category,
                  types: category.types.filter(type => {
                    const conf = ANALYSIS_CONFIG[type];
                    return conf.label.toLowerCase().includes(searchTerm.toLowerCase());
                  })
                })).filter(category => category.types.length > 0);

                if (filteredCategories.length === 0) {
                  return (
                    <div className="text-center py-8 text-slate-500">
                      Ничего не найдено
                    </div>
                  );
                }

                return filteredCategories.map((category, idx) => (
                  <div key={idx}>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">
                      {category.name}
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {category.types.map(type => {
                        const conf = ANALYSIS_CONFIG[type];
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => {
                              setSelectedType(type);
                              setSearchTerm('');
                            }}
                            className={`p-3 rounded-lg border-2 transition-all text-left ${
                              selectedType === type
                                ? 'border-blue-500 bg-blue-50 shadow-md'
                                : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-slate-800">{conf.label}</span>
                              {selectedType === type && (
                                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Значение */}
          <div>
            <label className="block text-sm text-slate-800 mb-2 font-semibold">
              Значение ({config.unit})
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className={`w-full px-4 py-3 bg-white border-2 rounded-lg text-slate-800 font-mono text-lg focus:outline-none ${
                  status === 'normal' ? 'border-emerald-500' :
                  status === 'warning' ? 'border-amber-500' :
                  status === 'danger' ? 'border-rose-500' :
                  'border-slate-300 focus:border-blue-500'
                }`}
                placeholder={`Введите значение...`}
                required
              />
              {status && (
                <div className={`absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${
                  status === 'normal' ? 'bg-emerald-500' :
                  status === 'warning' ? 'bg-amber-500' :
                  'bg-rose-500'
                } animate-pulse`} />
              )}
            </div>
            {status && (
              <div className={`text-xs mt-2 font-mono ${
                status === 'normal' ? 'text-emerald-500' :
                status === 'warning' ? 'text-amber-500' :
                'text-rose-500'
              }`}>
                {status === 'normal' ? '✓ В пределах нормы' :
                 status === 'warning' ? '⚠ Близко к границе нормы' :
                 '✗ Вне нормы'}
              </div>
            )}
          </div>

          {/* Лаборант */}
          <div>
            <label className="block text-sm text-slate-800 mb-2">Лаборант (необязательно)</label>
            <input
              type="text"
              value={technicianName}
              onChange={(e) => setTechnicianName(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:border-blue-500 focus:outline-none"
              placeholder="Имя лаборанта"
            />
          </div>

          {/* Комментарии */}
          <div>
            <label className="block text-sm text-slate-800 mb-2">Комментарии (необязательно)</label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:border-blue-500 focus:outline-none resize-none"
              placeholder="Дополнительная информация..."
            />
          </div>

          {/* Сообщения */}
          {message && (
            <div className={`p-4 rounded-lg border ${
              message.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}>
              {message.text}
            </div>
          )}

          {/* Кнопка отправки */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-display text-lg rounded-lg transition-all shadow-lg"
          >
            {submitting ? 'Сохранение...' : 'Сохранить анализ'}
          </button>
        </form>
      </div>
    </div>
  );
}

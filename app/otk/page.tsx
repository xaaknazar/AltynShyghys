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
            <label className="block text-sm text-slate-800 mb-2 font-semibold">Тип анализа</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as AnalysisType)}
              className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:border-blue-500 focus:outline-none"
            >
              <optgroup label="Входящее сырье">
                <option value={ANALYSIS_TYPES.MOISTURE_RAW_MATERIAL}>{ANALYSIS_CONFIG[ANALYSIS_TYPES.MOISTURE_RAW_MATERIAL].label}</option>
                <option value={ANALYSIS_TYPES.OIL_CONTENT_RAW_MATERIAL}>{ANALYSIS_CONFIG[ANALYSIS_TYPES.OIL_CONTENT_RAW_MATERIAL].label}</option>
              </optgroup>

              <optgroup label="Лузга">
                <option value={ANALYSIS_TYPES.MOISTURE_HUSK}>{ANALYSIS_CONFIG[ANALYSIS_TYPES.MOISTURE_HUSK].label}</option>
                <option value={ANALYSIS_TYPES.FAT_HUSK}>{ANALYSIS_CONFIG[ANALYSIS_TYPES.FAT_HUSK].label}</option>
                <option value={ANALYSIS_TYPES.KERNEL_LOSS_HUSK}>{ANALYSIS_CONFIG[ANALYSIS_TYPES.KERNEL_LOSS_HUSK].label}</option>
              </optgroup>

              <optgroup label="Рушанка">
                <option value={ANALYSIS_TYPES.MOISTURE_CRUSHED}>{ANALYSIS_CONFIG[ANALYSIS_TYPES.MOISTURE_CRUSHED].label}</option>
                <option value={ANALYSIS_TYPES.HUSK_CONTENT_CRUSHED}>{ANALYSIS_CONFIG[ANALYSIS_TYPES.HUSK_CONTENT_CRUSHED].label}</option>
              </optgroup>

              <optgroup label="Мезга с жаровни">
                <option value={ANALYSIS_TYPES.MOISTURE_ROASTER_1}>{ANALYSIS_CONFIG[ANALYSIS_TYPES.MOISTURE_ROASTER_1].label}</option>
                <option value={ANALYSIS_TYPES.MOISTURE_ROASTER_2}>{ANALYSIS_CONFIG[ANALYSIS_TYPES.MOISTURE_ROASTER_2].label}</option>
              </optgroup>

              <optgroup label="Жмых с пресса">
                <option value={ANALYSIS_TYPES.MOISTURE_PRESS_1}>{ANALYSIS_CONFIG[ANALYSIS_TYPES.MOISTURE_PRESS_1].label}</option>
                <option value={ANALYSIS_TYPES.MOISTURE_PRESS_2}>{ANALYSIS_CONFIG[ANALYSIS_TYPES.MOISTURE_PRESS_2].label}</option>
                <option value={ANALYSIS_TYPES.FAT_PRESS_1}>{ANALYSIS_CONFIG[ANALYSIS_TYPES.FAT_PRESS_1].label}</option>
                <option value={ANALYSIS_TYPES.FAT_PRESS_2}>{ANALYSIS_CONFIG[ANALYSIS_TYPES.FAT_PRESS_2].label}</option>
              </optgroup>

              <optgroup label="Шрот">
                <option value={ANALYSIS_TYPES.MOISTURE_TOASTED_MEAL}>{ANALYSIS_CONFIG[ANALYSIS_TYPES.MOISTURE_TOASTED_MEAL].label}</option>
                <option value={ANALYSIS_TYPES.OIL_CONTENT_MEAL}>{ANALYSIS_CONFIG[ANALYSIS_TYPES.OIL_CONTENT_MEAL].label}</option>
              </optgroup>

              <optgroup label="Мисцелла">
                <option value={ANALYSIS_TYPES.MISCELLA_CONCENTRATION}>{ANALYSIS_CONFIG[ANALYSIS_TYPES.MISCELLA_CONCENTRATION].label}</option>
              </optgroup>
            </select>
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

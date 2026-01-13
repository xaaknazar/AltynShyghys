'use client';

import { useState } from 'react';

interface ShiftEventFormProps {
  shiftDate: string;
  shiftType: 'day' | 'night';
  currentSpeed: number;
  masterName?: string;
  onSubmit: () => void;
}

export default function ShiftEventForm({
  shiftDate,
  shiftType,
  currentSpeed,
  masterName = '',
  onSubmit
}: ShiftEventFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    start_time: new Date().toISOString().slice(0, 16),
    end_time: '',
    event_type: 'reduction', // 'reduction' или 'stoppage'
    workshop: '',
    reason: '',
    reduced_speed: '', // для снижений - до какой скорости
    master_name: masterName,
  });

  const workshops = [
    'РВО',
    'Прессовый цех',
    'Экстракция',
    'Грануляция',
    'СГП',
    'Котельный цех',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/shift-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shift_date: shiftDate,
          shift_type: shiftType,
          event_time: formData.start_time, // для обратной совместимости
          start_time: formData.start_time,
          end_time: formData.end_time || null,
          event_type: formData.event_type,
          workshop: formData.workshop,
          description: formData.reason, // причина
          reduced_speed: formData.event_type === 'reduction' && formData.reduced_speed
            ? parseFloat(formData.reduced_speed)
            : null,
          master_name: formData.master_name,
        }),
      });

      if (response.ok) {
        setFormData({
          start_time: new Date().toISOString().slice(0, 16),
          end_time: '',
          event_type: 'reduction',
          workshop: '',
          reason: '',
          reduced_speed: '',
          master_name: masterName,
        });
        setIsOpen(false);
        onSubmit();
      } else {
        alert('Ошибка при сохранении события');
      }
    } catch (error) {
      console.error('Error submitting event:', error);
      alert('Ошибка при сохранении события');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg"
      >
        + Зафиксировать снижение/остановку
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-2 sm:p-4">
          <div className="bg-white border border-slate-300 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white backdrop-blur-md border-b border-slate-200 p-4 sm:p-6 flex items-center justify-between">
              <h2 className="text-lg sm:text-2xl font-display font-bold text-blue-600">
                СНИЖЕНИЕ / ОСТАНОВКА
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Тип события */}
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-3">
                  Тип события *
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, event_type: 'reduction' })}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.event_type === 'reduction'
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-slate-200 hover:border-amber-300'
                    }`}
                  >
                    <span className="text-3xl mb-2 block">📉</span>
                    <span className="text-sm font-semibold text-slate-800">Снижение</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, event_type: 'stoppage' })}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.event_type === 'stoppage'
                        ? 'border-red-500 bg-red-50'
                        : 'border-slate-200 hover:border-red-300'
                    }`}
                  >
                    <span className="text-3xl mb-2 block">⛔</span>
                    <span className="text-sm font-semibold text-slate-800">Остановка</span>
                  </button>
                </div>
              </div>

              {/* Время начала */}
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-2">
                  Время начала *
                </label>
                <input
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  required
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Время окончания */}
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-2">
                  Время окончания (когда вернули на прежнее значение)
                </label>
                <input
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Оставьте пустым если еще не восстановлено
                </p>
              </div>

              {/* Цех */}
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-2">
                  Цех *
                </label>
                <select
                  value={formData.workshop}
                  onChange={(e) => setFormData({ ...formData, workshop: e.target.value })}
                  required
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Выберите цех...</option>
                  {workshops.map((workshop) => (
                    <option key={workshop} value={workshop}>
                      {workshop}
                    </option>
                  ))}
                </select>
              </div>

              {/* Снижение до какой скорости (только для снижений) */}
              {formData.event_type === 'reduction' && (
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-2">
                    Снижена до (т/ч) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.reduced_speed}
                    onChange={(e) => setFormData({ ...formData, reduced_speed: e.target.value })}
                    required
                    placeholder="До какой скорости снизили"
                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Текущая скорость: {currentSpeed.toFixed(1)} т/ч
                  </p>
                </div>
              )}

              {/* Причина */}
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-2">
                  Причина *
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  required
                  rows={3}
                  placeholder="Опишите причину снижения или остановки..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* ФИО Мастера смены */}
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-2">
                  ФИО Мастера смены *
                </label>
                <input
                  type="text"
                  value={formData.master_name}
                  onChange={(e) => setFormData({ ...formData, master_name: e.target.value })}
                  required
                  placeholder="Введите ваше ФИО..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Кнопки */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 sm:px-6 rounded-lg transition-all disabled:opacity-50"
                >
                  {loading ? 'Сохранение...' : 'Сохранить'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 sm:px-6 py-3 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 hover:bg-slate-200 transition-all"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

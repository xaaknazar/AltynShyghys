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
    event_time: new Date().toISOString().slice(0, 16),
    event_type: 'production_issue',
    workshop: '',
    description: '',
    actions_taken: '',
    speed_before: '',
    speed_after: '',
    master_name: masterName,
  });

  const eventTypes = [
    { value: 'production_issue', label: 'Проблема производства', icon: '⚠️' },
    { value: 'equipment_failure', label: 'Поломка оборудования', icon: '🔧' },
    { value: 'material_shortage', label: 'Нехватка сырья', icon: '📦' },
    { value: 'maintenance', label: 'Профилактика', icon: '🛠️' },
    { value: 'quality_issue', label: 'Проблема качества', icon: '🔍' },
    { value: 'speed_change', label: 'Изменение скорости', icon: '📊' },
    { value: 'other', label: 'Другое', icon: '📝' },
  ];

  const workshops = [
    'Цех прессования',
    'Цех рафинации',
    'Цех фильтрации',
    'Цех розлива',
    'Котельная',
    'Другое',
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
          ...formData,
          speed_before: formData.speed_before ? parseFloat(formData.speed_before) : null,
          speed_after: formData.speed_after ? parseFloat(formData.speed_after) : null,
        }),
      });

      if (response.ok) {
        setFormData({
          event_time: new Date().toISOString().slice(0, 16),
          event_type: 'production_issue',
          workshop: '',
          description: '',
          actions_taken: '',
          speed_before: '',
          speed_after: '',
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
        + Добавить событие смены
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-300 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white backdrop-blur-md border-b border-slate-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-display font-bold text-blue-600">
                НОВОЕ СОБЫТИЕ СМЕНЫ
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

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Время события */}
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-2">
                  Время события *
                </label>
                <input
                  type="datetime-local"
                  value={formData.event_time}
                  onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                  required
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Тип события */}
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-2">
                  Тип события *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {eventTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, event_type: type.value })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        formData.event_type === type.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      <span className="text-2xl mb-1 block">{type.icon}</span>
                      <span className="text-xs text-slate-800">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Цех */}
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-2">
                  Цех
                </label>
                <select
                  value={formData.workshop}
                  onChange={(e) => setFormData({ ...formData, workshop: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Выберите цех...</option>
                  {workshops.map((workshop) => (
                    <option key={workshop} value={workshop}>
                      {workshop}
                    </option>
                  ))}
                </select>
              </div>

              {/* Описание проблемы */}
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-2">
                  Описание проблемы *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={3}
                  placeholder="Подробно опишите что произошло..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Принятые меры */}
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-2">
                  Принятые меры
                </label>
                <textarea
                  value={formData.actions_taken}
                  onChange={(e) => setFormData({ ...formData, actions_taken: e.target.value })}
                  rows={3}
                  placeholder="Что было сделано для решения проблемы..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Скорость до/после */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-2">
                    Скорость до (т/ч)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.speed_before}
                    onChange={(e) => setFormData({ ...formData, speed_before: e.target.value })}
                    placeholder={`Текущая: ${currentSpeed.toFixed(1)}`}
                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-2">
                    Скорость после (т/ч)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.speed_after}
                    onChange={(e) => setFormData({ ...formData, speed_after: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Имя мастера */}
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-2">
                  Мастер смены
                </label>
                <input
                  type="text"
                  value={formData.master_name}
                  onChange={(e) => setFormData({ ...formData, master_name: e.target.value })}
                  placeholder="Введите ваше имя..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Кнопки */}
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50"
                >
                  {loading ? 'Сохранение...' : 'Сохранить событие'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-6 py-3 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 hover:bg-slate-200 transition-all"
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

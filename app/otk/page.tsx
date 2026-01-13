'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ANALYSIS_TYPES, ANALYSIS_CONFIG, getCurrentShift, getAnalysisStatus, AnalysisType, ShiftType } from '@/lib/quality-types';

export default function OTKPage() {
  const [selectedType, setSelectedType] = useState<AnalysisType>(ANALYSIS_TYPES.MOISTURE_ROASTER_1);
  const [value, setValue] = useState<string>('');
  const [technicianName, setTechnicianName] = useState<string>('');
  const [comments, setComments] = useState<string>('');
  const [shiftDate, setShiftDate] = useState<string>('');
  const [shiftType, setShiftType] = useState<ShiftType>('day');
  const [sampleTime, setSampleTime] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<any[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    // Автоопределение текущей смены
    const currentShift = getCurrentShift();
    setShiftDate(currentShift.date);
    setShiftType(currentShift.type);

    // Установка текущего времени
    const now = new Date();
    const localTime = new Date(now.getTime() + 5 * 60 * 60 * 1000); // UTC+5
    setSampleTime(localTime.toISOString().slice(0, 16));

    // Загрузка недавних анализов
    fetchRecentAnalyses();
  }, []);

  const fetchRecentAnalyses = async () => {
    try {
      const currentShift = getCurrentShift();
      const response = await fetch(
        `/api/quality-analysis?shift_date=${currentShift.date}&shift_type=${currentShift.type}`,
        { cache: 'no-store' }
      );
      const data = await response.json();
      if (data.success) {
        setRecentAnalyses(data.analyses.slice(0, 10));
      }
    } catch (error) {
      console.error('Error fetching recent analyses:', error);
    }
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

      const response = await fetch('/api/quality-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shift_date: shiftDate,
          shift_type: shiftType,
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
        fetchRecentAnalyses();

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

  const handleDelete = async (analysisId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот анализ?')) {
      return;
    }

    setDeletingId(analysisId);
    try {
      const response = await fetch(`/api/quality-analysis?id=${analysisId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Анализ успешно удален!' });
        fetchRecentAnalyses();
      } else {
        setMessage({ type: 'error', text: data.error || 'Ошибка при удалении' });
      }
    } catch (error) {
      console.error('Error deleting analysis:', error);
      setMessage({ type: 'error', text: 'Ошибка при удалении анализа' });
    } finally {
      setDeletingId(null);
    }
  };

  const config = ANALYSIS_CONFIG[selectedType];
  const numValue = parseFloat(value);
  const status = !isNaN(numValue) ? getAnalysisStatus(selectedType, numValue) : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-blue-600">
                ЛАБОРАТОРНЫЙ КОНТРОЛЬ
              </h1>
              <p className="text-xs text-slate-600 font-mono mt-1">
                Ввод результатов анализов качества
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/analysis"
                className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all"
              >
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-sm font-medium text-blue-700">Анализ данных</span>
              </Link>
              <Link
                href="/"
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-800 transition-all"
              >
                ← На главную
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Форма ввода */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-xl font-display text-blue-600 mb-6">
                НОВЫЙ АНАЛИЗ
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Информация о смене */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-slate-600 mb-2">Дата смены</label>
                      <input
                        type="date"
                        value={shiftDate}
                        onChange={(e) => setShiftDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono text-sm focus:border-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-2">Смена</label>
                      <select
                        value={shiftType}
                        onChange={(e) => setShiftType(e.target.value as ShiftType)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono text-sm focus:border-blue-500 focus:outline-none"
                        required
                      >
                        <option value="day">Дневная (08:00-20:00)</option>
                        <option value="night">Ночная (20:00-08:00)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-2">Время отбора</label>
                      <input
                        type="datetime-local"
                        value={sampleTime}
                        onChange={(e) => setSampleTime(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono text-sm focus:border-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Тип анализа */}
                <div>
                  <label className="block text-sm text-slate-800 mb-3 font-semibold">Тип анализа</label>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {/* Входящее сырье */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">
                        Входящее сырье
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {[ANALYSIS_TYPES.MOISTURE_RAW_MATERIAL, ANALYSIS_TYPES.OIL_CONTENT_RAW_MATERIAL].map(type => {
                          const conf = ANALYSIS_CONFIG[type];
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setSelectedType(type)}
                              className={`p-3 rounded-lg border-2 transition-all text-left ${
                                selectedType === type
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-slate-200 bg-white hover:border-blue-300'
                              }`}
                            >
                              <div className="text-sm font-semibold text-slate-800">{conf.label}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Лузга */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">
                        Лузга
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {[ANALYSIS_TYPES.MOISTURE_HUSK, ANALYSIS_TYPES.FAT_HUSK, ANALYSIS_TYPES.KERNEL_LOSS_HUSK].map(type => {
                          const conf = ANALYSIS_CONFIG[type];
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setSelectedType(type)}
                              className={`p-3 rounded-lg border-2 transition-all text-left ${
                                selectedType === type
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-slate-200 bg-white hover:border-blue-300'
                              }`}
                            >
                              <div className="text-sm font-semibold text-slate-800">{conf.label}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Рушанка */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">
                        Рушанка
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {[ANALYSIS_TYPES.MOISTURE_CRUSHED, ANALYSIS_TYPES.HUSK_CONTENT_CRUSHED].map(type => {
                          const conf = ANALYSIS_CONFIG[type];
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setSelectedType(type)}
                              className={`p-3 rounded-lg border-2 transition-all text-left ${
                                selectedType === type
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-slate-200 bg-white hover:border-blue-300'
                              }`}
                            >
                              <div className="text-sm font-semibold text-slate-800">{conf.label}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Мезга с жаровни */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">
                        Мезга с жаровни
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {[ANALYSIS_TYPES.MOISTURE_ROASTER_1, ANALYSIS_TYPES.MOISTURE_ROASTER_2].map(type => {
                          const conf = ANALYSIS_CONFIG[type];
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setSelectedType(type)}
                              className={`p-3 rounded-lg border-2 transition-all text-left ${
                                selectedType === type
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-slate-200 bg-white hover:border-blue-300'
                              }`}
                            >
                              <div className="text-sm font-semibold text-slate-800">{conf.label}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Жмых с пресса */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">
                        Жмых с пресса
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {[ANALYSIS_TYPES.MOISTURE_PRESS_1, ANALYSIS_TYPES.MOISTURE_PRESS_2, ANALYSIS_TYPES.FAT_PRESS_1, ANALYSIS_TYPES.FAT_PRESS_2].map(type => {
                          const conf = ANALYSIS_CONFIG[type];
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setSelectedType(type)}
                              className={`p-3 rounded-lg border-2 transition-all text-left ${
                                selectedType === type
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-slate-200 bg-white hover:border-blue-300'
                              }`}
                            >
                              <div className="text-sm font-semibold text-slate-800">{conf.label}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Шрот */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">
                        Шрот
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {[ANALYSIS_TYPES.MOISTURE_TOASTED_MEAL, ANALYSIS_TYPES.OIL_CONTENT_MEAL].map(type => {
                          const conf = ANALYSIS_CONFIG[type];
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setSelectedType(type)}
                              className={`p-3 rounded-lg border-2 transition-all text-left ${
                                selectedType === type
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-slate-200 bg-white hover:border-blue-300'
                              }`}
                            >
                              <div className="text-sm font-semibold text-slate-800">{conf.label}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Мисцелла */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">
                        Мисцелла
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {[ANALYSIS_TYPES.MISCELLA_CONCENTRATION].map(type => {
                          const conf = ANALYSIS_CONFIG[type];
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setSelectedType(type)}
                              className={`p-3 rounded-lg border-2 transition-all text-left ${
                                selectedType === type
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-slate-200 bg-white hover:border-blue-300'
                              }`}
                            >
                              <div className="text-sm font-semibold text-slate-800">{conf.label}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
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

          {/* Недавние анализы */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sticky top-24 shadow-sm">
              <h3 className="text-lg font-display text-slate-700 mb-4">
                НЕДАВНИЕ АНАЛИЗЫ
              </h3>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {recentAnalyses.length === 0 ? (
                  <div className="text-center text-slate-600 py-8 text-sm">
                    Пока нет анализов за эту смену
                  </div>
                ) : (
                  recentAnalyses.map((analysis) => {
                    const conf = ANALYSIS_CONFIG[analysis.analysis_type as AnalysisType];
                    const stat = getAnalysisStatus(analysis.analysis_type, analysis.value);
                    const isDeleting = deletingId === analysis.id;
                    return (
                      <div
                        key={analysis.id}
                        className="bg-slate-50 rounded-lg p-3 border border-slate-200 relative group"
                      >
                        <button
                          onClick={() => handleDelete(analysis.id)}
                          disabled={isDeleting}
                          className="absolute top-2 right-2 p-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Удалить анализ"
                        >
                          <svg className="w-3.5 h-3.5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        <div className="flex items-center justify-between mb-1 pr-8">
                          <div className="text-xs text-slate-600">
                            {new Date(analysis.sample_time).toLocaleTimeString('ru-RU', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                          <div className={`w-2 h-2 rounded-full ${
                            stat === 'normal' ? 'bg-emerald-500' :
                            stat === 'warning' ? 'bg-amber-500' :
                            'bg-rose-500'
                          }`} />
                        </div>
                        <div className="text-sm text-slate-800 truncate mb-1">
                          {conf.label}
                        </div>
                        <div className="text-lg font-mono font-bold text-blue-600">
                          {analysis.value.toFixed(2)}{conf.unit}
                        </div>
                        {isDeleting && (
                          <div className="absolute inset-0 bg-white bg-opacity-75 rounded-lg flex items-center justify-center">
                            <div className="text-xs text-slate-600">Удаление...</div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

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

  const config = ANALYSIS_CONFIG[selectedType];
  const numValue = parseFloat(value);
  const status = !isNaN(numValue) ? getAnalysisStatus(selectedType, numValue) : null;

  return (
    <div className="min-h-screen grid-background">
      <header className="bg-industrial-darker/95 backdrop-blur-md border-b border-industrial-accent/20 sticky top-0 z-50 shadow-lg shadow-industrial-accent/10">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-industrial-accent">
                ЛАБОРАТОРНЫЙ КОНТРОЛЬ
              </h1>
              <p className="text-xs text-gray-400 font-mono mt-1">
                Ввод результатов анализов качества
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/analysis"
                className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-industrial-accent/20 hover:bg-industrial-accent/30 border border-industrial-accent/40 rounded-lg transition-all"
              >
                <svg className="w-4 h-4 text-industrial-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-sm font-medium text-industrial-accent">Анализ данных</span>
              </Link>
              <Link
                href="/"
                className="px-4 py-2.5 bg-industrial-dark/70 hover:bg-industrial-dark border border-industrial-blue/30 rounded-lg text-gray-300 transition-all"
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
            <div className="bg-industrial-darker/80 backdrop-blur-sm rounded-2xl border border-industrial-blue/30 p-6">
              <h2 className="text-xl font-display text-industrial-accent mb-6">
                НОВЫЙ АНАЛИЗ
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Информация о смене */}
                <div className="bg-industrial-dark/50 rounded-lg p-4 border border-industrial-blue/20">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-2">Дата смены</label>
                      <input
                        type="date"
                        value={shiftDate}
                        onChange={(e) => setShiftDate(e.target.value)}
                        className="w-full px-3 py-2 bg-industrial-darker border border-industrial-blue/30 rounded-lg text-gray-200 font-mono text-sm focus:border-industrial-accent focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-2">Смена</label>
                      <select
                        value={shiftType}
                        onChange={(e) => setShiftType(e.target.value as ShiftType)}
                        className="w-full px-3 py-2 bg-industrial-darker border border-industrial-blue/30 rounded-lg text-gray-200 font-mono text-sm focus:border-industrial-accent focus:outline-none"
                        required
                      >
                        <option value="day">Дневная (08:00-20:00)</option>
                        <option value="night">Ночная (20:00-08:00)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-2">Время отбора</label>
                      <input
                        type="datetime-local"
                        value={sampleTime}
                        onChange={(e) => setSampleTime(e.target.value)}
                        className="w-full px-3 py-2 bg-industrial-darker border border-industrial-blue/30 rounded-lg text-gray-200 font-mono text-sm focus:border-industrial-accent focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Тип анализа */}
                <div>
                  <label className="block text-sm text-gray-300 mb-3 font-semibold">Тип анализа</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(ANALYSIS_CONFIG).map(([type, conf]) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setSelectedType(type as AnalysisType)}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          selectedType === type
                            ? 'border-industrial-accent bg-industrial-accent/10'
                            : 'border-industrial-blue/20 bg-industrial-dark/30 hover:border-industrial-accent/50'
                        }`}
                      >
                        <div className="text-sm font-semibold text-gray-200">{conf.label}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          Норма: {conf.min === 0 ? `до ${conf.max}` : `${conf.min}-${conf.max}`}{conf.unit}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Значение */}
                <div>
                  <label className="block text-sm text-gray-300 mb-2 font-semibold">
                    Значение ({config.unit})
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      className={`w-full px-4 py-3 bg-industrial-darker border-2 rounded-lg text-gray-200 font-mono text-lg focus:outline-none ${
                        status === 'normal' ? 'border-industrial-success' :
                        status === 'warning' ? 'border-industrial-warning' :
                        status === 'danger' ? 'border-industrial-danger' :
                        'border-industrial-blue/30 focus:border-industrial-accent'
                      }`}
                      placeholder={`Введите значение (${config.min === 0 ? `до ${config.max}` : `${config.min}-${config.max}`})`}
                      required
                    />
                    {status && (
                      <div className={`absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${
                        status === 'normal' ? 'bg-industrial-success' :
                        status === 'warning' ? 'bg-industrial-warning' :
                        'bg-industrial-danger'
                      } animate-pulse`} />
                    )}
                  </div>
                  {status && (
                    <div className={`text-xs mt-2 font-mono ${
                      status === 'normal' ? 'text-industrial-success' :
                      status === 'warning' ? 'text-industrial-warning' :
                      'text-industrial-danger'
                    }`}>
                      {status === 'normal' ? '✓ В пределах нормы' :
                       status === 'warning' ? '⚠ Близко к границе нормы' :
                       '✗ Вне нормы'}
                    </div>
                  )}
                </div>

                {/* Лаборант */}
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Лаборант (необязательно)</label>
                  <input
                    type="text"
                    value={technicianName}
                    onChange={(e) => setTechnicianName(e.target.value)}
                    className="w-full px-4 py-2 bg-industrial-darker border border-industrial-blue/30 rounded-lg text-gray-200 focus:border-industrial-accent focus:outline-none"
                    placeholder="Имя лаборанта"
                  />
                </div>

                {/* Комментарии */}
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Комментарии (необязательно)</label>
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 bg-industrial-darker border border-industrial-blue/30 rounded-lg text-gray-200 focus:border-industrial-accent focus:outline-none resize-none"
                    placeholder="Дополнительная информация..."
                  />
                </div>

                {/* Сообщения */}
                {message && (
                  <div className={`p-4 rounded-lg border ${
                    message.type === 'success'
                      ? 'bg-industrial-success/10 border-industrial-success/30 text-industrial-success'
                      : 'bg-industrial-danger/10 border-industrial-danger/30 text-industrial-danger'
                  }`}>
                    {message.text}
                  </div>
                )}

                {/* Кнопка отправки */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-industrial-accent hover:bg-industrial-accent/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-display text-lg rounded-lg transition-all shadow-lg"
                >
                  {submitting ? 'Сохранение...' : 'Сохранить анализ'}
                </button>
              </form>
            </div>
          </div>

          {/* Недавние анализы */}
          <div className="lg:col-span-1">
            <div className="bg-industrial-darker/80 backdrop-blur-sm rounded-2xl border border-industrial-blue/30 p-6 sticky top-24">
              <h3 className="text-lg font-display text-gray-400 mb-4">
                НЕДАВНИЕ АНАЛИЗЫ
              </h3>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {recentAnalyses.length === 0 ? (
                  <div className="text-center text-gray-500 py-8 text-sm">
                    Пока нет анализов за эту смену
                  </div>
                ) : (
                  recentAnalyses.map((analysis) => {
                    const conf = ANALYSIS_CONFIG[analysis.analysis_type as AnalysisType];
                    const stat = getAnalysisStatus(analysis.analysis_type, analysis.value);
                    return (
                      <div
                        key={analysis.id}
                        className="bg-industrial-dark/50 rounded-lg p-3 border border-industrial-blue/20"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-xs text-gray-400">
                            {new Date(analysis.sample_time).toLocaleTimeString('ru-RU', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                          <div className={`w-2 h-2 rounded-full ${
                            stat === 'normal' ? 'bg-industrial-success' :
                            stat === 'warning' ? 'bg-industrial-warning' :
                            'bg-industrial-danger'
                          }`} />
                        </div>
                        <div className="text-sm text-gray-300 truncate mb-1">
                          {conf.label}
                        </div>
                        <div className="text-lg font-mono font-bold text-industrial-accent">
                          {analysis.value.toFixed(2)}{conf.unit}
                        </div>
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

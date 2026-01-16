'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ANALYSIS_TYPES, ANALYSIS_CONFIG, getCurrentShift, getAnalysisStatus, AnalysisType, ShiftType } from '@/lib/quality-types';

type TabType = 'add' | 'list';

export default function OTKPage() {
  const [activeTab, setActiveTab] = useState<TabType>('add');
  const [selectedType, setSelectedType] = useState<AnalysisType>(ANALYSIS_TYPES.MOISTURE_ROASTER_1);
  const [value, setValue] = useState<string>('');
  const [technicianName, setTechnicianName] = useState<string>('');
  const [comments, setComments] = useState<string>('');
  const [shiftDate, setShiftDate] = useState<string>('');
  const [shiftType, setShiftType] = useState<ShiftType>('day');
  const [sampleTime, setSampleTime] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [allAnalyses, setAllAnalyses] = useState<any[]>([]);
  const [groupedByDay, setGroupedByDay] = useState<{ [key: string]: any[] }>({});
  const [loadingList, setLoadingList] = useState(false);
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
  }, []);

  useEffect(() => {
    if (activeTab === 'list') {
      fetchAllAnalyses();
    }
  }, [activeTab]);

  const fetchAllAnalyses = async () => {
    setLoadingList(true);
    try {
      // Загружаем все анализы за последний месяц
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const params = new URLSearchParams({
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        shift_type: 'all',
        analysis_type: 'all',
        group_by: 'none',
      });

      const response = await fetch(`/api/quality-analysis?${params}`, { cache: 'no-store' });
      const data = await response.json();

      if (data.success) {
        setAllAnalyses(data.analyses);
        // Группируем по производственным суткам (20:00-20:00)
        groupByProductionDay(data.analyses);
      }
    } catch (error) {
      console.error('Error fetching all analyses:', error);
    } finally {
      setLoadingList(false);
    }
  };

  const groupByProductionDay = (analyses: any[]) => {
    const TIMEZONE_OFFSET = 5; // UTC+5
    const grouped: { [key: string]: any[] } = {};

    analyses.forEach((analysis) => {
      const sampleTime = new Date(analysis.sample_time);
      const localTime = new Date(sampleTime.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);
      const localHour = localTime.getUTCHours();

      // Производственные сутки начинаются в 20:00
      const productionDay = new Date(localTime);
      if (localHour < 20) {
        productionDay.setUTCDate(productionDay.getUTCDate() - 1);
      }

      const dayKey = productionDay.toISOString().split('T')[0];

      if (!grouped[dayKey]) {
        grouped[dayKey] = [];
      }
      grouped[dayKey].push(analysis);
    });

    // Сортируем анализы внутри каждого дня по времени (от новых к старым)
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => new Date(b.sample_time).getTime() - new Date(a.sample_time).getTime());
    });

    setGroupedByDay(grouped);
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

        // Обновление времени для следующего анализа
        const now = new Date();
        const localTime = new Date(now.getTime() + 5 * 60 * 60 * 1000);
        setSampleTime(localTime.toISOString().slice(0, 16));

        // Если мы на вкладке списка, обновляем список
        if (activeTab === 'list') {
          fetchAllAnalyses();
        }
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
        fetchAllAnalyses();
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
    <div className="min-h-screen bg-slate-50 flex">
      {/* Сайдбар */}
      <div className="w-64 bg-white border-r border-slate-200 flex-shrink-0">
        <div className="p-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="text-sm font-medium">На главную</span>
          </Link>

          <h1 className="text-xl font-display font-bold text-blue-600 mb-1">
            ОТК
          </h1>
          <p className="text-xs text-slate-600 mb-6">
            Лабораторный контроль
          </p>

          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('add')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                activeTab === 'add'
                  ? 'bg-blue-50 text-blue-700 border-2 border-blue-500 font-semibold'
                  : 'bg-slate-50 text-slate-700 border-2 border-transparent hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Добавить анализ</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('list')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                activeTab === 'list'
                  ? 'bg-blue-50 text-blue-700 border-2 border-blue-500 font-semibold'
                  : 'bg-slate-50 text-slate-700 border-2 border-transparent hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <span>Все анализы</span>
              </div>
            </button>
          </nav>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <Link
              href="/analysis"
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all text-sm"
            >
              <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="font-medium text-slate-700">Анализ данных</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Основной контент */}
      <div className="flex-1 overflow-auto">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
          <div className="px-8 py-5">
            <h2 className="text-2xl font-display font-bold text-slate-800">
              {activeTab === 'add' ? 'ДОБАВИТЬ АНАЛИЗ' : 'ВСЕ АНАЛИЗЫ'}
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              {activeTab === 'add' ? 'Ввод результатов анализов качества' : 'История всех анализов по производственным суткам (20:00-20:00)'}
            </p>
          </div>
        </header>

        <main className="p-8">
          {activeTab === 'add' ? (
            // Форма добавления анализа
            <div className="max-w-4xl">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
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
          ) : (
            // Список всех анализов
            <div className="max-w-6xl">
              {loadingList ? (
                <div className="text-center py-16">
                  <div className="text-2xl text-slate-700 font-display">Загрузка анализов...</div>
                </div>
              ) : Object.keys(groupedByDay).length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                  <div className="text-slate-700 text-lg mb-2">Нет анализов за последний месяц</div>
                  <div className="text-slate-600 text-sm">Добавьте новые анализы на вкладке "Добавить анализ"</div>
                </div>
              ) : (
                <div className="space-y-6">
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

                  {/* Группы по производственным суткам */}
                  {Object.keys(groupedByDay)
                    .sort((a, b) => b.localeCompare(a)) // Сортируем от новых к старым
                    .map((dayKey) => {
                      const analyses = groupedByDay[dayKey];
                      const dayDate = new Date(dayKey);
                      const displayDate = dayDate.toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      });

                      return (
                        <div key={dayKey} className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                          <div className="bg-gradient-to-r from-blue-50 to-slate-50 border-b border-slate-200 px-6 py-4">
                            <h3 className="text-lg font-display font-bold text-blue-600">
                              Производственные сутки: {displayDate} 20:00 - {new Date(dayDate.getTime() + 24*60*60*1000).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })} 20:00
                            </h3>
                            <p className="text-xs text-slate-600 mt-1">
                              Всего анализов: {analyses.length}
                            </p>
                          </div>

                          <div className="p-6">
                            <div className="space-y-3">
                              {analyses.map((analysis) => {
                                const conf = ANALYSIS_CONFIG[analysis.analysis_type as AnalysisType];
                                const stat = getAnalysisStatus(analysis.analysis_type, analysis.value);
                                const isDeleting = deletingId === analysis.id;
                                const sampleTime = new Date(analysis.sample_time);

                                return (
                                  <div
                                    key={analysis.id}
                                    className="bg-slate-50 rounded-lg p-4 border border-slate-200 relative group hover:border-blue-300 transition-all"
                                  >
                                    <button
                                      onClick={() => handleDelete(analysis.id)}
                                      disabled={isDeleting}
                                      className="absolute top-3 right-3 p-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="Удалить анализ"
                                    >
                                      <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pr-12">
                                      <div>
                                        <div className="text-xs text-slate-500 mb-1">Время отбора</div>
                                        <div className="text-sm font-mono text-slate-800">
                                          {sampleTime.toLocaleString('ru-RU', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">
                                          {analysis.shift_type === 'day' ? '☀ Дневная смена' : '🌙 Ночная смена'}
                                        </div>
                                      </div>

                                      <div>
                                        <div className="text-xs text-slate-500 mb-1">Тип анализа</div>
                                        <div className="text-sm font-semibold text-slate-800">
                                          {conf?.label || analysis.analysis_type}
                                        </div>
                                      </div>

                                      <div>
                                        <div className="text-xs text-slate-500 mb-1">Значение</div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-lg font-mono font-bold text-blue-600">
                                            {analysis.value.toFixed(2)}{conf?.unit || ''}
                                          </span>
                                          <div className={`w-2.5 h-2.5 rounded-full ${
                                            stat === 'normal' ? 'bg-emerald-500' :
                                            stat === 'warning' ? 'bg-amber-500' :
                                            'bg-rose-500'
                                          }`} />
                                        </div>
                                        {conf && (
                                          <div className="text-xs text-slate-500 mt-1">
                                            Норма: {conf.min}-{conf.max}{conf.unit}
                                          </div>
                                        )}
                                      </div>

                                      <div>
                                        {analysis.technician_name && (
                                          <>
                                            <div className="text-xs text-slate-500 mb-1">Лаборант</div>
                                            <div className="text-sm text-slate-800">{analysis.technician_name}</div>
                                          </>
                                        )}
                                        {analysis.comments && (
                                          <>
                                            <div className="text-xs text-slate-500 mb-1 mt-2">Комментарий</div>
                                            <div className="text-sm text-slate-600 italic">{analysis.comments}</div>
                                          </>
                                        )}
                                      </div>
                                    </div>

                                    {isDeleting && (
                                      <div className="absolute inset-0 bg-white bg-opacity-75 rounded-lg flex items-center justify-center">
                                        <div className="text-sm text-slate-600">Удаление...</div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { ANALYSIS_TYPES, ANALYSIS_CONFIG, getAnalysisStatus, AnalysisType } from '@/lib/quality-types';

export default function OTKListPage() {
  const [allAnalyses, setAllAnalyses] = useState<any[]>([]);
  const [groupedByDay, setGroupedByDay] = useState<{ [key: string]: any[] }>({});
  const [loadingList, setLoadingList] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Фильтры для списка анализов
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterAnalysisType, setFilterAnalysisType] = useState<string>('all');
  const [filterShiftType, setFilterShiftType] = useState<string>('all');

  // Режим отображения и редактирование
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [editingAnalysis, setEditingAnalysis] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    value: '',
    technician_name: '',
    comments: '',
    sample_time: '',
  });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    // Установка фильтров по умолчанию: последние 7 дней
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    setFilterStartDate(startDate.toISOString().split('T')[0]);
    setFilterEndDate(endDate.toISOString().split('T')[0]);
  }, []);

  const handleShowAll = () => {
    // Показать все анализы с 2020 года по текущую дату + 1 год
    const startDate = new Date('2020-01-01');
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);
    setFilterStartDate(startDate.toISOString().split('T')[0]);
    setFilterEndDate(endDate.toISOString().split('T')[0]);
  };

  const handleResetFilters = () => {
    // Сброс на последние 7 дней
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    setFilterStartDate(startDate.toISOString().split('T')[0]);
    setFilterEndDate(endDate.toISOString().split('T')[0]);
    setFilterAnalysisType('all');
    setFilterShiftType('all');
  };

  useEffect(() => {
    if (filterStartDate && filterEndDate) {
      fetchAllAnalyses();
    }
  }, [filterStartDate, filterEndDate, filterAnalysisType, filterShiftType]);

  const fetchAllAnalyses = async () => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams({
        start_date: filterStartDate,
        end_date: filterEndDate,
        shift_type: filterShiftType,
        analysis_type: filterAnalysisType,
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

  const handleEdit = (analysis: any) => {
    setEditingAnalysis(analysis);
    const sampleTime = new Date(analysis.sample_time);
    const localTime = new Date(sampleTime.getTime() + 5 * 60 * 60 * 1000); // UTC+5
    setEditForm({
      value: analysis.value.toString(),
      technician_name: analysis.technician_name || '',
      comments: analysis.comments || '',
      sample_time: localTime.toISOString().slice(0, 16),
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnalysis) return;

    setUpdating(true);
    try {
      const numValue = parseFloat(editForm.value);
      if (isNaN(numValue) || numValue < 0) {
        setMessage({ type: 'error', text: 'Введите корректное значение' });
        setUpdating(false);
        return;
      }

      const response = await fetch(`/api/quality-analysis?id=${editingAnalysis.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: numValue,
          technician_name: editForm.technician_name || null,
          comments: editForm.comments || null,
          sample_time: editForm.sample_time,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Анализ успешно обновлен!' });
        setEditingAnalysis(null);
        fetchAllAnalyses();
      } else {
        setMessage({ type: 'error', text: data.error || 'Ошибка при обновлении' });
      }
    } catch (error) {
      console.error('Error updating analysis:', error);
      setMessage({ type: 'error', text: 'Ошибка при обновлении анализа' });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Фильтры */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-display font-bold text-slate-700 mb-4">ФИЛЬТРЫ</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-slate-600 mb-2">Начало периода</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-600 mb-2">Конец периода</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-600 mb-2">Тип анализа</label>
            <select
              value={filterAnalysisType}
              onChange={(e) => setFilterAnalysisType(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="all">Все анализы</option>
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

          <div>
            <label className="block text-xs text-slate-600 mb-2">Смена</label>
            <select
              value={filterShiftType}
              onChange={(e) => setFilterShiftType(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="all">Все смены</option>
              <option value="day">Дневная</option>
              <option value="night">Ночная</option>
            </select>
          </div>
        </div>

        {/* Кнопки быстрых действий */}
        <div className="flex flex-wrap gap-3 mt-4 items-center justify-between">
          <div className="flex gap-3">
            <button
              onClick={handleShowAll}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all shadow-sm"
            >
              📋 Показать все анализы
            </button>
            <button
              onClick={handleResetFilters}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-lg font-semibold transition-all"
            >
              🔄 Сбросить фильтры
            </button>
          </div>

          {/* Переключатель вида */}
          <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-4 py-2 rounded-md font-semibold text-sm transition-all ${
                viewMode === 'cards'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              📋 Карточки
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-md font-semibold text-sm transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              📊 Таблица
            </button>
          </div>
        </div>
      </div>

      {loadingList ? (
        <div className="text-center py-16">
          <div className="text-2xl text-slate-700 font-display">Загрузка анализов...</div>
        </div>
      ) : Object.keys(groupedByDay).length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="text-slate-700 text-lg mb-2">Нет анализов за выбранный период</div>
          <div className="text-slate-600 text-sm">Измените фильтры или добавьте новые анализы</div>
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

          {/* Вид карточек */}
          {viewMode === 'cards' && Object.keys(groupedByDay)
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
                            {/* Кнопки действий */}
                            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleEdit(analysis)}
                                className="p-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-all"
                                title="Редактировать анализ"
                              >
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(analysis.id)}
                                disabled={isDeleting}
                                className="p-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Удалить анализ"
                              >
                                <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-24">
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

          {/* Вид таблицы */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-blue-50 to-slate-50 border-b-2 border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Дата/Время</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Смена</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Тип анализа</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Значение</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Статус</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Норма</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Лаборант</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Комментарий</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {allAnalyses
                      .sort((a, b) => new Date(b.sample_time).getTime() - new Date(a.sample_time).getTime())
                      .map((analysis, index) => {
                        const conf = ANALYSIS_CONFIG[analysis.analysis_type as AnalysisType];
                        const stat = getAnalysisStatus(analysis.analysis_type, analysis.value);
                        const isDeleting = deletingId === analysis.id;
                        const sampleTime = new Date(analysis.sample_time);

                        return (
                          <tr
                            key={analysis.id}
                            className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-blue-50 transition-colors`}
                          >
                            <td className="px-4 py-3 text-sm font-mono text-slate-800 whitespace-nowrap">
                              {sampleTime.toLocaleString('ru-RU', {
                                day: '2-digit',
                                month: '2-digit',
                                year: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-700">
                              {analysis.shift_type === 'day' ? '☀ Дневная' : '🌙 Ночная'}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                              {conf?.label || analysis.analysis_type}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className="font-mono font-bold text-blue-600">
                                {analysis.value.toFixed(2)}{conf?.unit || ''}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex items-center gap-2">
                                <div className={`w-2.5 h-2.5 rounded-full ${
                                  stat === 'normal' ? 'bg-emerald-500' :
                                  stat === 'warning' ? 'bg-amber-500' :
                                  'bg-rose-500'
                                }`} />
                                <span className={`text-xs ${
                                  stat === 'normal' ? 'text-emerald-600' :
                                  stat === 'warning' ? 'text-amber-600' :
                                  'text-rose-600'
                                }`}>
                                  {stat === 'normal' ? 'В норме' :
                                   stat === 'warning' ? 'Близко' :
                                   'Вне нормы'}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-600 font-mono">
                              {conf ? `${conf.min}-${conf.max}${conf.unit}` : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-700">
                              {analysis.technician_name || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
                              {analysis.comments || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleEdit(analysis)}
                                  className="p-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-all"
                                  title="Редактировать"
                                >
                                  <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDelete(analysis.id)}
                                  disabled={isDeleting}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-all disabled:opacity-50"
                                  title="Удалить"
                                >
                                  <svg className="w-3.5 h-3.5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Модальное окно редактирования */}
      {editingAnalysis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-2xl">
              <h3 className="text-xl font-display font-bold text-slate-800">
                Редактирование анализа
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                {ANALYSIS_CONFIG[editingAnalysis.analysis_type as AnalysisType]?.label}
              </p>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-5">
              {/* Время отбора */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Время отбора пробы
                </label>
                <input
                  type="datetime-local"
                  value={editForm.sample_time}
                  onChange={(e) => setEditForm({ ...editForm, sample_time: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              {/* Значение */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Значение ({ANALYSIS_CONFIG[editingAnalysis.analysis_type as AnalysisType]?.unit})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.value}
                  onChange={(e) => setEditForm({ ...editForm, value: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border-2 border-slate-300 rounded-lg text-slate-800 font-mono text-lg focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              {/* Лаборант */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Лаборант
                </label>
                <input
                  type="text"
                  value={editForm.technician_name}
                  onChange={(e) => setEditForm({ ...editForm, technician_name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:border-blue-500 focus:outline-none"
                  placeholder="Имя лаборанта"
                />
              </div>

              {/* Комментарии */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Комментарии
                </label>
                <textarea
                  value={editForm.comments}
                  onChange={(e) => setEditForm({ ...editForm, comments: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:border-blue-500 focus:outline-none resize-none"
                  placeholder="Дополнительная информация..."
                />
              </div>

              {/* Кнопки */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all"
                >
                  {updating ? 'Сохранение...' : 'Сохранить изменения'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingAnalysis(null)}
                  disabled={updating}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:cursor-not-allowed text-slate-700 font-semibold rounded-lg transition-all"
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

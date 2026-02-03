'use client';

import { useState, useEffect, useMemo } from 'react';

// API URL основного сайта
const API_BASE_URL = 'https://altyn-shyghys.vercel.app/api/rafdez/tasks';

// Типы задач
type TaskCategory = 'construction' | 'equipment' | 'procurement' | 'installation' | 'commissioning' | 'other';
type TaskStatus = 'planned' | 'in_progress' | 'completed' | 'delayed';

interface ProjectTask {
  _id?: string;
  name: string;
  category: TaskCategory;
  startDate: string;
  endDate: string;
  responsible: string;
  status: TaskStatus;
  progress: number;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

const CATEGORIES: Record<TaskCategory, { label: string; color: string; bgColor: string }> = {
  construction: { label: 'Строительство', color: '#3b82f6', bgColor: 'bg-blue-500' },
  equipment: { label: 'Оборудование', color: '#8b5cf6', bgColor: 'bg-violet-500' },
  procurement: { label: 'Закупки', color: '#f59e0b', bgColor: 'bg-amber-500' },
  installation: { label: 'Монтаж', color: '#10b981', bgColor: 'bg-emerald-500' },
  commissioning: { label: 'Пусконаладка', color: '#ec4899', bgColor: 'bg-pink-500' },
  other: { label: 'Прочее', color: '#6b7280', bgColor: 'bg-gray-500' },
};

const STATUSES: Record<TaskStatus, { label: string; color: string }> = {
  planned: { label: 'Запланировано', color: 'text-slate-600 bg-slate-100' },
  in_progress: { label: 'В работе', color: 'text-blue-700 bg-blue-100' },
  completed: { label: 'Завершено', color: 'text-emerald-700 bg-emerald-100' },
  delayed: { label: 'Просрочено', color: 'text-red-700 bg-red-100' },
};

export default function RafdezPage() {
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [filterCategory, setFilterCategory] = useState<TaskCategory | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'gantt' | 'list'>('gantt');

  // Форма задачи
  const [formData, setFormData] = useState<Omit<ProjectTask, '_id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    category: 'construction',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    responsible: '',
    status: 'planned',
    progress: 0,
    description: '',
  });

  // Загрузка задач
  const fetchTasks = async () => {
    try {
      const response = await fetch(API_BASE_URL);
      const data = await response.json();
      if (data.success) {
        setTasks(data.data);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Сохранение задачи
  const handleSaveTask = async () => {
    try {
      const url = editingTask ? `${API_BASE_URL}/${editingTask._id}` : API_BASE_URL;
      const method = editingTask ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        fetchTasks();
        setShowAddModal(false);
        setEditingTask(null);
        resetForm();
      }
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  // Удаление задачи
  const handleDeleteTask = async (id: string) => {
    if (!confirm('Удалить задачу?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        fetchTasks();
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  // Сброс формы
  const resetForm = () => {
    setFormData({
      name: '',
      category: 'construction',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      responsible: '',
      status: 'planned',
      progress: 0,
      description: '',
    });
  };

  // Открытие модалки редактирования
  const openEditModal = (task: ProjectTask) => {
    setEditingTask(task);
    setFormData({
      name: task.name,
      category: task.category,
      startDate: task.startDate,
      endDate: task.endDate,
      responsible: task.responsible,
      status: task.status,
      progress: task.progress,
      description: task.description || '',
    });
    setShowAddModal(true);
  };

  // Фильтрация задач
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (filterCategory !== 'all' && task.category !== filterCategory) return false;
      if (filterStatus !== 'all' && task.status !== filterStatus) return false;
      return true;
    });
  }, [tasks, filterCategory, filterStatus]);

  // Расчет диапазона дат для Ганта
  const dateRange = useMemo(() => {
    if (filteredTasks.length === 0) {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 3, 0);
      return { start, end };
    }

    const dates = filteredTasks.flatMap((t) => [new Date(t.startDate), new Date(t.endDate)]);
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

    // Добавляем отступы
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 7);

    return { start: minDate, end: maxDate };
  }, [filteredTasks]);

  // Генерация месяцев для заголовка
  const months = useMemo(() => {
    const result: { label: string; days: number; startDay: number }[] = [];
    const current = new Date(dateRange.start);
    current.setDate(1);

    while (current <= dateRange.end) {
      const year = current.getFullYear();
      const month = current.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);

      const visibleStart = monthStart < dateRange.start ? dateRange.start : monthStart;
      const visibleEnd = monthEnd > dateRange.end ? dateRange.end : monthEnd;

      const startDay = Math.floor((visibleStart.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
      const days = Math.floor((visibleEnd.getTime() - visibleStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      result.push({
        label: current.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' }),
        days,
        startDay,
      });

      current.setMonth(current.getMonth() + 1);
    }

    return result;
  }, [dateRange]);

  // Общее количество дней
  const totalDays = Math.floor((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Расчет позиции задачи на Ганте
  const getTaskPosition = (task: ProjectTask) => {
    const start = new Date(task.startDate);
    const end = new Date(task.endDate);
    const today = new Date();

    const startOffset = Math.max(0, Math.floor((start.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)));
    const duration = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const leftPercent = (startOffset / totalDays) * 100;
    const widthPercent = (duration / totalDays) * 100;

    // Проверка просрочки
    const isOverdue = task.status !== 'completed' && end < today;

    return { leftPercent, widthPercent, isOverdue };
  };

  // Статистика
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const delayed = tasks.filter((t) => t.status === 'delayed').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;

    return { total, completed, delayed, inProgress };
  }, [tasks]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-xl text-slate-600">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Рафдез</h1>
                <p className="text-sm text-slate-500">Строительство цеха рафинирования и дезодорирования</p>
              </div>
            </div>
            <button
              onClick={() => {
                resetForm();
                setEditingTask(null);
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Добавить задачу
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Статистика */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-sm text-slate-500">Всего задач</div>
            <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-sm text-slate-500">В работе</div>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-sm text-slate-500">Завершено</div>
            <div className="text-2xl font-bold text-emerald-600">{stats.completed}</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-sm text-slate-500">Просрочено</div>
            <div className="text-2xl font-bold text-red-600">{stats.delayed}</div>
          </div>
        </div>

        {/* Фильтры */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600">Категория:</span>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as TaskCategory | 'all')}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Все</option>
                {Object.entries(CATEGORIES).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600">Статус:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as TaskStatus | 'all')}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Все</option>
                {Object.entries(STATUSES).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => setViewMode('gantt')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'gantt' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Диаграмма
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'list' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Список
              </button>
            </div>
          </div>
        </div>

        {/* Диаграмма Ганта */}
        {viewMode === 'gantt' && (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            {/* Заголовок с месяцами */}
            <div className="flex border-b border-slate-200">
              <div className="w-64 min-w-64 p-3 border-r border-slate-200 bg-slate-50 font-semibold text-sm text-slate-700">
                Задача
              </div>
              <div className="flex-1 flex bg-slate-50">
                {months.map((month, idx) => (
                  <div
                    key={idx}
                    className="border-r border-slate-200 px-2 py-3 text-xs font-semibold text-slate-600 text-center"
                    style={{ width: `${(month.days / totalDays) * 100}%` }}
                  >
                    {month.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Задачи */}
            {filteredTasks.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                Нет задач для отображения. Добавьте первую задачу!
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredTasks.map((task) => {
                  const { leftPercent, widthPercent, isOverdue } = getTaskPosition(task);
                  const category = CATEGORIES[task.category];

                  return (
                    <div key={task._id} className="flex hover:bg-slate-50 transition-colors">
                      {/* Название задачи */}
                      <div
                        className="w-64 min-w-64 p-3 border-r border-slate-200 cursor-pointer"
                        onClick={() => openEditModal(task)}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="text-sm font-medium text-slate-900 truncate">{task.name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500">{task.responsible}</span>
                          {isOverdue && (
                            <span className="text-xs text-red-600 font-medium">⚠ Просрочено</span>
                          )}
                        </div>
                      </div>

                      {/* Полоса Ганта */}
                      <div className="flex-1 relative py-3 px-1">
                        {/* Сегодняшняя линия */}
                        {(() => {
                          const today = new Date();
                          const todayOffset = Math.floor((today.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
                          const todayPercent = (todayOffset / totalDays) * 100;
                          if (todayPercent >= 0 && todayPercent <= 100) {
                            return (
                              <div
                                className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10"
                                style={{ left: `${todayPercent}%` }}
                              />
                            );
                          }
                          return null;
                        })()}

                        {/* Полоса задачи */}
                        <div
                          className="absolute h-8 rounded-md flex items-center px-2 cursor-pointer transition-transform hover:scale-y-110"
                          style={{
                            left: `${leftPercent}%`,
                            width: `${Math.max(widthPercent, 2)}%`,
                            backgroundColor: isOverdue ? '#ef4444' : category.color,
                            top: '50%',
                            transform: 'translateY(-50%)',
                          }}
                          onClick={() => openEditModal(task)}
                        >
                          {/* Прогресс */}
                          <div
                            className="absolute left-0 top-0 bottom-0 rounded-md opacity-30 bg-white"
                            style={{ width: `${task.progress}%` }}
                          />
                          <span className="text-xs text-white font-medium truncate relative z-10">
                            {task.progress}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Режим списка */}
        {viewMode === 'list' && (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Задача</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Категория</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Ответственный</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Сроки</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Статус</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Прогресс</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTasks.map((task) => {
                  const category = CATEGORIES[task.category];
                  const status = STATUSES[task.status];

                  return (
                    <tr key={task._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="text-sm font-medium text-slate-900">{task.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{category.label}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{task.responsible}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {new Date(task.startDate).toLocaleDateString('ru-RU')} — {new Date(task.endDate).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${task.progress}%`, backgroundColor: category.color }}
                            />
                          </div>
                          <span className="text-xs text-slate-600">{task.progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEditModal(task)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium mr-3"
                        >
                          Изменить
                        </button>
                        <button
                          onClick={() => task._id && handleDeleteTask(task._id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Удалить
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Легенда */}
        <div className="mt-6 bg-white rounded-lg border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Категории</h3>
          <div className="flex flex-wrap gap-4">
            {Object.entries(CATEGORIES).map(([key, { label, color }]) => (
              <div key={key} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
                <span className="text-sm text-slate-600">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Модальное окно добавления/редактирования */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">
                {editingTask ? 'Редактировать задачу' : 'Новая задача'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Название задачи *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Например: Заливка фундамента"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Категория
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as TaskCategory })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(CATEGORIES).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Статус
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(STATUSES).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Дата начала
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Дата окончания
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Ответственный *
                </label>
                <input
                  type="text"
                  value={formData.responsible}
                  onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ФИО ответственного"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Прогресс: {formData.progress}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.progress}
                  onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Описание
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Дополнительная информация..."
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingTask(null);
                  resetForm();
                }}
                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveTask}
                disabled={!formData.name || !formData.responsible}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg font-medium transition-colors"
              >
                {editingTask ? 'Сохранить' : 'Добавить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

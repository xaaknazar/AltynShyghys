'use client';

import { useState, useEffect, useMemo } from 'react';

// API URL основного сайта
const API_BASE_URL = 'https://altyn-shyghys.vercel.app/api/rafdez/tasks';
const LOG_API_URL = 'https://altyn-shyghys.vercel.app/api/rafdez/logs';

// Типы пользователей
type UserRole = 'project_manager' | 'director' | null;

interface User {
  username: string;
  name: string;
  role: UserRole;
}

// Пользователи системы
const USERS: Record<string, { password: string; name: string; role: UserRole }> = {
  'halil': { password: 'rafdez2026', name: 'Halil Polat', role: 'project_manager' },
  'azamat': { password: 'director2026', name: 'Azamat Tastambekov', role: 'director' },
};

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
  approved?: boolean;
  approvedBy?: string;
  approvedAt?: string;
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
  // Авторизация
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [filterCategory, setFilterCategory] = useState<TaskCategory | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'gantt' | 'list'>('gantt');

  // Форма задачи
  const [formData, setFormData] = useState<Omit<ProjectTask, '_id' | 'createdAt' | 'updatedAt' | 'approved' | 'approvedBy' | 'approvedAt'>>({
    name: '',
    category: 'construction',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    responsible: '',
    status: 'planned',
    progress: 0,
    description: '',
  });

  // Проверка сохраненной сессии
  useEffect(() => {
    const savedUser = localStorage.getItem('rafdez_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('rafdez_user');
      }
    }
  }, []);

  // Логин
  const handleLogin = () => {
    const user = USERS[loginForm.username.toLowerCase()];
    if (user && user.password === loginForm.password) {
      const loggedUser: User = {
        username: loginForm.username.toLowerCase(),
        name: user.name,
        role: user.role,
      };
      setCurrentUser(loggedUser);
      localStorage.setItem('rafdez_user', JSON.stringify(loggedUser));
      setShowLoginModal(false);
      setLoginForm({ username: '', password: '' });
      setLoginError('');
    } else {
      setLoginError('Неверный логин или пароль');
    }
  };

  // Выход
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('rafdez_user');
  };

  // Логирование в Google Sheets
  const logAction = async (
    action: 'create' | 'update' | 'delete' | 'approve' | 'revoke_approval',
    taskName: string,
    taskId?: string,
    changes?: string
  ) => {
    try {
      await fetch(LOG_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          taskName,
          taskId,
          user: currentUser?.name,
          userRole: currentUser?.role,
          changes,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Error logging action:', error);
    }
  };

  // Проверка прав на редактирование/удаление задачи
  const canEditTask = (task: ProjectTask): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'director') return true; // Директор может всё
    if (task.approved) return false; // Согласованные задачи нельзя редактировать (кроме директора)
    return true;
  };

  // Проверка прав на согласование
  const canApproveTask = (): boolean => {
    return currentUser?.role === 'project_manager';
  };

  // Согласование задачи
  const handleApproveTask = async (task: ProjectTask) => {
    if (!currentUser || !canApproveTask()) return;

    try {
      const response = await fetch(`${API_BASE_URL}/${task._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...task,
          approved: true,
          approvedBy: currentUser.name,
          approvedAt: new Date().toISOString(),
        }),
      });

      const data = await response.json();
      if (data.success) {
        await logAction('approve', task.name, task._id);
        fetchTasks();
      }
    } catch (error) {
      console.error('Error approving task:', error);
    }
  };

  // Отмена согласования (только директор)
  const handleRevokeApproval = async (task: ProjectTask) => {
    if (!currentUser || currentUser.role !== 'director') return;

    try {
      const response = await fetch(`${API_BASE_URL}/${task._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...task,
          approved: false,
          approvedBy: null,
          approvedAt: null,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await logAction('revoke_approval', task.name, task._id);
        fetchTasks();
      }
    } catch (error) {
      console.error('Error revoking approval:', error);
    }
  };

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
        // Логирование изменений
        if (editingTask) {
          // Формируем описание изменений
          const changes: string[] = [];
          if (editingTask.name !== formData.name) changes.push(`Название: "${editingTask.name}" → "${formData.name}"`);
          if (editingTask.status !== formData.status) changes.push(`Статус: ${editingTask.status} → ${formData.status}`);
          if (editingTask.progress !== formData.progress) changes.push(`Прогресс: ${editingTask.progress}% → ${formData.progress}%`);
          if (editingTask.startDate !== formData.startDate) changes.push(`Дата начала: ${editingTask.startDate} → ${formData.startDate}`);
          if (editingTask.endDate !== formData.endDate) changes.push(`Дата окончания: ${editingTask.endDate} → ${formData.endDate}`);
          if (editingTask.responsible !== formData.responsible) changes.push(`Ответственный: ${editingTask.responsible} → ${formData.responsible}`);
          if (editingTask.category !== formData.category) changes.push(`Категория: ${editingTask.category} → ${formData.category}`);

          await logAction('update', formData.name, editingTask._id, changes.join('; ') || 'Без изменений');
        } else {
          await logAction('create', formData.name, data.data?._id, `Категория: ${formData.category}, Ответственный: ${formData.responsible}`);
        }

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
    const task = tasks.find(t => t._id === id);
    if (!confirm('Удалить задачу?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        if (task) {
          await logAction('delete', task.name, id);
        }
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
    const planned = tasks.filter((t) => t.status === 'planned').length;

    // Общий прогресс проекта (средний прогресс всех задач)
    const overallProgress = total > 0
      ? Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / total)
      : 0;

    return { total, completed, delayed, inProgress, planned, overallProgress };
  }, [tasks]);

  // Позиция линии "Сегодня" на диаграмме
  const todayPosition = useMemo(() => {
    const today = new Date();
    const todayOffset = Math.floor((today.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    const percent = (todayOffset / totalDays) * 100;
    return { percent, isVisible: percent >= 0 && percent <= 100 };
  }, [dateRange, totalDays]);

  // Задачи с приближающимися дедлайнами (в течение 7 дней)
  const upcomingDeadlines = useMemo(() => {
    const today = new Date();
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    return tasks.filter((task) => {
      if (task.status === 'completed') return false;
      const endDate = new Date(task.endDate);
      return endDate >= today && endDate <= weekFromNow;
    }).sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
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
            <div className="flex items-center gap-4">
              {/* Информация о пользователе */}
              {currentUser ? (
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-900">{currentUser.name}</div>
                    <div className="text-xs text-slate-500">
                      {currentUser.role === 'project_manager' ? 'Проектный менеджер' : 'Директор'}
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="px-3 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
                  >
                    Выйти
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Войти
                </button>
              )}
              {currentUser && (
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
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Общий прогресс проекта */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Общий прогресс проекта</h2>
            <span className="text-3xl font-bold text-blue-600">{stats.overallProgress}%</span>
          </div>
          <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${stats.overallProgress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-500">
            <span>{stats.completed} из {stats.total} задач завершено</span>
            <span>Сегодня: {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Предупреждения о дедлайнах */}
        {upcomingDeadlines.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="font-semibold text-amber-800">Приближающиеся дедлайны ({upcomingDeadlines.length})</span>
            </div>
            <div className="space-y-2">
              {upcomingDeadlines.slice(0, 3).map((task) => {
                const daysLeft = Math.ceil((new Date(task.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={task._id} className="flex items-center justify-between text-sm">
                    <span className="text-amber-900">{task.name}</span>
                    <span className={`font-medium ${daysLeft <= 2 ? 'text-red-600' : 'text-amber-700'}`}>
                      {daysLeft === 0 ? 'Сегодня!' : daysLeft === 1 ? 'Завтра' : `${daysLeft} дней`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Статистика */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-sm text-slate-500">Всего задач</div>
            <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-sm text-slate-500">Запланировано</div>
            <div className="text-2xl font-bold text-slate-600">{stats.planned}</div>
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
            {/* Заголовок с месяцами и маркером "Сегодня" */}
            <div className="flex border-b border-slate-200">
              <div className="w-64 min-w-64 p-3 border-r border-slate-200 bg-slate-50 font-semibold text-sm text-slate-700">
                Задача
              </div>
              <div className="flex-1 flex bg-slate-50 relative">
                {/* Маркер "Сегодня" в заголовке */}
                {todayPosition.isVisible && (
                  <div
                    className="absolute top-0 bottom-0 flex flex-col items-center z-20"
                    style={{ left: `${todayPosition.percent}%`, transform: 'translateX(-50%)' }}
                  >
                    <div className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-b whitespace-nowrap">
                      Сегодня
                    </div>
                  </div>
                )}
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
                    <div key={task._id} className={`flex hover:bg-slate-50 transition-colors ${task.approved ? 'bg-green-50/30' : ''}`}>
                      {/* Название задачи */}
                      <div
                        className={`w-64 min-w-64 p-3 border-r border-slate-200 ${canEditTask(task) ? 'cursor-pointer' : ''}`}
                        onClick={() => canEditTask(task) && openEditModal(task)}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="text-sm font-medium text-slate-900 truncate">{task.name}</span>
                          {task.approved && (
                            <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500">{task.responsible}</span>
                          {isOverdue && (
                            <span className="text-xs text-red-600 font-medium">Просрочено</span>
                          )}
                          {task.approved && !canEditTask(task) && (
                            <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          )}
                        </div>
                      </div>

                      {/* Полоса Ганта */}
                      <div className="flex-1 relative py-3 px-1">
                        {/* Сегодняшняя линия (красная вертикальная) */}
                        {todayPosition.isVisible && (
                          <div
                            className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-10"
                            style={{ left: `${todayPosition.percent}%` }}
                          />
                        )}

                        {/* Полоса задачи */}
                        <div
                          className={`absolute h-8 rounded-md flex items-center px-2 transition-transform hover:scale-y-110 ${canEditTask(task) ? 'cursor-pointer' : ''}`}
                          style={{
                            left: `${leftPercent}%`,
                            width: `${Math.max(widthPercent, 2)}%`,
                            backgroundColor: isOverdue ? '#ef4444' : category.color,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            border: task.approved ? '2px solid #16a34a' : 'none',
                          }}
                          onClick={() => canEditTask(task) && openEditModal(task)}
                        >
                          {/* Прогресс */}
                          <div
                            className="absolute left-0 top-0 bottom-0 rounded-md opacity-30 bg-white"
                            style={{ width: `${task.progress}%` }}
                          />
                          <span className="text-xs text-white font-medium truncate relative z-10">
                            {task.progress}%
                          </span>
                          {/* Значок согласования */}
                          {task.approved && (
                            <svg className="w-3 h-3 text-white ml-1 flex-shrink-0 relative z-10" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
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
                    <tr key={task._id} className={`hover:bg-slate-50 ${task.approved ? 'bg-green-50/50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="text-sm font-medium text-slate-900">{task.name}</span>
                          {task.approved && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Согласовано
                            </span>
                          )}
                        </div>
                        {task.approved && task.approvedBy && (
                          <div className="text-xs text-green-600 mt-0.5 ml-5">
                            Согласовал: {task.approvedBy}
                          </div>
                        )}
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
                      <td className="px-4 py-3 text-right space-x-2">
                        {/* Кнопка согласования для Project Manager */}
                        {canApproveTask() && !task.approved && (
                          <button
                            onClick={() => handleApproveTask(task)}
                            className="text-green-600 hover:text-green-800 text-sm font-medium"
                          >
                            Согласовать
                          </button>
                        )}
                        {/* Кнопка отмены согласования для Директора */}
                        {currentUser?.role === 'director' && task.approved && (
                          <button
                            onClick={() => handleRevokeApproval(task)}
                            className="text-amber-600 hover:text-amber-800 text-sm font-medium"
                          >
                            Отменить согласование
                          </button>
                        )}
                        {/* Кнопка редактирования */}
                        {canEditTask(task) && (
                          <button
                            onClick={() => openEditModal(task)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Изменить
                          </button>
                        )}
                        {/* Кнопка удаления */}
                        {canEditTask(task) && (
                          <button
                            onClick={() => task._id && handleDeleteTask(task._id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Удалить
                          </button>
                        )}
                        {/* Показываем замок если нельзя редактировать */}
                        {!canEditTask(task) && currentUser && (
                          <span className="text-slate-400 text-sm flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Заблокировано
                          </span>
                        )}
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
          <div className="flex flex-wrap gap-8">
            <div>
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
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Обозначения</h3>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-[2px] bg-red-500" />
                  <span className="text-sm text-slate-600">Сегодня</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-500" />
                  <span className="text-sm text-slate-600">Просрочено</span>
                </div>
              </div>
            </div>
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

      {/* Модальное окно авторизации */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Вход в систему</h2>
              <p className="text-sm text-slate-500 mt-1">Введите логин и пароль для авторизации</p>
            </div>
            <div className="p-6 space-y-4">
              {loginError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {loginError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Логин
                </label>
                <input
                  type="text"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Введите логин"
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Пароль
                </label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Введите пароль"
                  autoComplete="current-password"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  setLoginForm({ username: '', password: '' });
                  setLoginError('');
                }}
                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleLogin}
                disabled={!loginForm.username || !loginForm.password}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg font-medium transition-colors"
              >
                Войти
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

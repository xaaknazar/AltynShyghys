'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';

// API URL основного сайта
const API_BASE_URL = 'https://altyn-shyghys.vercel.app/api/rafdez/tasks';

// === ТИПЫ ===
type TaskCategory = 'construction' | 'equipment' | 'procurement' | 'installation' | 'commissioning' | 'other';
type TaskStatus = 'planned' | 'in_progress' | 'completed' | 'delayed';
type UserRole = 'omts' | 'stroika' | 'power' | 'obs';

interface ProjectTask {
  _id?: string;
  name: string;
  object: string[];
  category: TaskCategory;
  startDate: string;
  endDate: string;
  responsible: string;
  status: TaskStatus;
  description?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

// === КОНСТАНТЫ ===
const CATEGORIES: Record<TaskCategory, { label: string; color: string; bgColor: string }> = {
  construction: { label: 'Строительство', color: '#3b82f6', bgColor: 'bg-blue-500' },
  equipment: { label: 'Оборудование', color: '#8b5cf6', bgColor: 'bg-violet-500' },
  procurement: { label: 'Закупки', color: '#f59e0b', bgColor: 'bg-amber-500' },
  installation: { label: 'Монтаж', color: '#10b981', bgColor: 'bg-emerald-500' },
  commissioning: { label: 'Пусконаладка', color: '#ec4899', bgColor: 'bg-pink-500' },
  other: { label: 'Прочее', color: '#6b7280', bgColor: 'bg-gray-500' },
};

const OBJECTS = [
  'Цех рафинации и дезодорации',
  'Склад',
  'Цех Розлива и фасовки',
  'Очистные сооружения и соапсток',
  'Градирни',
  'Станция оборотного водоснабжения',
  'Компрессорная станция и подстанция',
];

const STATUSES: Record<TaskStatus, { label: string; color: string }> = {
  planned: { label: 'Запланировано', color: 'text-slate-600 bg-slate-100' },
  in_progress: { label: 'В работе', color: 'text-blue-700 bg-blue-100' },
  completed: { label: 'Завершено', color: 'text-emerald-700 bg-emerald-100' },
  delayed: { label: 'Просрочено', color: 'text-red-700 bg-red-100' },
};

const ROLES: Record<UserRole, { label: string; password: string; color: string }> = {
  omts: { label: 'Снабжение', password: 'omts', color: 'bg-slate-100 text-slate-700' },
  stroika: { label: 'Строительство', password: 'stroika', color: 'bg-slate-100 text-slate-700' },
  power: { label: 'Энергетика', password: 'power', color: 'bg-slate-100 text-slate-700' },
  obs: { label: 'Наблюдатель', password: 'obs', color: 'bg-slate-100 text-slate-700' },
};

const AUTH_STORAGE_KEY = 'rafdez_user_role';

export default function RafdezPage() {
  // === АУТЕНТИФИКАЦИЯ ===
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // === ЗАДАЧИ ===
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [filterCategory, setFilterCategory] = useState<TaskCategory | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [filterObjects, setFilterObjects] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'gantt' | 'list'>('gantt');

  // Форма задачи
  const [formData, setFormData] = useState<Omit<ProjectTask, '_id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    object: [],
    category: 'construction',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    responsible: '',
    status: 'planned',
    description: '',
  });

  // Проверка авторизации при загрузке
  useEffect(() => {
    try {
      const savedRole = localStorage.getItem(AUTH_STORAGE_KEY) as UserRole | null;
      if (savedRole && ROLES[savedRole]) {
        setUserRole(savedRole);
      }
    } catch {
      // localStorage недоступен
    }
    setAuthChecked(true);
  }, []);

  // Вход
  const handleLogin = () => {
    const entry = Object.entries(ROLES).find(([, r]) => r.password === loginPassword);
    if (entry) {
      const role = entry[0] as UserRole;
      setUserRole(role);
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, role);
      } catch {
        // localStorage недоступен
      }
      setLoginError('');
      setLoginPassword('');
    } else {
      setLoginError('Неверный пароль');
    }
  };

  // Выход
  const handleLogout = () => {
    setUserRole(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // localStorage недоступен
    }
  };

  // Проверка прав на редактирование/удаление задачи
  const canEditTask = useCallback((task: ProjectTask) => {
    if (!userRole) return false;
    if (userRole === 'obs') return true;
    return !task.createdBy || task.createdBy === userRole;
  }, [userRole]);

  // === ЗАГРУЗКА ДАННЫХ ===
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const response = await fetch(API_BASE_URL, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setTasks(data.data || []);
      } else {
        setFetchError(data.error || 'Не удалось загрузить задачи');
      }
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      setFetchError(error.message || 'Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userRole) {
      fetchTasks();
    }
  }, [userRole, fetchTasks]);

  // === CRUD ОПЕРАЦИИ ===
  const handleSaveTask = async () => {
    try {
      const url = editingTask ? `${API_BASE_URL}/${editingTask._id}` : API_BASE_URL;
      const method = editingTask ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        createdBy: editingTask ? editingTask.createdBy : userRole,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        fetchTasks();
        setShowAddModal(false);
        setEditingTask(null);
        resetForm();
      } else {
        alert(data.error || 'Ошибка сохранения');
      }
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Ошибка соединения с сервером');
    }
  };

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

  const resetForm = () => {
    setFormData({
      name: '',
      object: [],
      category: 'construction',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      responsible: '',
      status: 'planned',
      description: '',
    });
  };

  const openEditModal = (task: ProjectTask) => {
    if (!canEditTask(task)) return;
    setEditingTask(task);
    setFormData({
      name: task.name,
      object: Array.isArray(task.object) ? task.object : (task.object ? [task.object] : []),
      category: task.category,
      startDate: task.startDate,
      endDate: task.endDate,
      responsible: task.responsible,
      status: task.status,
      description: task.description || '',
    });
    setShowAddModal(true);
  };

  // === УНИКАЛЬНЫЕ ОБЪЕКТЫ ===
  const uniqueObjects = useMemo(() => {
    const objects = tasks.map((t) => t.object).filter(Boolean);
    return Array.from(new Set(objects)).sort();
  }, [tasks]);

  // === ФИЛЬТРАЦИЯ ===
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (filterCategory !== 'all' && task.category !== filterCategory) return false;
      if (filterStatus !== 'all' && task.status !== filterStatus) return false;
      if (filterObjects.length > 0) {
        const taskObjects = Array.isArray(task.object) ? task.object : (task.object ? [task.object] : []);
        if (!taskObjects.some((o) => filterObjects.includes(o))) return false;
      }
      return true;
    });
  }, [tasks, filterCategory, filterStatus, filterObjects]);

  // === ДИАГРАММА ГАНТА ===
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

    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 7);

    return { start: minDate, end: maxDate };
  }, [filteredTasks]);

  const months = useMemo(() => {
    const result: { label: string; days: number; startDay: number }[] = [];
    const current = new Date(dateRange.start);
    current.setDate(1);

    while (current <= dateRange.end) {
      const year = current.getFullYear();
      const month = current.getMonth();
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

  const totalDays = Math.floor((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const getTaskPosition = (task: ProjectTask) => {
    const start = new Date(task.startDate);
    const end = new Date(task.endDate);
    const today = new Date();

    const startOffset = Math.max(0, Math.floor((start.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)));
    const duration = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const leftPercent = (startOffset / totalDays) * 100;
    const widthPercent = (duration / totalDays) * 100;

    const isOverdue = task.status !== 'completed' && end < today;

    return { leftPercent, widthPercent, isOverdue };
  };

  // === СТАТИСТИКА ===
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const delayed = tasks.filter((t) => t.status === 'delayed').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;

    return { total, completed, delayed, inProgress };
  }, [tasks]);

  // === ЭКРАН ЗАГРУЗКИ (проверка авторизации) ===
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-xl text-slate-600">Загрузка...</div>
      </div>
    );
  }

  // === ЭКРАН ВХОДА ===
  if (!userRole) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          {/* Заголовок */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Рафдез</h1>
            <p className="text-slate-500 text-sm mt-1">Управление строительством</p>
          </div>

          {/* Поле пароля */}
          <div className="space-y-4">
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => {
                setLoginPassword(e.target.value);
                setLoginError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleLogin();
              }}
              className="w-full h-12 px-4 bg-slate-100 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 text-base placeholder:text-slate-400"
              placeholder="Пароль"
              autoFocus
            />
            {loginError && (
              <p className="text-sm text-red-500">{loginError}</p>
            )}
            <button
              onClick={handleLogin}
              disabled={!loginPassword}
              className="w-full h-12 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-lg font-medium text-base transition-colors"
            >
              Войти
            </button>
          </div>
        </div>
      </div>
    );
  }

  // === ЗАГРУЗКА ЗАДАЧ ===
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg text-slate-600">Загрузка задач...</div>
        </div>
      </div>
    );
  }

  // === ОШИБКА ЗАГРУЗКИ ===
  if (fetchError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg border border-red-200 p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Ошибка загрузки</h2>
          <p className="text-slate-600 mb-6">{fetchError}</p>
          <button
            onClick={fetchTasks}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  const roleInfo = ROLES[userRole];

  // === ОСНОВНОЙ ДАШБОРД ===
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="container mx-auto px-3 sm:px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">Рафдез</h1>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-sm text-slate-500">{roleInfo.label}</span>
              <button
                onClick={() => {
                  resetForm();
                  setEditingTask(null);
                  setShowAddModal(true);
                }}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Добавить задачу
              </button>
              <button
                onClick={handleLogout}
                className="px-3 py-2 text-slate-400 hover:text-red-600 rounded-lg text-sm transition-colors"
              >
                Выйти
              </button>
            </div>
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
          {/* Объекты — чипы с мультивыбором */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-slate-600">Объекты:</span>
              {filterObjects.length > 0 && (
                <button
                  onClick={() => setFilterObjects([])}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Сбросить
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {OBJECTS.map((obj) => {
                const isSelected = filterObjects.includes(obj);
                return (
                  <button
                    key={obj}
                    onClick={() => {
                      setFilterObjects((prev) =>
                        isSelected ? prev.filter((o) => o !== obj) : [...prev, obj]
                      );
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isSelected
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {obj}
                  </button>
                );
              })}
            </div>
          </div>
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
                onClick={fetchTasks}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                title="Обновить данные"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
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
              <div className="flex-1 relative bg-slate-50">
                <div className="flex h-full">
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
                {/* Сегодняшняя дата над линией */}
                {(() => {
                  const today = new Date();
                  const todayOffset = Math.floor((today.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
                  const todayPercent = (todayOffset / totalDays) * 100;
                  if (todayPercent >= 0 && todayPercent <= 100) {
                    return (
                      <>
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10"
                          style={{ left: `${todayPercent}%` }}
                        />
                        <div
                          className="absolute top-0 z-20 -translate-x-1/2 bg-red-500 text-white text-xs font-medium px-1.5 py-0.5 rounded-b"
                          style={{ left: `${todayPercent}%` }}
                        >
                          {today.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                        </div>
                      </>
                    );
                  }
                  return null;
                })()}
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
                  const editable = canEditTask(task);

                  return (
                    <div key={task._id} className="flex hover:bg-slate-50 transition-colors">
                      {/* Название задачи */}
                      <div
                        className={`w-64 min-w-64 p-3 border-r border-slate-200 ${editable ? 'cursor-pointer' : ''}`}
                        onClick={() => editable && openEditModal(task)}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="text-sm font-medium text-slate-900 break-words">{task.name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500">{task.responsible}</span>
                          {task.createdBy && ROLES[task.createdBy as UserRole] && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${ROLES[task.createdBy as UserRole].color}`}>
                              {ROLES[task.createdBy as UserRole].label}
                            </span>
                          )}
                          {isOverdue && (
                            <span className="text-xs text-red-600 font-medium">Просрочено</span>
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
                          className={`absolute h-6 rounded-md flex items-center justify-between px-2 transition-transform ${editable ? 'cursor-pointer hover:scale-y-110' : ''}`}
                          style={{
                            left: `${leftPercent}%`,
                            width: `${Math.max(widthPercent, 2)}%`,
                            backgroundColor: isOverdue ? '#ef4444' : category.color,
                            top: '50%',
                            transform: 'translateY(-50%)',
                          }}
                          onClick={() => editable && openEditModal(task)}
                        >
                          <span className="text-xs text-white font-medium">
                            {new Date(task.startDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                          </span>
                          <span className="text-xs text-white font-medium">
                            {new Date(task.endDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
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
            {filteredTasks.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                Нет задач для отображения. Добавьте первую задачу!
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Задача</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Объект</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Категория</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Ответственный</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Сроки</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Статус</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Отдел</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTasks.map((task) => {
                    const category = CATEGORIES[task.category];
                    const status = STATUSES[task.status];
                    const editable = canEditTask(task);
                    const creatorRole = task.createdBy && ROLES[task.createdBy as UserRole];

                    return (
                      <tr key={task._id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: category.color }}
                            />
                            <span className="text-sm font-medium text-slate-900">{task.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{Array.isArray(task.object) ? task.object.join(', ') : (task.object || '—')}</td>
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
                          {creatorRole ? (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${creatorRole.color}`}>
                              {creatorRole.label}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {editable && (
                            <>
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
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
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
              <p className="text-sm text-slate-500 mt-1">
                Отдел: {roleInfo.label}
              </p>
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Объекты
                </label>
                <div className="flex flex-wrap gap-2">
                  {OBJECTS.map((obj) => {
                    const isSelected = formData.object.includes(obj);
                    return (
                      <button
                        key={obj}
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            object: isSelected
                              ? formData.object.filter((o) => o !== obj)
                              : [...formData.object, obj],
                          });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          isSelected
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {obj}
                      </button>
                    );
                  })}
                </div>
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

'use client';

import { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Тип данных для отгрузки
interface ShippingData {
  date: string;
  time?: string;
  cistern: string;
  brutto: number;
  tara: number;
  netto: number;
  pressed: number;
  extraction: number;
  buyer: string;
  mixLevel: string;
  sample?: string;
  moisture?: number;
  acidNumber?: number;
  peroxideNumber?: number;
  phosphorus?: number;
  sediment?: number;
}

type PeriodFilter = 'week' | 'month' | 'year' | 'season' | 'all';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ShippingPage() {
  const [shippingData, setShippingData] = useState<ShippingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Загрузка данных из API
  useEffect(() => {
    const fetchShippingData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/shipping', { cache: 'no-store' });
        const result = await response.json();

        if (result.success) {
          setShippingData(result.data);
        } else {
          setError(result.error || 'Не удалось загрузить данные');
        }
      } catch (err) {
        console.error('Error fetching shipping data:', err);
        setError('Не удалось подключиться к серверу');
      } finally {
        setLoading(false);
      }
    };

    fetchShippingData();
  }, []);

  // Парсинг даты
  const parseDate = (dateStr: string): Date => {
    const [day, month, year] = dateStr.split('.');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  };

  // Фильтрация данных по периоду
  const filteredData = useMemo(() => {
    if (shippingData.length === 0) return [];

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfSeason = new Date(now.getFullYear(), 8, 1); // Сезон с сентября

    return shippingData.filter(item => {
      const itemDate = parseDate(item.date);

      if (periodFilter === 'week') {
        return itemDate >= startOfWeek;
      } else if (periodFilter === 'month') {
        return itemDate >= startOfMonth;
      } else if (periodFilter === 'year') {
        return itemDate >= startOfYear;
      } else if (periodFilter === 'season') {
        return itemDate >= startOfSeason;
      } else if (periodFilter === 'all') {
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          return itemDate >= start && itemDate <= end;
        }
        return true;
      }
      return true;
    });
  }, [shippingData, periodFilter, customStartDate, customEndDate]);

  // Статистика по месяцам
  const monthlyStats = useMemo(() => {
    const stats: Record<string, { netto: number; pressed: number; extraction: number }> = {};

    filteredData.forEach(item => {
      const [day, month, year] = item.date.split('.');
      const monthKey = `${month}.${year}`;

      if (!stats[monthKey]) {
        stats[monthKey] = { netto: 0, pressed: 0, extraction: 0 };
      }
      stats[monthKey].netto += item.netto;
      stats[monthKey].pressed += item.pressed;
      stats[monthKey].extraction += item.extraction;
    });

    return Object.entries(stats).map(([month, data]) => ({
      month,
      netto: parseFloat(data.netto.toFixed(2)),
      pressed: parseFloat(data.pressed.toFixed(2)),
      extraction: parseFloat(data.extraction.toFixed(2)),
    })).sort((a, b) => {
      const [monthA, yearA] = a.month.split('.');
      const [monthB, yearB] = b.month.split('.');
      return new Date(parseInt(yearA), parseInt(monthA) - 1).getTime() -
             new Date(parseInt(yearB), parseInt(monthB) - 1).getTime();
    });
  }, [filteredData]);

  // Статистика по покупателям
  const buyerStats = useMemo(() => {
    const stats: Record<string, { netto: number; pressed: number; extraction: number; count: number }> = {};

    filteredData.forEach(item => {
      if (!stats[item.buyer]) {
        stats[item.buyer] = { netto: 0, pressed: 0, extraction: 0, count: 0 };
      }
      stats[item.buyer].netto += item.netto;
      stats[item.buyer].pressed += item.pressed;
      stats[item.buyer].extraction += item.extraction;
      stats[item.buyer].count += 1;
    });

    return Object.entries(stats).map(([buyer, data]) => ({
      name: buyer,
      netto: parseFloat(data.netto.toFixed(2)),
      pressed: parseFloat(data.pressed.toFixed(2)),
      extraction: parseFloat(data.extraction.toFixed(2)),
      count: data.count,
    })).sort((a, b) => b.netto - a.netto);
  }, [filteredData]);

  // Общая статистика
  const totalStats = useMemo(() => {
    const total = {
      netto: 0,
      pressed: 0,
      extraction: 0,
      count: filteredData.length,
    };

    filteredData.forEach(item => {
      total.netto += item.netto;
      total.pressed += item.pressed;
      total.extraction += item.extraction;
    });

    return {
      netto: parseFloat(total.netto.toFixed(2)),
      pressed: parseFloat(total.pressed.toFixed(2)),
      extraction: parseFloat(total.extraction.toFixed(2)),
      count: total.count,
    };
  }, [filteredData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="text-2xl text-slate-700 font-display mb-2">Загрузка данных...</div>
          <div className="text-sm text-slate-500">Подключение к Google Sheets</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
        <div className="text-red-800 font-semibold mb-2">Ошибка загрузки данных</div>
        <div className="text-red-600 text-sm">{error}</div>
      </div>
    );
  }

  if (shippingData.length === 0) {
    return (
      <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-6">
        <div className="text-slate-700 font-semibold mb-2">Нет данных</div>
        <div className="text-slate-600 text-sm">Данные отгрузки не найдены</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Фильтры периода */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Выберите период</h2>
        <div className="flex flex-wrap gap-3 mb-4">
          <button
            onClick={() => setPeriodFilter('week')}
            className={`px-4 py-2 text-sm font-semibold rounded transition-colors ${
              periodFilter === 'week'
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            За неделю
          </button>
          <button
            onClick={() => setPeriodFilter('month')}
            className={`px-4 py-2 text-sm font-semibold rounded transition-colors ${
              periodFilter === 'month'
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            С начала месяца
          </button>
          <button
            onClick={() => setPeriodFilter('year')}
            className={`px-4 py-2 text-sm font-semibold rounded transition-colors ${
              periodFilter === 'year'
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            С начала года
          </button>
          <button
            onClick={() => setPeriodFilter('season')}
            className={`px-4 py-2 text-sm font-semibold rounded transition-colors ${
              periodFilter === 'season'
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            С начала сезона
          </button>
          <button
            onClick={() => setPeriodFilter('all')}
            className={`px-4 py-2 text-sm font-semibold rounded transition-colors ${
              periodFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            За весь период
          </button>
        </div>

        {/* Произвольный период */}
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-2">Начало периода</label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => {
                setCustomStartDate(e.target.value);
                setPeriodFilter('all');
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-2">Конец периода</label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => {
                setCustomEndDate(e.target.value);
                setPeriodFilter('all');
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Общая статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border-2 border-slate-200 rounded-lg p-5">
          <div className="text-xs uppercase tracking-wider font-semibold text-slate-600 mb-3">
            Всего отгружено (нетто)
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tabular-nums text-slate-900">
              {totalStats.netto.toFixed(1)}
            </span>
            <span className="text-lg text-slate-600 font-medium">т</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-200">
            <div className="text-xs text-slate-500">
              Количество отгрузок: {totalStats.count}
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-slate-200 rounded-lg p-5">
          <div className="text-xs uppercase tracking-wider font-semibold text-slate-600 mb-3">
            Прессовое масло
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tabular-nums text-blue-600">
              {totalStats.pressed.toFixed(1)}
            </span>
            <span className="text-lg text-slate-600 font-medium">т</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-200">
            <div className="text-xs text-slate-600">
              {totalStats.netto > 0 ? ((totalStats.pressed / totalStats.netto) * 100).toFixed(1) : 0}% от общего объема
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-slate-200 rounded-lg p-5">
          <div className="text-xs uppercase tracking-wider font-semibold text-slate-600 mb-3">
            Экстракционное масло
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tabular-nums text-emerald-600">
              {totalStats.extraction.toFixed(1)}
            </span>
            <span className="text-lg text-slate-600 font-medium">т</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-200">
            <div className="text-xs text-slate-600">
              {totalStats.netto > 0 ? ((totalStats.extraction / totalStats.netto) * 100).toFixed(1) : 0}% от общего объема
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-slate-200 rounded-lg p-5">
          <div className="text-xs uppercase tracking-wider font-semibold text-slate-600 mb-3">
            Средняя отгрузка
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tabular-nums text-amber-600">
              {totalStats.count > 0 ? (totalStats.netto / totalStats.count).toFixed(1) : 0}
            </span>
            <span className="text-lg text-slate-600 font-medium">т</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-200">
            <div className="text-xs text-slate-500">
              На одну отгрузку
            </div>
          </div>
        </div>
      </div>

      {/* График по месяцам */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-6">
          Отгрузки по месяцам (нетто, т)
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={monthlyStats}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: '12px' }} />
            <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="netto" fill="#3b82f6" name="Нетто (т)" />
            <Bar dataKey="pressed" fill="#8b5cf6" name="Прессовое (т)" />
            <Bar dataKey="extraction" fill="#10b981" name="Экстракционное (т)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Таблица с детальными данными */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">
            Детальная информация по отгрузкам
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Дата</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Цистерна</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Брутто, т</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Тара, т</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Нетто, т</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Прессовое, т</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Экстракц., т</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Покупатель</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Смесь</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900 whitespace-nowrap">{item.date}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{item.cistern}</td>
                  <td className="px-4 py-3 text-sm font-mono text-slate-900 text-right tabular-nums">{item.brutto.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm font-mono text-slate-600 text-right tabular-nums">{item.tara.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm font-mono font-bold text-slate-900 text-right tabular-nums">{item.netto.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm font-mono text-blue-600 text-right tabular-nums">{item.pressed.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm font-mono text-emerald-600 text-right tabular-nums">{item.extraction.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-700">{item.buyer}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{item.mixLevel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Статистика по покупателям */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-6">
          Сводная статистика по покупателям
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {buyerStats.map((buyer, idx) => (
            <div key={idx} className="border-2 border-slate-200 rounded-lg p-4">
              <div className="text-sm font-bold text-slate-900 mb-2">{buyer.name}</div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Нетто:</span>
                  <span className="font-mono font-bold text-slate-900">{buyer.netto.toFixed(1)} т</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Прессовое:</span>
                  <span className="font-mono text-blue-600">{buyer.pressed.toFixed(1)} т</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Экстракционное:</span>
                  <span className="font-mono text-emerald-600">{buyer.extraction.toFixed(1)} т</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                  <span className="text-slate-600">Отгрузок:</span>
                  <span className="font-bold text-slate-900">{buyer.count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

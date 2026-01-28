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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ShippingPage() {
  const [shippingData, setShippingData] = useState<ShippingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('11');

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

  // Получение уникальных месяцев из данных
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    shippingData.forEach(item => {
      const [day, month, year] = item.date.split('.');
      if (month) months.add(month);
    });
    return Array.from(months).sort();
  }, [shippingData]);

  // Автоматически выбираем последний доступный месяц
  useEffect(() => {
    if (availableMonths.length > 0 && !availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[availableMonths.length - 1]);
    }
  }, [availableMonths, selectedMonth]);

  // Фильтрация данных по выбранному месяцу
  const filteredData = useMemo(() => {
    return shippingData.filter(item => {
      const [day, month, year] = item.date.split('.');
      return month === selectedMonth;
    });
  }, [shippingData, selectedMonth]);

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

  // Статистика по дням
  const dailyStats = useMemo(() => {
    const stats: Record<string, { netto: number; pressed: number; extraction: number }> = {};

    filteredData.forEach(item => {
      if (!stats[item.date]) {
        stats[item.date] = { netto: 0, pressed: 0, extraction: 0 };
      }
      stats[item.date].netto += item.netto;
      stats[item.date].pressed += item.pressed;
      stats[item.date].extraction += item.extraction;
    });

    return Object.entries(stats).map(([date, data]) => ({
      date,
      netto: parseFloat(data.netto.toFixed(2)),
      pressed: parseFloat(data.pressed.toFixed(2)),
      extraction: parseFloat(data.extraction.toFixed(2)),
    })).sort((a, b) => a.date.localeCompare(b.date));
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
      {/* Фильтр по месяцам */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Выберите месяц</h2>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:border-slate-500 focus:outline-none"
          >
            {availableMonths.map(month => (
              <option key={month} value={month}>
                {new Date(2025, parseInt(month) - 1, 1).toLocaleDateString('ru-RU', { month: 'long' })}
              </option>
            ))}
          </select>
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

      {/* Графики */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* График отгрузок по покупателям */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">
            Отгрузки по покупателям (нетто, т)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={buyerStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '12px' }} />
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
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* График типов масла по покупателям */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">
            Типы масла по покупателям
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={buyerStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '12px' }} />
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
              <Bar dataKey="pressed" fill="#3b82f6" name="Прессовое (т)" />
              <Bar dataKey="extraction" fill="#10b981" name="Экстракционное (т)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* График по дням */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-6">
          Отгрузки по дням (нетто, т)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dailyStats}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '12px' }} />
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

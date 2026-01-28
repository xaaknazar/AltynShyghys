'use client';

import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

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
  phosphorusAlt?: number;
  sediment?: number;
}

// Данные из Google Sheets
const shippingData: ShippingData[] = [
  { date: '01.11.2025', cistern: '73110421', brutto: 92.95, tara: 27.15, netto: 65.8, pressed: 46.06, extraction: 19.74, buyer: 'САЗ', mixLevel: '70% 30%', sample: '11/02', moisture: 0.2, acidNumber: 1.2, peroxideNumber: 5, phosphorus: 0.5, phosphorusAlt: 197, sediment: 1.3 },
  { date: '01.11.2025', cistern: '73113441', brutto: 92.85, tara: 27.2, netto: 65.65, pressed: 45.955, extraction: 19.695, buyer: 'САЗ', mixLevel: '70% 30%', sample: '11/03', moisture: 0.2, acidNumber: 1.5, peroxideNumber: 5, phosphorus: 0.5, phosphorusAlt: 197, sediment: 1.3 },
  { date: '01.11.2025', cistern: '73111130', brutto: 93.05, tara: 27.2, netto: 65.85, pressed: 46.095, extraction: 19.755, buyer: 'САЗ', mixLevel: '70% 30%', sample: '11/05', moisture: 0.2, acidNumber: 1.1, peroxideNumber: 5, phosphorus: 0.5, phosphorusAlt: 197, sediment: 1.2 },
  { date: '01.11.2025', cistern: '73115461', brutto: 92.8, tara: 27.15, netto: 65.65, pressed: 45.955, extraction: 19.695, buyer: 'САЗ', mixLevel: '70% 30%', sample: '11/06', moisture: 0.2, acidNumber: 1.1, peroxideNumber: 5, phosphorus: 0.5, phosphorusAlt: 197, sediment: 1.3 },
  { date: '01.11.2025', cistern: '73214082', brutto: 92.9, tara: 27, netto: 65.9, pressed: 46.13, extraction: 19.77, buyer: 'САЗ', mixLevel: '70% 30%', sample: '11/09', moisture: 0.2, acidNumber: 1.2, peroxideNumber: 5, phosphorus: 0.6, phosphorusAlt: 236, sediment: 1.6 },
  { date: '01.11.2025', cistern: '73214140', brutto: 92.75, tara: 27.15, netto: 65.6, pressed: 45.92, extraction: 19.68, buyer: 'САЗ', mixLevel: '70% 30%', sample: '11/10', moisture: 0.2, acidNumber: 1.2, peroxideNumber: 5, phosphorus: 0.5, phosphorusAlt: 197, sediment: 1.5 },
  { date: '02.11.2025', cistern: '16188', brutto: 38.92, tara: 14.78, netto: 24.14, pressed: 19.312, extraction: 4.828, buyer: 'КНР', mixLevel: '80% 20%', sample: '11/12', moisture: 0.2, acidNumber: 1.2, peroxideNumber: 5, phosphorus: 0.3, phosphorusAlt: 118, sediment: 1.5 },
  { date: '02.11.2025', cistern: '17101', brutto: 43.88, tara: 16.92, netto: 26.96, pressed: 21.568, extraction: 5.392, buyer: 'КНР', mixLevel: '80% 20%', sample: '11/13', moisture: 0.2, acidNumber: 1.2, peroxideNumber: 5, phosphorus: 0.3, phosphorusAlt: 118, sediment: 1.3 },
  { date: '02.11.2025', cistern: '16370', brutto: 44.62, tara: 17.64, netto: 26.98, pressed: 21.584, extraction: 5.396, buyer: 'КНР', mixLevel: '80% 20%', sample: '11/14', moisture: 0.2, acidNumber: 1.1, peroxideNumber: 5, phosphorus: 0.3, phosphorusAlt: 118, sediment: 1.3 },
  { date: '02.11.2025', cistern: '16606', brutto: 42.92, tara: 15.94, netto: 26.98, pressed: 21.584, extraction: 5.396, buyer: 'КНР', mixLevel: '80% 20%', sample: '11/17', moisture: 0.2, acidNumber: 1.2, peroxideNumber: 5, phosphorus: 0.3, phosphorusAlt: 118, sediment: 1.2 },
  { date: '02.11.2025', cistern: '72816', brutto: 43.16, tara: 16.24, netto: 26.92, pressed: 21.536, extraction: 5.384, buyer: 'КНР', mixLevel: '80% 20%', sample: '11/18', moisture: 0.2, acidNumber: 1.2, peroxideNumber: 5, phosphorus: 0.3, phosphorusAlt: 118, sediment: 1.2 },
  { date: '02.11.2025', cistern: '16212', brutto: 44.28, tara: 17.3, netto: 26.98, pressed: 21.584, extraction: 5.396, buyer: 'КНР', mixLevel: '80% 20%', sample: '11/19', moisture: 0.2, acidNumber: 1.2, peroxideNumber: 5, phosphorus: 0.3, phosphorusAlt: 118, sediment: 1.2 },
  { date: '02.11.2025', cistern: '73107468', brutto: 92.7, tara: 27, netto: 65.7, pressed: 45.99, extraction: 19.71, buyer: 'САЗ', mixLevel: '70% 30%', sample: '11/21', moisture: 0.2, acidNumber: 1.1, peroxideNumber: 5, phosphorus: 0.3, phosphorusAlt: 118, sediment: 1.2 },
  { date: '02.11.2025', cistern: '73110348', brutto: 92.7, tara: 27.05, netto: 65.65, pressed: 45.955, extraction: 19.695, buyer: 'САЗ', mixLevel: '70% 30%', sample: '11/22', moisture: 0.2, acidNumber: 1.1, peroxideNumber: 5, phosphorus: 0.3, phosphorusAlt: 118, sediment: 1.2 },
  { date: '02.11.2025', cistern: '73113011', brutto: 92.8, tara: 27.05, netto: 65.75, pressed: 46.025, extraction: 19.725, buyer: 'САЗ', mixLevel: '70% 30%', sample: '11/24', moisture: 0.2, acidNumber: 1.1, peroxideNumber: 5, phosphorus: 0.3, phosphorusAlt: 118, sediment: 1.3 },
  { date: '02.11.2025', cistern: '73115024', brutto: 92.7, tara: 26.95, netto: 65.75, pressed: 46.025, extraction: 19.725, buyer: 'САЗ', mixLevel: '70% 30%', sample: '11/25', moisture: 0.2, acidNumber: 1.1, peroxideNumber: 5, phosphorus: 0.3, phosphorusAlt: 118, sediment: 1.3 },
  { date: '02.11.2025', cistern: '73110272', brutto: 92.8, tara: 27.2, netto: 65.6, pressed: 45.92, extraction: 19.68, buyer: 'САЗ', mixLevel: '70% 30%', sample: '11/26', moisture: 0.2, acidNumber: 1, peroxideNumber: 5, phosphorus: 0.3, phosphorusAlt: 118, sediment: 1.2 },
  { date: '02.11.2025', cistern: '73116238', brutto: 92.75, tara: 27.05, netto: 65.7, pressed: 45.99, extraction: 19.71, buyer: 'САЗ', mixLevel: '70% 30%', sample: '11/27', moisture: 0.2, acidNumber: 1, peroxideNumber: 5, phosphorus: 0.3, phosphorusAlt: 118, sediment: 1.2 },
  { date: '03.11.2025', cistern: '15177', brutto: 38.7, tara: 14.74, netto: 23.96, pressed: 19.168, extraction: 4.792, buyer: 'КНР', mixLevel: '80% 20%', sample: '11/28', moisture: 0.2, acidNumber: 1, peroxideNumber: 5, phosphorus: 0.4, phosphorusAlt: 157, sediment: 1.3 },
  { date: '03.11.2025', cistern: '18551', brutto: 44.74, tara: 17.22, netto: 27.52, pressed: 22.016, extraction: 5.504, buyer: 'КНР', mixLevel: '80% 20%', sample: '11/31', moisture: 0.2, acidNumber: 1, peroxideNumber: 5, phosphorus: 0.4, phosphorusAlt: 157, sediment: 1.3 },
  { date: '03.11.2025', cistern: '13202', brutto: 45.2, tara: 17.24, netto: 27.96, pressed: 22.368, extraction: 5.592, buyer: 'КНР', mixLevel: '80% 20%', sample: '11/32', moisture: 0.2, acidNumber: 1, peroxideNumber: 5, phosphorus: 0.4, phosphorusAlt: 157, sediment: 1.3 },
  { date: '03.11.2025', cistern: '15846', brutto: 44.44, tara: 15.9, netto: 28.54, pressed: 22.832, extraction: 5.708, buyer: 'КНР', mixLevel: '80% 20%', sample: '11/33', moisture: 0.2, acidNumber: 0.9, peroxideNumber: 5, phosphorus: 0.4, phosphorusAlt: 157, sediment: 1.3 },
  { date: '03.11.2025', cistern: '15387', brutto: 44.26, tara: 16.2, netto: 28.06, pressed: 22.448, extraction: 5.612, buyer: 'КНР', mixLevel: '80% 20%', sample: '11/34', moisture: 0.2, acidNumber: 0.9, peroxideNumber: 5, phosphorus: 0.4, phosphorusAlt: 157, sediment: 1.2 },
  { date: '03.11.2025', cistern: '64277', brutto: 42.38, tara: 15.4, netto: 26.98, pressed: 21.584, extraction: 5.396, buyer: 'КНР', mixLevel: '80% 20%', sample: '11/35', moisture: 0.2, acidNumber: 0.9, peroxideNumber: 5, phosphorus: 0.4, phosphorusAlt: 157, sediment: 1.2 },
  { date: '03.11.2025', cistern: '118', brutto: 35.96, tara: 15.94, netto: 20.02, pressed: 10.01, extraction: 10.01, buyer: 'УКПФ', mixLevel: '50% 50%', sample: '11/38', moisture: 0.2, acidNumber: 1.3, peroxideNumber: 5 },
  { date: '03.11.2025', cistern: '73113466', brutto: 92.85, tara: 27.2, netto: 65.65, pressed: 45.955, extraction: 19.695, buyer: 'САЗ', mixLevel: '70% 30%', sample: '11/39', moisture: 0.2, acidNumber: 1.1, peroxideNumber: 5, phosphorus: 0.4, phosphorusAlt: 157, sediment: 1.6 },
  { date: '03.11.2025', cistern: '73099327', brutto: 92.85, tara: 27.05, netto: 65.8, pressed: 46.06, extraction: 19.74, buyer: 'САЗ', mixLevel: '70% 30%', sample: '11/40', moisture: 0.2, acidNumber: 1.1, peroxideNumber: 5, phosphorus: 0.4, phosphorusAlt: 157, sediment: 1.6 },
  { date: '03.11.2025', cistern: '73112328', brutto: 92.7, tara: 27, netto: 65.7, pressed: 45.99, extraction: 19.71, buyer: 'САЗ', mixLevel: '70% 30%', sample: '11/41', moisture: 0.2, acidNumber: 1, peroxideNumber: 5, phosphorus: 0.4, phosphorusAlt: 157, sediment: 1.3 },
  { date: '03.11.2025', cistern: '73111163', brutto: 92.9, tara: 27.05, netto: 65.85, pressed: 46.095, extraction: 19.755, buyer: 'САЗ', mixLevel: '70% 30%', sample: '11/42', moisture: 0.2, acidNumber: 1, peroxideNumber: 5, phosphorus: 0.4, phosphorusAlt: 157, sediment: 1.2 },
  { date: '03.11.2025', cistern: '73090151', brutto: 92.7, tara: 27.05, netto: 65.65, pressed: 45.955, extraction: 19.695, buyer: 'САЗ', mixLevel: '70% 30%', sample: '11/45', moisture: 0.2, acidNumber: 1.1, peroxideNumber: 5, phosphorus: 0.4, phosphorusAlt: 157, sediment: 1.3 },
  { date: '03.11.2025', cistern: '73115982', brutto: 92.75, tara: 26.95, netto: 65.8, pressed: 46.06, extraction: 19.74, buyer: 'САЗ', mixLevel: '70% 30%', sample: '11/46', moisture: 0.2, acidNumber: 1.1, peroxideNumber: 5, phosphorus: 0.4, phosphorusAlt: 157, sediment: 1.3 },
  { date: '04.11.2025', cistern: 'G08432', brutto: 44.46, tara: 15.96, netto: 28.5, pressed: 22.8, extraction: 5.7, buyer: 'КНР', mixLevel: '80% 20%', sample: '11/48', moisture: 0.2, acidNumber: 0.8, peroxideNumber: 5, phosphorus: 0.5, phosphorusAlt: 197, sediment: 1.2 },
  { date: '04.11.2025', cistern: '63997', brutto: 44.26, tara: 15.68, netto: 28.58, pressed: 22.864, extraction: 5.716, buyer: 'КНР', mixLevel: '80% 20%', sample: '11/50', moisture: 0.2, acidNumber: 1, peroxideNumber: 5, phosphorus: 0.3, phosphorusAlt: 118, sediment: 1.2 },
  { date: '04.11.2025', cistern: '16001', brutto: 44.78, tara: 15.82, netto: 28.96, pressed: 23.168, extraction: 5.792, buyer: 'КНР', mixLevel: '80% 20%', sample: '11/51', moisture: 0.2, acidNumber: 0.9, peroxideNumber: 5, phosphorus: 0.1, phosphorusAlt: 39, sediment: 1.2 },
  { date: '04.11.2025', cistern: '63789', brutto: 44.62, tara: 16.04, netto: 28.58, pressed: 22.864, extraction: 5.716, buyer: 'КНР', mixLevel: '80% 20%', sample: '11/52', moisture: 0.2, acidNumber: 1.1, peroxideNumber: 5, phosphorus: 0.6, phosphorusAlt: 236, sediment: 1.1 },
  { date: '04.11.2025', cistern: '11181', brutto: 44.5, tara: 15.98, netto: 28.52, pressed: 22.816, extraction: 5.704, buyer: 'КНР', mixLevel: '80% 20%', sample: '11/53', moisture: 0.2, acidNumber: 1.1, peroxideNumber: 5, phosphorus: 0.6, phosphorusAlt: 236, sediment: 1.1 },
  { date: '04.11.2025', cistern: '17247', brutto: 44.86, tara: 16.94, netto: 27.92, pressed: 22.336, extraction: 5.584, buyer: 'КНР', mixLevel: '80% 20%', sample: '11/56', moisture: 0.2, acidNumber: 1, peroxideNumber: 5, phosphorus: 0.6, phosphorusAlt: 236, sediment: 1.4 },
  { date: '04.11.2025', cistern: '54249321', brutto: 91.75, tara: 26.15, netto: 65.6, pressed: 45.92, extraction: 19.68, buyer: 'САЗ', mixLevel: '70% 30%', sample: '11/54', moisture: 0.2, acidNumber: 1.2, peroxideNumber: 5, phosphorus: 0.7, phosphorusAlt: 275, sediment: 1.3 },
  { date: '04.11.2025', cistern: '51478659', brutto: 91, tara: 26.2, netto: 64.8, pressed: 45.36, extraction: 19.44, buyer: 'САЗ', mixLevel: '70% 30%', sample: '11/55', moisture: 0.2, acidNumber: 1.3, peroxideNumber: 5, phosphorus: 0.7, phosphorusAlt: 275, sediment: 1.2 },
  { date: '04.11.2025', cistern: '51629251', brutto: 91.25, tara: 26.45, netto: 64.8, pressed: 45.36, extraction: 19.44, buyer: 'САЗ', mixLevel: '70% 30%', sample: '11/57', moisture: 0.2, acidNumber: 1.1, peroxideNumber: 5, phosphorus: 0.6, phosphorusAlt: 236, sediment: 1.4 },
  { date: '04.11.2025', cistern: '73094443', brutto: 92.85, tara: 27.2, netto: 65.65, pressed: 45.955, extraction: 19.695, buyer: 'САЗ', mixLevel: '70% 30%', sample: '11/58', moisture: 0.2, acidNumber: 1.2, peroxideNumber: 5, phosphorus: 0.6, phosphorusAlt: 236, sediment: 1.4 },
  { date: '04.11.2025', cistern: '73112427', brutto: 92.6, tara: 26.9, netto: 65.7, pressed: 45.99, extraction: 19.71, buyer: 'САЗ', mixLevel: '70% 30%', sample: '11/59', moisture: 0.2, acidNumber: 1.1, peroxideNumber: 5, phosphorus: 0.6, phosphorusAlt: 236, sediment: 1.4 },
  { date: '04.11.2025', cistern: '73115545', brutto: 93, tara: 27.1, netto: 65.9, pressed: 46.13, extraction: 19.77, buyer: 'САЗ', mixLevel: '70% 30%', sample: '11/60', moisture: 0.2, acidNumber: 1.1, peroxideNumber: 5, phosphorus: 0.6, phosphorusAlt: 236, sediment: 1.4 },
  { date: '05.11.2025', cistern: '73115941', brutto: 92.85, tara: 27.05, netto: 65.8, pressed: 46.06, extraction: 19.74, buyer: 'САЗ', mixLevel: '70% 30%', sample: '11/63', moisture: 0.2, acidNumber: 1.2, peroxideNumber: 5, phosphorus: 0.5, phosphorusAlt: 197, sediment: 1.6 },
  { date: '05.11.2025', cistern: '73110934', brutto: 92.8, tara: 27.25, netto: 65.55, pressed: 45.885, extraction: 19.665, buyer: 'САЗ', mixLevel: '70% 30%', sample: '11/64', moisture: 0.2, acidNumber: 1.3, peroxideNumber: 5, phosphorus: 0.6, phosphorusAlt: 236, sediment: 1.5 },
  { date: '05.11.2025', cistern: '73092173', brutto: 92.8, tara: 27.1, netto: 65.7, pressed: 45.99, extraction: 19.71, buyer: 'САЗ', mixLevel: '70% 30%', sample: '11/67', moisture: 0.2, acidNumber: 1.1, peroxideNumber: 5, phosphorus: 0.5, phosphorusAlt: 197, sediment: 1.5 },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ShippingPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>('11');

  // Получение уникальных месяцев из данных
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    shippingData.forEach(item => {
      const [day, month, year] = item.date.split('.');
      months.add(month);
    });
    return Array.from(months).sort();
  }, []);

  // Фильтрация данных по выбранному месяцу
  const filteredData = useMemo(() => {
    return shippingData.filter(item => {
      const [day, month, year] = item.date.split('.');
      return month === selectedMonth;
    });
  }, [selectedMonth]);

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
              {((totalStats.pressed / totalStats.netto) * 100).toFixed(1)}% от общего объема
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
              {((totalStats.extraction / totalStats.netto) * 100).toFixed(1)}% от общего объема
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-slate-200 rounded-lg p-5">
          <div className="text-xs uppercase tracking-wider font-semibold text-slate-600 mb-3">
            Средняя отгрузка
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tabular-nums text-amber-600">
              {(totalStats.netto / totalStats.count).toFixed(1)}
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

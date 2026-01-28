'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type AnalysisType = 'top0' | 'rvo' | 'extraction' | 'granulation' | 'press';

interface AnalysisData {
  type: string;
  data: any[];
  count: number;
  timestamp: string;
}

const ANALYSIS_TYPES = {
  top0: { label: 'Топ 0 (Входящее сырье)', icon: '🌾' },
  rvo: { label: 'РВО (Рушанка и лузга)', icon: '⚙️' },
  extraction: { label: 'Экстракция', icon: '🧪' },
  granulation: { label: 'Грануляция', icon: '🔘' },
  press: { label: 'Прессовый', icon: '🏭' },
};

export default function QualityAnalysisPage() {
  const [selectedType, setSelectedType] = useState<AnalysisType>('top0');
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка данных из API
  const fetchAnalysisData = async (type: AnalysisType) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/analysis/sheets?type=${type}`);

      if (!response.ok) {
        throw new Error('Ошибка загрузки данных');
      }

      const data = await response.json();
      setAnalysisData(data);
    } catch (err: any) {
      console.error('Error fetching analysis data:', err);
      setError(err.message || 'Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  // Загружаем данные при изменении типа
  useEffect(() => {
    fetchAnalysisData(selectedType);
  }, [selectedType]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Навигация */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/"
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="font-medium">Назад</span>
            </Link>
            <h1 className="text-xl font-bold text-slate-900">Анализ качества</h1>
            <Link
              href="/analysis/quality-charts"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Графики</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Основной контент */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Вкладки типов анализа */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 mb-6">
          <div className="flex flex-wrap gap-2">
            {Object.entries(ANALYSIS_TYPES).map(([type, { label, icon }]) => (
              <button
                key={type}
                onClick={() => setSelectedType(type as AnalysisType)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded font-semibold transition-colors
                  ${
                    selectedType === type
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                  }
                `}
              >
                <span className="text-lg">{icon}</span>
                <span className="text-sm">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Контент */}
        {loading && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-slate-600">Загрузка данных...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600 font-medium">{error}</p>
            <button
              onClick={() => fetchAnalysisData(selectedType)}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Попробовать снова
            </button>
          </div>
        )}

        {!loading && !error && analysisData && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            {/* Заголовок */}
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {ANALYSIS_TYPES[selectedType].label}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Всего записей: {analysisData.count} • Обновлено:{' '}
                    {new Date(analysisData.timestamp).toLocaleString('ru-RU')}
                  </p>
                </div>
                <button
                  onClick={() => fetchAnalysisData(selectedType)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Обновить
                </button>
              </div>
            </div>

            {/* Таблица с данными */}
            <div className="overflow-x-auto">
              {analysisData.data.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  Нет данных для отображения
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {Object.keys(analysisData.data[0]).map((header, index) => (
                        <th
                          key={index}
                          className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analysisData.data.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-slate-50 transition-colors">
                        {Object.values(row).map((value: any, colIndex) => (
                          <td key={colIndex} className="px-4 py-3 text-sm text-slate-900 whitespace-nowrap">
                            {value || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Типы категорий оборудования
type Category = 'raw-material' | 'husk' | 'groats' | 'mash' | 'cake' | 'meal' | 'miscella';

interface CategoryConfig {
  id: Category;
  label: string;
  icon: string;
  color: string;
  metrics: {
    label: string;
    dataKey: string;
    unit: string;
    sourceType: 'top0' | 'rvo' | 'extraction' | 'press';
    sourceColumn: string;
  }[];
}

const CATEGORIES: CategoryConfig[] = [
  {
    id: 'raw-material',
    label: 'Входящее сырье',
    icon: '🌾',
    color: 'blue',
    metrics: [
      { label: 'Влага', dataKey: 'moisture', unit: '%', sourceType: 'top0', sourceColumn: 'W,%' },
      { label: 'Масличность', dataKey: 'oilContent', unit: '%', sourceType: 'top0', sourceColumn: 'Массовая доля сырого жира,%' },
    ],
  },
  {
    id: 'husk',
    label: 'Лузга',
    icon: '🟤',
    color: 'amber',
    metrics: [
      { label: 'Влажность', dataKey: 'moisture', unit: '%', sourceType: 'rvo', sourceColumn: 'Влажность,%' },
      { label: 'Жир', dataKey: 'fat', unit: '%', sourceType: 'rvo', sourceColumn: 'Средняя масличность за смену, %' },
      { label: 'Вынос ядра', dataKey: 'kernelOutput', unit: '%', sourceType: 'rvo', sourceColumn: 'Вынос ядра,%' },
    ],
  },
  {
    id: 'groats',
    label: 'Рушанка',
    icon: '⚙️',
    color: 'green',
    metrics: [
      { label: 'Влажность', dataKey: 'moisture', unit: '%', sourceType: 'rvo', sourceColumn: 'Влажность,%' },
      { label: 'Лузжистость', dataKey: 'huskiness', unit: '%', sourceType: 'rvo', sourceColumn: 'Лузжистость,%' },
    ],
  },
  {
    id: 'mash',
    label: 'Мезга с жаровни',
    icon: '🔥',
    color: 'red',
    metrics: [
      { label: 'Влажность', dataKey: 'moisture', unit: '%', sourceType: 'press', sourceColumn: '"Жаровня 1\nВлажность,%"' },
    ],
  },
  {
    id: 'cake',
    label: 'Жмых с пресса',
    icon: '🏭',
    color: 'purple',
    metrics: [
      { label: 'Влажность', dataKey: 'moisture', unit: '%', sourceType: 'press', sourceColumn: '"Пресс 1\nСодержание влаги,%"' },
      { label: 'Жир', dataKey: 'fat', unit: '%', sourceType: 'press', sourceColumn: '"Пресс 1\nСодержание жира,%"' },
    ],
  },
  {
    id: 'meal',
    label: 'Шрот',
    icon: '🧪',
    color: 'emerald',
    metrics: [
      { label: 'Влажность', dataKey: 'moisture', unit: '%', sourceType: 'extraction', sourceColumn: 'Влага,%' },
      { label: 'Масличность', dataKey: 'oilContent', unit: '%', sourceType: 'extraction', sourceColumn: 'Масличность,%' },
    ],
  },
  {
    id: 'miscella',
    label: 'Мисцелла',
    icon: '💧',
    color: 'cyan',
    metrics: [
      { label: 'Концентрация', dataKey: 'concentration', unit: '%', sourceType: 'extraction', sourceColumn: 'Концентрация,%' },
    ],
  },
];

export default function QualityChartsPage() {
  const [selectedCategory, setSelectedCategory] = useState<Category>('raw-material');
  const [allData, setAllData] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка всех данных
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setError(null);

      try {
        const types = ['top0', 'rvo', 'extraction', 'press'];
        const promises = types.map(type =>
          fetch(`/api/analysis/sheets?type=${type}`).then(res => res.json())
        );

        const results = await Promise.all(promises);

        const dataMap: Record<string, any[]> = {};
        results.forEach((result, index) => {
          dataMap[types[index]] = result.data || [];
        });

        setAllData(dataMap);
      } catch (err: any) {
        console.error('Error fetching analysis data:', err);
        setError('Не удалось загрузить данные');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // Получить конфигурацию выбранной категории
  const category = CATEGORIES.find(c => c.id === selectedCategory);

  // Подготовить данные для графика
  const prepareChartData = () => {
    if (!category || !allData[category.metrics[0].sourceType]) return [];

    const sourceData = allData[category.metrics[0].sourceType];

    return sourceData.map((row, index) => {
      const point: any = {
        name: row['Дата'] || row['Время'] || `Запись ${index + 1}`,
      };

      category.metrics.forEach(metric => {
        const value = parseFloat(row[metric.sourceColumn]) || 0;
        point[metric.dataKey] = value;
      });

      return point;
    }).filter(point => point.name); // Фильтруем пустые записи
  };

  const chartData = prepareChartData();

  // Вычислить средние значения для карточек
  const calculateAverages = () => {
    if (chartData.length === 0) return {};

    const averages: Record<string, number> = {};

    category?.metrics.forEach(metric => {
      const values = chartData.map(d => d[metric.dataKey]).filter(v => v > 0);
      averages[metric.dataKey] = values.length > 0
        ? values.reduce((sum, v) => sum + v, 0) / values.length
        : 0;
    });

    return averages;
  };

  const averages = calculateAverages();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Навигация */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/analysis/quality"
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="font-medium">К таблицам</span>
            </Link>
            <h1 className="text-xl font-bold text-slate-900">Графики качества</h1>
            <div className="w-24"></div>
          </div>
        </div>
      </nav>

      {/* Основной контент */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-slate-600">Загрузка данных...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        ) : (
          <>
            {/* Категории */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`
                    p-4 rounded-xl border-2 transition-all text-center
                    ${
                      selectedCategory === cat.id
                        ? `border-${cat.color}-500 bg-${cat.color}-50`
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }
                  `}
                >
                  <div className="text-3xl mb-2">{cat.icon}</div>
                  <div className="text-sm font-medium text-slate-900">{cat.label}</div>
                </button>
              ))}
            </div>

            {/* Карточки показателей */}
            {category && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {category.metrics.map(metric => (
                  <div key={metric.dataKey} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="text-sm text-slate-600 mb-1">{metric.label}</div>
                    <div className="text-3xl font-bold text-slate-900">
                      {averages[metric.dataKey]?.toFixed(1) || '—'}
                      <span className="text-lg text-slate-600 ml-1">{metric.unit}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-2">Среднее значение</div>
                  </div>
                ))}
              </div>
            )}

            {/* График */}
            {category && chartData.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-4">
                  {category.label} - Динамика показателей
                </h2>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {category.metrics.map((metric, index) => (
                      <Line
                        key={metric.dataKey}
                        type="monotone"
                        dataKey={metric.dataKey}
                        name={`${metric.label} (${metric.unit})`}
                        stroke={`hsl(${index * 120}, 70%, 50%)`}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {chartData.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                <p className="text-slate-500">Нет данных для отображения</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

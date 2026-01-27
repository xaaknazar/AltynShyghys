'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Типы категорий оборудования
type Category = 'raw-material' | 'groats' | 'husk' | 'mash' | 'cake' | 'oil' | 'meal' | 'miscella' | 'granules-meal' | 'granules-husk';

interface CategoryConfig {
  id: Category;
  label: string;
  icon: string;
  color: string;
  metrics: {
    label: string;
    dataKey: string;
    unit: string;
    sourceType: 'top0' | 'rvo' | 'extraction' | 'press' | 'granulation';
    sourceColumn: string;
  }[];
}

const CATEGORIES: CategoryConfig[] = [
  {
    id: 'raw-material',
    label: 'Входящее сырье (Топ 0)',
    icon: '🌾',
    color: '#3b82f6',
    metrics: [
      { label: 'Влага', dataKey: 'moisture', unit: '%', sourceType: 'top0', sourceColumn: 'W,%' },
      { label: 'Сорная примесь', dataKey: 'weedImpurity', unit: '%', sourceType: 'top0', sourceColumn: 'Сорная примесь,%' },
      { label: 'Масличная примесь', dataKey: 'oilImpurity', unit: '%', sourceType: 'top0', sourceColumn: 'Масличная примесь,%' },
      { label: 'Лузжистость', dataKey: 'huskiness', unit: '%', sourceType: 'top0', sourceColumn: 'Лузжистость ,%' },
      { label: 'Кислотное число', dataKey: 'acidNumber', unit: 'КОН/г', sourceType: 'top0', sourceColumn: 'Определение кислотного числа (КОН/г)' },
      { label: 'Массовая доля жира', dataKey: 'oilContent', unit: '%', sourceType: 'top0', sourceColumn: 'Массовая доля сырого жира,%' },
      { label: 'Недозрелые', dataKey: 'immature', unit: '%', sourceType: 'top0', sourceColumn: 'Недозрелые,%' },
      { label: 'Протеин', dataKey: 'protein', unit: '%', sourceType: 'top0', sourceColumn: 'Протеин' },
    ],
  },
  {
    id: 'groats',
    label: 'Рушанка (Топ 4)',
    icon: '⚙️',
    color: '#10b981',
    metrics: [
      { label: 'Влажность', dataKey: 'moisture', unit: '%', sourceType: 'rvo', sourceColumn: 'ТОП 4(Готовая продукция) Влажность,%' },
      { label: 'Недорушенные', dataKey: 'underCrushed', unit: '%', sourceType: 'rvo', sourceColumn: 'ТОП 4(Готовая продукция) Недорушенные,%' },
      { label: 'Необрушенные', dataKey: 'unCrushed', unit: '%', sourceType: 'rvo', sourceColumn: 'ТОП 4(Готовая продукция) Необрушенные,%' },
      { label: 'Целяк', dataKey: 'whole', unit: '%', sourceType: 'rvo', sourceColumn: 'ТОП 4(Готовая продукция) Целяк,%' },
      { label: 'Лузга', dataKey: 'husk', unit: '%', sourceType: 'rvo', sourceColumn: 'ТОП 4(Готовая продукция) Лузга,%' },
      { label: 'Сор', dataKey: 'debris', unit: '%', sourceType: 'rvo', sourceColumn: 'ТОП 4(Готовая продукция) Сор,%' },
      { label: 'Масличная пыль', dataKey: 'oilDust', unit: '%', sourceType: 'rvo', sourceColumn: 'ТОП 4(Готовая продукция) Масличная пыль,%' },
      { label: 'Лузжистость', dataKey: 'huskiness', unit: '%', sourceType: 'rvo', sourceColumn: 'ТОП 4(Готовая продукция) Лузжистость,%' },
    ],
  },
  {
    id: 'husk',
    label: 'Лузга (Топ 5)',
    icon: '🟤',
    color: '#f59e0b',
    metrics: [
      { label: 'Влажность', dataKey: 'moisture', unit: '%', sourceType: 'rvo', sourceColumn: 'ТОП 5 (Лузга после отвеевания) Влажность,%' },
      { label: 'Вынос ядра', dataKey: 'kernelOutput', unit: '%', sourceType: 'rvo', sourceColumn: 'ТОП 5 (Лузга после отвеевания) Вынос ядра,%' },
      { label: 'Вынос подсолнечника', dataKey: 'sunflowerOutput', unit: '%', sourceType: 'rvo', sourceColumn: 'ТОП 5 (Лузга после отвеевания) Вынос подсолнечника,%' },
      { label: 'Масличная пыль', dataKey: 'oilDust', unit: '%', sourceType: 'rvo', sourceColumn: 'ТОП 5 (Лузга после отвеевания) Масличная пыль,%' },
      { label: 'Сор', dataKey: 'debris', unit: '%', sourceType: 'rvo', sourceColumn: 'ТОП 5 (Лузга после отвеевания) Сор,%' },
      { label: 'Средняя масличность', dataKey: 'avgOilContent', unit: '%', sourceType: 'rvo', sourceColumn: 'ТОП 5 (Лузга после отвеевания) Средняя масличность за смену, %' },
    ],
  },
  {
    id: 'mash',
    label: 'Мезга с жаровни',
    icon: '🔥',
    color: '#ef4444',
    metrics: [
      { label: 'Влажность Ж1', dataKey: 'moisture1', unit: '%', sourceType: 'press', sourceColumn: 'Жаровня 1\nВлажность,%' },
      { label: 'Влажность Ж2', dataKey: 'moisture2', unit: '%', sourceType: 'press', sourceColumn: 'Жаровня 2\nВлажность,%' },
    ],
  },
  {
    id: 'cake',
    label: 'Жмых с пресса',
    icon: '🏭',
    color: '#8b5cf6',
    metrics: [
      { label: 'Влажность П1', dataKey: 'moisture1', unit: '%', sourceType: 'press', sourceColumn: 'Пресс 1\nСодержание влаги,%' },
      { label: 'Жир П1', dataKey: 'fat1', unit: '%', sourceType: 'press', sourceColumn: 'Пресс 1\nСодержание жира,%' },
      { label: 'Влажность П2', dataKey: 'moisture2', unit: '%', sourceType: 'press', sourceColumn: 'Пресс 2\nСодержание влаги,%' },
      { label: 'Жир П2', dataKey: 'fat2', unit: '%', sourceType: 'press', sourceColumn: 'Пресс 2\nСодержание жира,%' },
    ],
  },
  {
    id: 'oil',
    label: 'Масло',
    icon: '🛢️',
    color: '#f97316',
    metrics: [
      { label: 'Кислотное число', dataKey: 'acidNumber', unit: '', sourceType: 'extraction', sourceColumn: 'Масло Кислотное число,%' },
      { label: 'Температура вспышки', dataKey: 'flashTemp', unit: '°С', sourceType: 'extraction', sourceColumn: 'Масло Температура вспышки,°С' },
      { label: 'Содержание гексана', dataKey: 'hexaneContent', unit: 'ppm', sourceType: 'extraction', sourceColumn: 'Масло содержание гексана,ppm' },
    ],
  },
  {
    id: 'meal',
    label: 'Шрот',
    icon: '🧪',
    color: '#06b6d4',
    metrics: [
      { label: 'Влажность', dataKey: 'moisture', unit: '%', sourceType: 'extraction', sourceColumn: 'Шрот влага,%' },
      { label: 'Масличность', dataKey: 'oilContent', unit: '%', sourceType: 'extraction', sourceColumn: 'Шрот масличность,%' },
    ],
  },
  {
    id: 'miscella',
    label: 'Мисцелла',
    icon: '💧',
    color: '#14b8a6',
    metrics: [
      { label: 'Концентрация', dataKey: 'concentration', unit: '%', sourceType: 'extraction', sourceColumn: 'Мисцелла концентрация,%' },
    ],
  },
  {
    id: 'granules-meal',
    label: 'Шрот гранулированный',
    icon: '⚫',
    color: '#84cc16',
    metrics: [
      { label: 'Влага', dataKey: 'moisture', unit: '%', sourceType: 'granulation', sourceColumn: 'Влага,%' },
      { label: 'Насыпная плотность', dataKey: 'bulkDensity', unit: 'кг/м³', sourceType: 'granulation', sourceColumn: 'Насыпная плотность,кг/м3' },
      { label: 'М/д мелочи', dataKey: 'fines', unit: '%', sourceType: 'granulation', sourceColumn: 'М/д мелочи,%' },
      { label: 'Механическая прочность', dataKey: 'strength', unit: '%', sourceType: 'granulation', sourceColumn: 'Механическая прочность %' },
      { label: 'Экспресс протеин', dataKey: 'protein', unit: '%', sourceType: 'granulation', sourceColumn: 'Экспресс протеин' },
    ],
  },
  {
    id: 'granules-husk',
    label: 'Лузга гранулированная',
    icon: '🟫',
    color: '#a16207',
    metrics: [
      { label: 'Влага', dataKey: 'moisture', unit: '%', sourceType: 'granulation', sourceColumn: 'Влага,%' },
      { label: 'Насыпная плотность', dataKey: 'bulkDensity', unit: 'кг/м³', sourceType: 'granulation', sourceColumn: 'Насыпная плотность,кг/м3' },
      { label: 'М/д мелочи', dataKey: 'fines', unit: '%', sourceType: 'granulation', sourceColumn: 'М/д мелочи,%' },
      { label: 'Механическая прочность', dataKey: 'strength', unit: '%', sourceType: 'granulation', sourceColumn: 'Механическая прочность %' },
    ],
  },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#14b8a6', '#f97316', '#84cc16', '#a16207'];

export default function QualityChartsPage() {
  const [selectedCategory, setSelectedCategory] = useState<Category>('raw-material');
  const [allData, setAllData] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Загрузка всех данных
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setError(null);

      try {
        const types = ['top0', 'rvo', 'extraction', 'press', 'granulation'];
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

  // При смене категории выбираем все метрики
  useEffect(() => {
    if (category) {
      setSelectedMetrics(category.metrics.map(m => m.label));
    }
  }, [selectedCategory, category]);

  // Подготовить данные для графика
  const prepareChartData = () => {
    if (!category || !allData[category.metrics[0].sourceType]) return [];

    let sourceData = allData[category.metrics[0].sourceType];

    // Для гранулирования фильтруем по наименованию
    if (category.metrics[0].sourceType === 'granulation') {
      const targetName = selectedCategory === 'granules-meal' ? 'шрот гранулированный' : 'лузга гранулированная';
      sourceData = sourceData.filter(row =>
        (row['Наименование'] || '').toString().toLowerCase().includes(targetName)
      );
    }

    // Логируем названия колонок для отладки
    if (sourceData.length > 0) {
      console.log(`=== ${selectedCategory} (${category.metrics[0].sourceType}) ===`);
      console.log('Available columns:', Object.keys(sourceData[0]));
      console.log('Looking for columns:', category.metrics.map(m => m.sourceColumn));
      console.log('Sample row:', sourceData[0]);
    }

    // Парсим и объединяем дату и время
    const parsedData = sourceData.map((row, index) => {
      const dateStr = (row['Дата'] || '').toString().trim();
      const timeStr = (row['Время'] || '').toString().trim();

      // Создаем timestamp для сортировки
      let timestamp = '';
      let displayTime = `Запись ${index + 1}`;

      if (dateStr && timeStr) {
        try {
          // Парсим дату (может быть в формате M/D/YYYY или DD.MM.YYYY)
          const dateParts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('.');

          // Проверяем что есть все части даты
          if (dateParts.length >= 3 && dateParts[0] && dateParts[1] && dateParts[2]) {
            let year, month, day;

            if (dateStr.includes('/')) {
              // M/D/YYYY
              month = dateParts[0].toString().padStart(2, '0');
              day = dateParts[1].toString().padStart(2, '0');
              year = dateParts[2].toString();
            } else {
              // DD.MM.YYYY
              day = dateParts[0].toString().padStart(2, '0');
              month = dateParts[1].toString().padStart(2, '0');
              year = dateParts[2].toString();
            }

            // Убираем секунды из времени если они есть (20:00:00 -> 20:00)
            const timeParts = timeStr.split(':');
            const shortTime = timeParts.length >= 2 ? `${timeParts[0]}:${timeParts[1]}` : timeStr;

            timestamp = `${year}-${month}-${day} ${shortTime}`;
            displayTime = `${day}.${month} ${shortTime}`;
          } else {
            timestamp = `${index}`;
          }
        } catch (e) {
          console.warn('Error parsing date:', dateStr, e);
          timestamp = `${index}`;
        }
      } else {
        timestamp = `${index}`;
      }

      const point: any = {
        time: timestamp,
        displayTime: displayTime,
      };

      category.metrics.forEach(metric => {
        const valueStr = row[metric.sourceColumn] || '';
        // Удаляем кавычки и парсим число
        const cleanValue = valueStr.toString().replace(/"/g, '').trim();
        const value = parseFloat(cleanValue);
        point[metric.label] = isNaN(value) ? null : value;
      });

      return point;
    }).filter(point => {
      // Проверяем наличие валидного времени
      if (!point.time || point.time === `${sourceData.indexOf(point)}`) {
        return false;
      }

      // Проверяем что хотя бы одна метрика имеет непустое значение
      const hasValue = category.metrics.some(metric => {
        const value = point[metric.label];
        return value !== null && value !== undefined && !isNaN(value);
      });

      return hasValue;
    });

    // Сортируем по времени
    parsedData.sort((a, b) => a.time.localeCompare(b.time));

    return parsedData;
  };

  const chartData = prepareChartData();

  // Вычислить средние значения
  const calculateAverages = () => {
    if (chartData.length === 0) return {};

    const averages: Record<string, number> = {};

    category?.metrics.forEach(metric => {
      const values = chartData.map(d => d[metric.label]).filter(v => v !== null && v > 0);
      averages[metric.label] = values.length > 0
        ? values.reduce((sum, v) => sum + v, 0) / values.length
        : 0;
    });

    return averages;
  };

  const averages = calculateAverages();

  // Toggle метрики
  const toggleMetric = (metricLabel: string) => {
    setSelectedMetrics(prev =>
      prev.includes(metricLabel)
        ? prev.filter(m => m !== metricLabel)
        : [...prev, metricLabel]
    );
  };

  // Получить выбранные метрики
  const selectedMetricsData = category?.metrics.filter(m => selectedMetrics.includes(m.label)) || [];

  // Вычисляем ширину графика
  const graphWidth = Math.max(1400, chartData.length * 20);

  // Нормализация значений для SVG (0-100)
  const normalizeValue = (value: number | null, metricLabel: string): number | null => {
    if (value === null) return null;

    // Находим min и max для этой метрики
    const values = chartData.map(d => d[metricLabel]).filter((v): v is number => v !== null && v > 0);
    if (values.length === 0) return null;

    const min = Math.min(...values);
    const max = Math.max(...values);

    if (max === min) return 50; // Если все значения одинаковые

    return ((value - min) / (max - min)) * 100;
  };

  // Создать путь для SVG линии
  const createPath = (metricLabel: string): string => {
    const points: string[] = [];

    chartData.forEach((point, index) => {
      const value = point[metricLabel];
      const normalizedValue = normalizeValue(value, metricLabel);

      if (normalizedValue !== null) {
        const x = (index / (chartData.length - 1)) * 96 + 2;
        const y = 98 - (normalizedValue * 0.96);

        if (points.length === 0) {
          points.push(`M ${x} ${y}`);
        } else {
          points.push(`L ${x} ${y}`);
        }
      }
    });

    return points.join(' ');
  };

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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`
                    p-4 rounded-xl border-2 transition-all text-center
                    ${
                      selectedCategory === cat.id
                        ? 'border-blue-500 bg-blue-50'
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
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                {category.metrics.map(metric => (
                  <div key={metric.dataKey} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="text-sm text-slate-600 mb-1">{metric.label}</div>
                    <div className="text-3xl font-bold text-slate-900">
                      {averages[metric.label]?.toFixed(1) || '—'}
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

                {/* Выбор метрик */}
                <div className="mb-6 flex flex-wrap gap-3">
                  {category.metrics.map((metric, idx) => {
                    const isSelected = selectedMetrics.includes(metric.label);
                    const color = COLORS[idx % COLORS.length];

                    return (
                      <label
                        key={metric.label}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-slate-100 border-slate-400'
                            : 'bg-white border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleMetric(metric.label)}
                          className="w-4 h-4"
                          style={{ accentColor: color }}
                        />
                        <span className="text-sm font-medium text-slate-700">{metric.label}</span>
                        <span className="text-xs text-slate-500 font-mono">({metric.unit})</span>
                      </label>
                    );
                  })}
                </div>

                {/* Легенда */}
                {selectedMetricsData.length > 0 && (
                  <div className="flex flex-wrap gap-4 mb-4">
                    {selectedMetricsData.map((metric, idx) => {
                      const metricIndex = category.metrics.findIndex(m => m.label === metric.label);
                      const color = COLORS[metricIndex % COLORS.length];

                      return (
                        <div key={metric.label} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                          <span className="text-sm font-medium text-slate-700">
                            {metric.label} ({metric.unit})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Контейнер графика со скроллом */}
                <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 overflow-x-auto">
                  <div className="relative" style={{ width: `${graphWidth}px`, height: '500px', paddingTop: '30px', paddingBottom: '80px', paddingLeft: '60px' }}>
                    {/* SVG с графиком */}
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      {/* Сетка */}
                      <defs>
                        <pattern id={`grid-${selectedCategory}`} width="10" height="10" patternUnits="userSpaceOnUse">
                          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e2e8f0" strokeWidth="0.3" />
                        </pattern>
                      </defs>
                      <rect width="100" height="100" fill={`url(#grid-${selectedCategory})`} />

                      {/* Горизонтальные линии-сетка */}
                      <g>
                        {[0, 25, 50, 75, 100].map((tick) => (
                          <line
                            key={`y-tick-${tick}`}
                            x1="2"
                            y1={98 - (tick * 0.96)}
                            x2="98"
                            y2={98 - (tick * 0.96)}
                            stroke="#94a3b8"
                            strokeWidth="1"
                            strokeDasharray="2,2"
                            opacity="0.3"
                            vectorEffect="non-scaling-stroke"
                          />
                        ))}
                      </g>

                      {/* Линии метрик */}
                      {selectedMetricsData.map((metric, idx) => {
                        const metricIndex = category.metrics.findIndex(m => m.label === metric.label);
                        const color = COLORS[metricIndex % COLORS.length];
                        const path = createPath(metric.label);

                        return (
                          <path
                            key={metric.label}
                            d={path}
                            fill="none"
                            stroke={color}
                            strokeWidth="2"
                            vectorEffect="non-scaling-stroke"
                          />
                        );
                      })}
                    </svg>

                    {/* Метки времени (внизу) */}
                    <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-slate-600" style={{ height: '60px', paddingLeft: '60px' }}>
                      {chartData.filter((_, i) => i % Math.ceil(chartData.length / 10) === 0).map((point, idx) => (
                        <div key={idx} className="flex flex-col items-center">
                          <div className="transform -rotate-45 origin-top-left whitespace-nowrap">
                            {point.displayTime}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Шкала значений (слева) */}
                    {selectedMetricsData.length > 0 && (
                      <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-slate-600" style={{ width: '50px', paddingTop: '30px', paddingBottom: '80px' }}>
                        {[100, 75, 50, 25, 0].map((tick) => {
                          const metric = selectedMetricsData[0];
                          const values = chartData.map(d => d[metric.label]).filter((v): v is number => v !== null && v > 0);
                          const min = Math.min(...values);
                          const max = Math.max(...values);
                          const value = min + ((max - min) * tick / 100);

                          return (
                            <div key={tick} className="text-right pr-2">
                              {value.toFixed(1)}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
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

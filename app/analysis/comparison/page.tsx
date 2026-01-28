'use client';

import { useState, useEffect } from 'react';

// Типы категорий для качественного анализа
type QualityCategory = 'raw-material' | 'groats' | 'husk' | 'mash' | 'cake' | 'oil' | 'meal' | 'miscella' | 'granules-meal' | 'granules-husk';

// Типы категорий для количественного анализа
type TechCategory = 'extractor' | 'press1' | 'press2' | 'jarovnia' | 'toster';

interface QualityMetric {
  label: string;
  dataKey: string;
  unit: string;
  sourceType: 'top0' | 'rvo' | 'extraction' | 'press' | 'granulation';
  sourceColumn: string;
}

interface QualityCategoryConfig {
  id: QualityCategory;
  label: string;
  metrics: QualityMetric[];
}

interface TechMetric {
  label: string;
  dataKey: string;
  unit: string;
  collection: string;
  titleInDb: string;
}

interface TechCategoryConfig {
  id: TechCategory;
  label: string;
  metrics: TechMetric[];
}

// Конфигурация категорий качественного анализа
const QUALITY_CATEGORIES: QualityCategoryConfig[] = [
  {
    id: 'raw-material',
    label: 'Входящее сырье (Топ 0)',
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
    metrics: [
      { label: 'Влажность', dataKey: 'moisture', unit: '%', sourceType: 'rvo', sourceColumn: 'Топ 4 Влажность,%' },
      { label: 'Недорушенные', dataKey: 'underCrushed', unit: '%', sourceType: 'rvo', sourceColumn: 'Топ 4 Недорушенные,%' },
      { label: 'Необрушенные', dataKey: 'unCrushed', unit: '%', sourceType: 'rvo', sourceColumn: 'Топ 4  Необрушенные,%' },
      { label: 'Целяк', dataKey: 'whole', unit: '%', sourceType: 'rvo', sourceColumn: 'Топ 4  Целяк,%' },
      { label: 'Лузга', dataKey: 'husk', unit: '%', sourceType: 'rvo', sourceColumn: 'Топ 4 Лузга,%' },
      { label: 'Сор', dataKey: 'debris', unit: '%', sourceType: 'rvo', sourceColumn: 'Топ 4 Сор,%' },
      { label: 'Масличная пыль', dataKey: 'oilDust', unit: '%', sourceType: 'rvo', sourceColumn: 'Топ 4 Масличная пыль,%' },
      { label: 'Лузжистость', dataKey: 'huskiness', unit: '%', sourceType: 'rvo', sourceColumn: 'Топ 4 Лузжистость,%' },
    ],
  },
  {
    id: 'husk',
    label: 'Лузга (Топ 5)',
    metrics: [
      { label: 'Влажность', dataKey: 'moisture', unit: '%', sourceType: 'rvo', sourceColumn: 'Топ 5 Влажность,%' },
      { label: 'Вынос ядра', dataKey: 'kernelOutput', unit: '%', sourceType: 'rvo', sourceColumn: 'Топ 5 Вынос ядра,%' },
      { label: 'Вынос подсолнечника', dataKey: 'sunflowerOutput', unit: '%', sourceType: 'rvo', sourceColumn: 'Топ 5 Вынос подсолнечника,%' },
      { label: 'Масличная пыль', dataKey: 'oilDust', unit: '%', sourceType: 'rvo', sourceColumn: 'Топ 5 Масличная пыль,%' },
      { label: 'Сор', dataKey: 'debris', unit: '%', sourceType: 'rvo', sourceColumn: 'Топ 5 Сор,%' },
      { label: 'Средняя масличность', dataKey: 'avgOilContent', unit: '%', sourceType: 'rvo', sourceColumn: 'Топ 5 Средняя масличность за смену, %' },
    ],
  },
  {
    id: 'mash',
    label: 'Мезга с жаровни',
    metrics: [
      { label: 'Влажность Ж1', dataKey: 'moisture1', unit: '%', sourceType: 'press', sourceColumn: 'Жаровня 1\nВлажность,%' },
      { label: 'Влажность Ж2', dataKey: 'moisture2', unit: '%', sourceType: 'press', sourceColumn: 'Жаровня 2\nВлажность,%' },
    ],
  },
  {
    id: 'cake',
    label: 'Жмых с пресса',
    metrics: [
      { label: 'Влажность П1', dataKey: 'moisture1', unit: '%', sourceType: 'press', sourceColumn: 'Пресс 1\nСодержание влаги,%' },
      { label: 'Жир П1', dataKey: 'fat1', unit: '%', sourceType: 'press', sourceColumn: 'Пресс 1\nСодержание жира,%' },
      { label: 'Влажность П2', dataKey: 'moisture2', unit: '%', sourceType: 'press', sourceColumn: 'Пресс 2\nСодержание влаги,%' },
      { label: 'Жир П2', dataKey: 'fat2', unit: '%', sourceType: 'press', sourceColumn: 'Пресс 2\nСодержание жира,%' },
    ],
  },
  {
    id: 'oil',
    label: 'Экстракционное масло',
    metrics: [
      { label: 'Кислотное число', dataKey: 'acidNumber', unit: '', sourceType: 'extraction', sourceColumn: 'Масло Кислотное число,%' },
      { label: 'Температура вспышки', dataKey: 'flashTemp', unit: '°С', sourceType: 'extraction', sourceColumn: 'Масло Температура вспышки,°С' },
      { label: 'Содержание гексана', dataKey: 'hexaneContent', unit: 'ppm', sourceType: 'extraction', sourceColumn: 'Масло содержание гексана,ppm' },
    ],
  },
  {
    id: 'meal',
    label: 'Тостированный шрот',
    metrics: [
      { label: 'Влажность', dataKey: 'moisture', unit: '%', sourceType: 'extraction', sourceColumn: 'Шрот влага,%' },
      { label: 'Масличность', dataKey: 'oilContent', unit: '%', sourceType: 'extraction', sourceColumn: 'Шрот масличность,%' },
    ],
  },
  {
    id: 'miscella',
    label: 'Мисцелла',
    metrics: [
      { label: 'Концентрация', dataKey: 'concentration', unit: '%', sourceType: 'extraction', sourceColumn: 'Мисцелла концентрация,%' },
    ],
  },
  {
    id: 'granules-meal',
    label: 'Шрот гранулированный',
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
    metrics: [
      { label: 'Влага', dataKey: 'moisture', unit: '%', sourceType: 'granulation', sourceColumn: 'Влага,%' },
      { label: 'Насыпная плотность', dataKey: 'bulkDensity', unit: 'кг/м³', sourceType: 'granulation', sourceColumn: 'Насыпная плотность,кг/м3' },
      { label: 'М/д мелочи', dataKey: 'fines', unit: '%', sourceType: 'granulation', sourceColumn: 'М/д мелочи,%' },
      { label: 'Механическая прочность', dataKey: 'strength', unit: '%', sourceType: 'granulation', sourceColumn: 'Механическая прочность %' },
    ],
  },
];

// Конфигурация категорий количественного анализа
const TECH_CATEGORIES: TechCategoryConfig[] = [
  {
    id: 'extractor',
    label: 'Экстрактор',
    metrics: [
      { label: 'Вакуум', dataKey: 'vacuum', unit: 'bar', collection: 'Extractor_TechData_Job', titleInDb: 'Вакуум' },
      { label: 'Температура масла', dataKey: 'oilTemp', unit: '°C', collection: 'Extractor_TechData_Job', titleInDb: 'Температура масла' },
      { label: 'Коэффициент Экстрактора', dataKey: 'extractorCoef', unit: '%', collection: 'Data_extractor_cooking', titleInDb: 'Коэффициент Экстрактора' },
      { label: 'Подача в Экстрактор', dataKey: 'extractorFeed', unit: '%', collection: 'Data_extractor_cooking', titleInDb: 'Подача в Экстрактор' },
      { label: 'Процентаж Экстрактора', dataKey: 'extractorPercent', unit: '%', collection: 'Data_extractor_cooking', titleInDb: 'Процентаж Экстрактора' },
      { label: 'Подача Чистого Гексана л/мин', dataKey: 'hexaneFeed', unit: 'Л/м', collection: 'Data_extractor_cooking', titleInDb: 'Подача Чистого Гексана' },
    ],
  },
  {
    id: 'press1',
    label: 'Пресс 1',
    metrics: [
      { label: 'Подача', dataKey: 'feed1', unit: '%', collection: 'Press_1_Job', titleInDb: 'Подача' },
      { label: 'Гл. мотор', dataKey: 'mainMotor1', unit: '%', collection: 'Press_1_Job', titleInDb: 'Гл. мотор' },
      { label: 'Ток', dataKey: 'current1', unit: 'A', collection: 'Press_1_Job', titleInDb: 'Ток' },
      { label: 'Жаровня', dataKey: 'jarovnia1', unit: 'A', collection: 'Press_1_Job', titleInDb: 'Жаровня' },
    ],
  },
  {
    id: 'press2',
    label: 'Пресс 2',
    metrics: [
      { label: 'Подача', dataKey: 'feed2', unit: '%', collection: 'Press_2_Job', titleInDb: 'Подача' },
      { label: 'Гл. мотор', dataKey: 'mainMotor2', unit: '%', collection: 'Press_2_Job', titleInDb: 'Гл. мотор' },
      { label: 'Ток', dataKey: 'current2', unit: 'A', collection: 'Press_2_Job', titleInDb: 'Ток' },
      { label: 'Жаровня', dataKey: 'jarovnia2', unit: 'A', collection: 'Press_2_Job', titleInDb: 'Жаровня' },
    ],
  },
  {
    id: 'jarovnia',
    label: 'Жаровня',
    metrics: [
      { label: 'Верх.Темп. Мезги Жаровни 1', dataKey: 'topTemp1', unit: '°C', collection: 'Data_extractor_cooking', titleInDb: 'Верх.Темп. Мезги Жаровни 1' },
      { label: 'Нижн.Темп. Мезги Жаровни 1', dataKey: 'bottomTemp1', unit: '°C', collection: 'Data_extractor_cooking', titleInDb: 'Нижн.Темп. Мезги Жаровня 1' },
      { label: 'Верх.Темп. Мезги Жаровни 2', dataKey: 'topTemp2', unit: '°C', collection: 'Data_extractor_cooking', titleInDb: 'Верх.Темп. Мезги Жаровни 2' },
      { label: 'Нижн.Темп. Мезги Жаровни 2', dataKey: 'bottomTemp2', unit: '°C', collection: 'Data_extractor_cooking', titleInDb: 'Нижн.Темп. Мезги Жаровня 2' },
    ],
  },
  {
    id: 'toster',
    label: 'Тостер',
    metrics: [
      { label: 'Температура Тостера', dataKey: 'tosterTemp', unit: '°C', collection: 'Data_extractor_cooking', titleInDb: ' Температура Тостера' },
    ],
  },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#14b8a6', '#f97316', '#ec4899', '#84cc16'];

export default function ComparisonPage() {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Данные качественного анализа
  const [qualityData, setQualityData] = useState<Record<string, any[]>>({});

  // Данные количественного анализа
  const [techData, setTechData] = useState<Record<string, any[]>>({});

  // Выбранные метрики
  const [compareQualityMetrics, setCompareQualityMetrics] = useState<Array<{category: QualityCategory, metric: string}>>([]);
  const [compareTechMetrics, setCompareTechMetrics] = useState<Array<{category: TechCategory, metric: string}>>([]);

  // Полноэкранный режим
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [graphScale, setGraphScale] = useState(1);

  // Установка дат по умолчанию
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, []);

  // Автоматическая загрузка при изменении дат
  useEffect(() => {
    if (startDate && endDate) {
      loadAllData();
    }
  }, [startDate, endDate]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadQualityData(),
        loadTechnicalData()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadQualityData = async () => {
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

      setQualityData(dataMap);
    } catch (err) {
      console.error('Error loading quality data:', err);
    }
  };

  const loadTechnicalData = async () => {
    try {
      // Генерируем все даты в диапазоне
      const dates: string[] = [];
      const start = new Date(startDate);
      const end = new Date(endDate);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split('T')[0]);
      }

      // Уникальные коллекции
      const collections = ['Extractor_TechData_Job', 'Data_extractor_cooking', 'Press_1_Job', 'Press_2_Job'];

      const allData: Record<string, any[]> = {};

      for (const collection of collections) {
        const collectionData: any[] = [];

        for (const date of dates) {
          try {
            const response = await fetch(`/api/technical-data/detailed?date=${date}&collection=${collection}`);
            const result = await response.json();

            if (result.success && result.data) {
              collectionData.push(...result.data);
            }
          } catch (err) {
            console.error(`Error loading ${collection} for ${date}:`, err);
          }
        }

        allData[collection] = collectionData;
      }

      setTechData(allData);
    } catch (err) {
      console.error('Error loading technical data:', err);
    }
  };

  // Подготовить данные качественного анализа для графика
  const prepareQualityCompareData = () => {
    if (compareQualityMetrics.length === 0) return [];

    const allPoints: any[] = [];

    compareQualityMetrics.forEach(({ category: catId, metric: metricLabel }) => {
      const cat = QUALITY_CATEGORIES.find(c => c.id === catId);
      if (!cat) return;

      const metric = cat.metrics.find(m => m.label === metricLabel);
      if (!metric) return;

      let sourceData = qualityData[metric.sourceType];
      if (!sourceData) return;

      // Для гранулирования фильтруем по наименованию
      if (metric.sourceType === 'granulation') {
        const targetName = catId === 'granules-meal' ? 'шрот гранулированный' : 'лузга гранулированная';
        sourceData = sourceData.filter(row =>
          (row['Наименование'] || '').toString().toLowerCase().includes(targetName)
        );
      }

      // Парсим данные
      sourceData.forEach((row, index) => {
        const dateStr = (row['Дата'] || '').toString().trim();
        const timeStr = (row['Время'] || '').toString().trim();
        let timestamp = '';

        if (dateStr && timeStr) {
          try {
            const dateParts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('.');
            if (dateParts.length >= 3 && dateParts[0] && dateParts[1] && dateParts[2]) {
              let year, month, day;
              if (dateStr.includes('/')) {
                month = dateParts[0].toString().padStart(2, '0');
                day = dateParts[1].toString().padStart(2, '0');
                year = dateParts[2].toString();
              } else {
                day = dateParts[0].toString().padStart(2, '0');
                month = dateParts[1].toString().padStart(2, '0');
                year = dateParts[2].toString();
              }
              const timeParts = timeStr.split(':');
              const shortTime = timeParts.length >= 2 ? `${timeParts[0]}:${timeParts[1]}` : timeStr;
              timestamp = `${year}-${month}-${day} ${shortTime}`;
            }
          } catch (e) {
            console.warn('Error parsing date:', dateStr, e);
          }
        }

        if (!timestamp) return;

        // Ищем значение колонки
        let valueStr = row[metric.sourceColumn];
        if (valueStr === undefined || valueStr === null || valueStr === '') {
          const normalizedTarget = metric.sourceColumn.trim().toLowerCase();
          const matchingKey = Object.keys(row).find(key =>
            key.trim().toLowerCase() === normalizedTarget
          );
          if (matchingKey) {
            valueStr = row[matchingKey];
          } else {
            valueStr = '';
          }
        }

        const cleanValue = valueStr.toString().replace(/"/g, '').replace(',', '.').trim();
        const value = parseFloat(cleanValue);

        if (isNaN(value)) return;

        // Проверяем диапазон дат
        const pointDate = timestamp.split(' ')[0];
        if (startDate && pointDate < startDate) return;
        if (endDate && pointDate > endDate) return;

        allPoints.push({
          time: timestamp,
          [`${cat.label} - ${metricLabel}`]: value,
          category: cat.label,
          metricLabel: metricLabel,
          type: 'quality'
        });
      });
    });

    return allPoints;
  };

  // Подготовить данные количественного анализа для графика
  const prepareTechCompareData = () => {
    if (compareTechMetrics.length === 0) return [];

    const allPoints: any[] = [];

    compareTechMetrics.forEach(({ category: catId, metric: metricLabel }) => {
      const cat = TECH_CATEGORIES.find(c => c.id === catId);
      if (!cat) return;

      const metric = cat.metrics.find(m => m.label === metricLabel);
      if (!metric) return;

      const sourceData = techData[metric.collection] || [];
      if (sourceData.length === 0) return;

      sourceData.forEach((row) => {
        const time = row.time;
        if (!time) return;

        // Ищем значение метрики в данных
        let value = row[metric.titleInDb];

        if (value === undefined || value === null) {
          const matchingKey = Object.keys(row).find(key =>
            key.toLowerCase().includes(metric.titleInDb.toLowerCase().trim()) ||
            metric.titleInDb.toLowerCase().includes(key.toLowerCase().trim())
          );
          if (matchingKey) {
            value = row[matchingKey];
          }
        }

        if (value === undefined || value === null || isNaN(Number(value))) return;

        allPoints.push({
          time,
          [`${cat.label} - ${metricLabel}`]: Number(value),
          category: cat.label,
          metricLabel: metricLabel,
          type: 'tech'
        });
      });
    });

    return allPoints;
  };

  // Объединение всех данных для графика
  const prepareCompareData = () => {
    const qualityPoints = prepareQualityCompareData();
    const techPoints = prepareTechCompareData();
    const allPoints = [...qualityPoints, ...techPoints];

    if (allPoints.length === 0) return [];

    // Группируем по времени
    const grouped = allPoints.reduce((acc, point) => {
      if (!acc[point.time]) {
        acc[point.time] = { time: point.time };
      }
      Object.keys(point).forEach(key => {
        if (key !== 'time' && key !== 'category' && key !== 'metricLabel' && key !== 'type') {
          acc[point.time][key] = point[key];
        }
      });
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped).sort((a: any, b: any) => a.time.localeCompare(b.time));
  };

  const compareData = prepareCompareData();

  // Все выбранные метрики для легенды и графика
  const allSelectedMetrics = [
    ...compareQualityMetrics.map(m => ({ ...m, type: 'quality' as const })),
    ...compareTechMetrics.map(m => ({ ...m, type: 'tech' as const }))
  ];

  // Форматирование даты для отображения
  const formatTime = (time: string) => {
    const parts = time.split(' ');
    if (parts.length === 2) {
      const dateParts = parts[0].split('-');
      if (dateParts.length === 3) {
        return `${dateParts[2]}.${dateParts[1]} ${parts[1]}`;
      }
    }
    return time;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h1 className="text-3xl font-bold text-slate-900">Свод анализа</h1>
        <p className="text-slate-600 mt-2">Выберите метрики для отображения графика сравнения</p>
      </div>

      {/* Панель управления */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700">Период:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-slate-500">—</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  const end = new Date();
                  const start = new Date();
                  start.setDate(start.getDate() - 7);
                  setStartDate(start.toISOString().split('T')[0]);
                  setEndDate(end.toISOString().split('T')[0]);
                }}
                className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Сбросить
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Карточки количественного анализа */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Количественный анализ</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TECH_CATEGORIES.map(cat => (
            <div key={cat.id} className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-semibold text-slate-900">{cat.label}</span>
              </div>
              <div className="space-y-2">
                {cat.metrics.map(metric => {
                  const isSelected = compareTechMetrics.some(
                    m => m.category === cat.id && m.metric === metric.label
                  );
                  return (
                    <label key={metric.label} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCompareTechMetrics([...compareTechMetrics, { category: cat.id, metric: metric.label }]);
                          } else {
                            setCompareTechMetrics(compareTechMetrics.filter(m => !(m.category === cat.id && m.metric === metric.label)));
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-slate-700">{metric.label} ({metric.unit})</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Карточки качественного анализа */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Качественный анализ</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {QUALITY_CATEGORIES.map(cat => (
            <div key={cat.id} className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-semibold text-slate-900">{cat.label}</span>
              </div>
              <div className="space-y-2">
                {cat.metrics.map(metric => {
                  const isSelected = compareQualityMetrics.some(
                    m => m.category === cat.id && m.metric === metric.label
                  );
                  return (
                    <label key={metric.label} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCompareQualityMetrics([...compareQualityMetrics, { category: cat.id, metric: metric.label }]);
                          } else {
                            setCompareQualityMetrics(compareQualityMetrics.filter(m => !(m.category === cat.id && m.metric === metric.label)));
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-slate-700">{metric.label} ({metric.unit})</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Загрузка */}
      {loading && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-slate-600">Загрузка данных...</p>
        </div>
      )}

      {/* График сравнения */}
      {!loading && compareData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">
              Сравнение метрик
            </h2>
            <button
              onClick={() => setIsFullscreen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              <span className="text-sm font-semibold">Полный экран</span>
            </button>
          </div>

          {/* Легенда */}
          <div className="flex flex-wrap gap-4 mb-4">
            {allSelectedMetrics.map(({ category: catId, metric: metricLabel, type }, idx) => {
              const cat = type === 'quality'
                ? QUALITY_CATEGORIES.find(c => c.id === catId)
                : TECH_CATEGORIES.find(c => c.id === catId);
              if (!cat) return null;
              const color = COLORS[idx % COLORS.length];
              const metricInfo = cat.metrics.find((m: any) => m.label === metricLabel);

              return (
                <div key={`${catId}-${metricLabel}`} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                  <span className="text-sm font-medium text-slate-700">
                    {cat.label} - {metricLabel} ({metricInfo?.unit || ''})
                  </span>
                </div>
              );
            })}
          </div>

          {/* График */}
          <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 overflow-x-auto">
            <div className="relative" style={{ width: `${Math.max(1400, compareData.length * 20)}px`, height: '500px', paddingTop: '30px', paddingBottom: '80px', paddingLeft: '60px' }}>
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <pattern id="grid-compare" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e2e8f0" strokeWidth="0.3" />
                  </pattern>
                </defs>
                <rect width="100" height="100" fill="url(#grid-compare)" />

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

                {/* Линии для каждой метрики */}
                {allSelectedMetrics.map(({ category: catId, metric: metricLabel, type }, idx) => {
                  const cat = type === 'quality'
                    ? QUALITY_CATEGORIES.find(c => c.id === catId)
                    : TECH_CATEGORIES.find(c => c.id === catId);
                  if (!cat) return null;
                  const color = COLORS[idx % COLORS.length];
                  const key = `${cat.label} - ${metricLabel}`;

                  const metricData = compareData.filter((d: any) => d[key] !== undefined && d[key] !== null);
                  if (metricData.length === 0) return null;

                  const values = metricData.map((d: any) => d[key]);
                  const dataMin = Math.min(...values);
                  const dataMax = Math.max(...values);
                  const padding = (dataMax - dataMin) * 0.1 || 1;
                  const minValue = dataMin - padding;
                  const maxValue = dataMax + padding;
                  const valueRange = maxValue - minValue;

                  const points = metricData.map((point: any, index: number) => {
                    const x = 2 + (index / Math.max(1, metricData.length - 1)) * 96;
                    const normalizedValue = valueRange !== 0 ? ((point[key] - minValue) / valueRange) : 0.5;
                    const y = 98 - (normalizedValue * 96);
                    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }).join(' ');

                  return (
                    <path
                      key={key}
                      d={points}
                      fill="none"
                      stroke={color}
                      strokeWidth="2.5"
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}
              </svg>

              {/* Точки */}
              {allSelectedMetrics.map(({ category: catId, metric: metricLabel, type }, idx) => {
                const cat = type === 'quality'
                  ? QUALITY_CATEGORIES.find(c => c.id === catId)
                  : TECH_CATEGORIES.find(c => c.id === catId);
                if (!cat) return null;
                const color = COLORS[idx % COLORS.length];
                const key = `${cat.label} - ${metricLabel}`;
                const metricInfo = cat.metrics.find((m: any) => m.label === metricLabel);

                const metricData = compareData.filter((d: any) => d[key] !== undefined && d[key] !== null);
                if (metricData.length === 0) return null;

                const values = metricData.map((d: any) => d[key]);
                const dataMin = Math.min(...values);
                const dataMax = Math.max(...values);
                const padding = (dataMax - dataMin) * 0.1 || 1;
                const minValue = dataMin - padding;
                const maxValue = dataMax + padding;
                const valueRange = maxValue - minValue;

                return metricData.map((point: any, pointIdx: number) => {
                  const x = 2 + (pointIdx / Math.max(1, metricData.length - 1)) * 96;
                  const normalizedValue = valueRange !== 0 ? ((point[key] - minValue) / valueRange) : 0.5;
                  const y = 2 + (1 - normalizedValue) * 96;

                  return (
                    <div
                      key={`${key}-${pointIdx}`}
                      className="absolute group"
                      style={{
                        left: `${x}%`,
                        top: `${y}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                    >
                      <div
                        className="w-3 h-3 rounded-full cursor-pointer transition-all hover:scale-150 border-2 border-white shadow-lg"
                        style={{ backgroundColor: color }}
                      />
                      <div
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none text-white text-xs font-bold px-2 py-1 rounded shadow-md whitespace-nowrap"
                        style={{ backgroundColor: color }}
                      >
                        {point[key]?.toFixed(1)}
                      </div>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-10 hidden group-hover:block pointer-events-none bg-slate-900 text-white text-xs font-medium px-3 py-2 rounded-lg shadow-xl whitespace-nowrap z-10">
                        <div className="font-bold mb-1">{cat.label} - {metricLabel}</div>
                        <div>{point[key]?.toFixed(2)} {metricInfo?.unit || ''}</div>
                        <div className="text-slate-400 text-[10px] mt-1">
                          {formatTime(point.time)}
                        </div>
                      </div>
                    </div>
                  );
                });
              })}

              {/* Метки времени */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-slate-600" style={{ height: '60px', paddingLeft: '60px' }}>
                {compareData.filter((_: any, i: number) => i % Math.ceil(compareData.length / 10) === 0).map((point: any, idx: number) => (
                  <div key={idx} className="flex flex-col items-center">
                    <div className="transform -rotate-45 origin-top-left whitespace-nowrap">
                      {formatTime(point.time)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Нет данных или не выбраны метрики */}
      {!loading && allSelectedMetrics.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <p className="text-slate-500">Выберите метрики для сравнения</p>
        </div>
      )}

      {!loading && allSelectedMetrics.length > 0 && compareData.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <p className="text-slate-500">Нет данных для выбранных метрик в указанном периоде</p>
        </div>
      )}

      {/* Модальное окно с полноэкранным графиком */}
      {isFullscreen && compareData.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
          {/* Заголовок и контролы */}
          <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Сравнение метрик</h2>
            <div className="flex items-center gap-4">
              {/* Контроль масштаба */}
              <div className="flex items-center gap-3">
                <span className="text-sm">Масштаб:</span>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={graphScale}
                  onChange={(e) => setGraphScale(parseFloat(e.target.value))}
                  className="w-32"
                />
                <span className="text-sm font-mono w-12">{(graphScale * 100).toFixed(0)}%</span>
              </div>
              {/* Кнопка закрыть */}
              <button
                onClick={() => {
                  setIsFullscreen(false);
                  setGraphScale(1);
                }}
                className="text-white hover:text-red-400 transition-colors"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* График на весь экран */}
          <div className="flex-1 overflow-auto p-8 bg-slate-50">
            <div className="bg-white rounded-lg border border-slate-200 p-6 h-full">
              {/* Легенда */}
              <div className="flex flex-wrap gap-4 mb-4">
                {allSelectedMetrics.map(({ category: catId, metric: metricLabel, type }, idx) => {
                  const cat = type === 'quality'
                    ? QUALITY_CATEGORIES.find(c => c.id === catId)
                    : TECH_CATEGORIES.find(c => c.id === catId);
                  if (!cat) return null;
                  const color = COLORS[idx % COLORS.length];
                  const metricInfo = cat.metrics.find((m: any) => m.label === metricLabel);

                  return (
                    <div key={`fs-${catId}-${metricLabel}`} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }}></div>
                      <span className="text-base font-medium text-slate-700">
                        {cat.label} - {metricLabel} ({metricInfo?.unit || ''})
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* График с масштабом */}
              <div className="overflow-auto" style={{ height: 'calc(100% - 60px)' }}>
                <div
                  className="relative"
                  style={{
                    width: `${Math.max(1400, compareData.length * 20) * graphScale}px`,
                    height: `${600 * graphScale}px`,
                    paddingTop: `${30 * graphScale}px`,
                    paddingBottom: `${80 * graphScale}px`,
                    paddingLeft: `${60 * graphScale}px`
                  }}
                >
                  {/* SVG с графиком */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                      <pattern id="grid-compare-fullscreen" width="10" height="10" patternUnits="userSpaceOnUse">
                        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e2e8f0" strokeWidth="0.3" />
                      </pattern>
                    </defs>
                    <rect width="100" height="100" fill="url(#grid-compare-fullscreen)" />

                    <g>
                      {[0, 25, 50, 75, 100].map((tick) => (
                        <line
                          key={`y-tick-fs-${tick}`}
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

                    {/* Линии для каждой метрики */}
                    {allSelectedMetrics.map(({ category: catId, metric: metricLabel, type }, idx) => {
                      const cat = type === 'quality'
                        ? QUALITY_CATEGORIES.find(c => c.id === catId)
                        : TECH_CATEGORIES.find(c => c.id === catId);
                      if (!cat) return null;
                      const color = COLORS[idx % COLORS.length];
                      const key = `${cat.label} - ${metricLabel}`;

                      const metricData = compareData.filter((d: any) => d[key] !== undefined && d[key] !== null);
                      if (metricData.length === 0) return null;

                      const values = metricData.map((d: any) => d[key]);
                      const dataMin = Math.min(...values);
                      const dataMax = Math.max(...values);
                      const padding = (dataMax - dataMin) * 0.1 || 1;
                      const minValue = dataMin - padding;
                      const maxValue = dataMax + padding;
                      const valueRange = maxValue - minValue;

                      const points = metricData.map((point: any, index: number) => {
                        const x = 2 + (index / Math.max(1, metricData.length - 1)) * 96;
                        const normalizedValue = valueRange !== 0 ? ((point[key] - minValue) / valueRange) : 0.5;
                        const y = 98 - (normalizedValue * 96);
                        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                      }).join(' ');

                      return (
                        <path
                          key={`fs-${key}`}
                          d={points}
                          fill="none"
                          stroke={color}
                          strokeWidth="2.5"
                          vectorEffect="non-scaling-stroke"
                        />
                      );
                    })}
                  </svg>

                  {/* Точки */}
                  {allSelectedMetrics.map(({ category: catId, metric: metricLabel, type }, idx) => {
                    const cat = type === 'quality'
                      ? QUALITY_CATEGORIES.find(c => c.id === catId)
                      : TECH_CATEGORIES.find(c => c.id === catId);
                    if (!cat) return null;
                    const color = COLORS[idx % COLORS.length];
                    const key = `${cat.label} - ${metricLabel}`;
                    const metricInfo = cat.metrics.find((m: any) => m.label === metricLabel);

                    const metricData = compareData.filter((d: any) => d[key] !== undefined && d[key] !== null);
                    if (metricData.length === 0) return null;

                    const values = metricData.map((d: any) => d[key]);
                    const dataMin = Math.min(...values);
                    const dataMax = Math.max(...values);
                    const padding = (dataMax - dataMin) * 0.1 || 1;
                    const minValue = dataMin - padding;
                    const maxValue = dataMax + padding;
                    const valueRange = maxValue - minValue;

                    return metricData.map((point: any, pointIdx: number) => {
                      const x = 2 + (pointIdx / Math.max(1, metricData.length - 1)) * 96;
                      const normalizedValue = valueRange !== 0 ? ((point[key] - minValue) / valueRange) : 0.5;
                      const y = 2 + (1 - normalizedValue) * 96;

                      return (
                        <div
                          key={`fs-${key}-${pointIdx}`}
                          className="absolute group"
                          style={{
                            left: `${x}%`,
                            top: `${y}%`,
                            transform: 'translate(-50%, -50%)'
                          }}
                        >
                          <div
                            className="w-4 h-4 rounded-full cursor-pointer transition-all hover:scale-150 border-2 border-white shadow-lg"
                            style={{ backgroundColor: color }}
                          />
                          <div
                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none text-white text-sm font-bold px-2 py-1 rounded shadow-md whitespace-nowrap"
                            style={{ backgroundColor: color }}
                          >
                            {point[key]?.toFixed(1)}
                          </div>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-12 hidden group-hover:block pointer-events-none bg-slate-900 text-white text-sm font-medium px-4 py-3 rounded-lg shadow-xl whitespace-nowrap z-10">
                            <div className="font-bold mb-1">{cat.label} - {metricLabel}</div>
                            <div>{point[key]?.toFixed(2)} {metricInfo?.unit || ''}</div>
                            <div className="text-slate-400 text-xs mt-1">
                              {formatTime(point.time)}
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })}

                  {/* Метки времени */}
                  <div className="absolute bottom-0 left-0 right-0 flex justify-between text-sm text-slate-600" style={{ height: `${60 * graphScale}px`, paddingLeft: `${60 * graphScale}px` }}>
                    {compareData.filter((_: any, i: number) => i % Math.ceil(compareData.length / 10) === 0).map((point: any, idx: number) => (
                      <div key={`fs-time-${idx}`} className="flex flex-col items-center">
                        <div className="transform -rotate-45 origin-top-left whitespace-nowrap">
                          {formatTime(point.time)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

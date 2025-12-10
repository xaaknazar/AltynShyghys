import { startOfDay, endOfDay, subDays, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, format } from 'date-fns';

export interface ProductionData {
  _id: string;
  datetime: string;
  value: number;
  difference: number;
  speed: number;
  metric_unit: string;
}

export interface DailyStats {
  totalProduction: number;
  averageSpeed: number;
  currentSpeed: number;
  progress: number;
  status: 'normal' | 'warning' | 'danger';
}

export const TARGETS = {
  hourly: 50,
  shift: 600,
  daily: 1200,
};

// Часовой пояс Казахстана (Астана/Алматы)
const TIMEZONE_OFFSET = 5; // UTC+5 (или можно сделать +6 если нужно)

/**
 * Получить начало и конец производственных суток (20:00 - 20:00) в UTC
 */
export function getProductionDayBounds(date: Date = new Date()) {
  // Текущее время в UTC
  const nowUTC = new Date(date);

  // Преобразуем в местное время (UTC + offset)
  const localHour = (nowUTC.getUTCHours() + TIMEZONE_OFFSET) % 24;

  // Начало суток в местном времени: 20:00
  const dayStartLocal = new Date(nowUTC);

  // Если сейчас до 20:00 местного времени, то сутки начались вчера
  if (localHour < 20) {
    dayStartLocal.setUTCDate(dayStartLocal.getUTCDate() - 1);
  }

  // Устанавливаем 20:00 местного времени = (20 - offset) UTC
  const utcHourForStart = (20 - TIMEZONE_OFFSET + 24) % 24;
  dayStartLocal.setUTCHours(utcHourForStart, 0, 0, 0);

  // Конец суток - следующий день в 20:00
  const dayEndLocal = new Date(dayStartLocal);
  dayEndLocal.setUTCDate(dayEndLocal.getUTCDate() + 1);

  console.log('🕐 Production day (local 20:00-20:00):', {
    startUTC: dayStartLocal.toISOString(),
    endUTC: dayEndLocal.toISOString(),
    startLocal: new Date(dayStartLocal.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000).toISOString(),
    endLocal: new Date(dayEndLocal.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000).toISOString(),
  });

  return { start: dayStartLocal, end: dayEndLocal };
}

/**
 * Получить границы предыдущих производственных суток (20:00 - 20:00)
 */
export function getPreviousProductionDay(date: Date = new Date()) {
  const { start } = getProductionDayBounds(date);
  const previousDayEnd = new Date(start);
  const previousDayStart = new Date(start);
  previousDayStart.setUTCDate(previousDayStart.getUTCDate() - 1);

  console.log('🕐 Previous day (local 20:00-20:00):', {
    startUTC: previousDayStart.toISOString(),
    endUTC: previousDayEnd.toISOString(),
  });

  return { start: previousDayStart, end: previousDayEnd };
}

export function calculateDailyStats(data: ProductionData[]): DailyStats {
  if (!data || data.length === 0) {
    return {
      totalProduction: 0,
      averageSpeed: 0,
      currentSpeed: 0,
      progress: 0,
      status: 'danger',
    };
  }

  const sortedData = [...data].sort(
    (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
  );

  // Считаем производство как сумму всех difference за период
  const totalProduction = data.reduce((sum, d) => sum + (d.difference || 0), 0);

  // Рассчитываем среднюю скорость на основе общего производства и времени
  const firstTime = new Date(sortedData[0].datetime).getTime();
  const lastTime = new Date(sortedData[sortedData.length - 1].datetime).getTime();
  const hoursElapsed = (lastTime - firstTime) / (1000 * 60 * 60); // миллисекунды в часы

  // Средняя скорость = общее производство / время в часах
  const averageSpeed = hoursElapsed > 0 ? totalProduction / hoursElapsed : 0;

  const currentSpeed = sortedData[sortedData.length - 1].speed;
  const progress = (totalProduction / TARGETS.daily) * 100;

  let status: 'normal' | 'warning' | 'danger' = 'normal';
  if (currentSpeed < TARGETS.hourly * 0.8) {
    status = 'danger';
  } else if (currentSpeed < TARGETS.hourly * 0.9) {
    status = 'warning';
  }

  return {
    totalProduction,
    averageSpeed,
    currentSpeed,
    progress,
    status,
  };
}

export function formatNumber(num: number, decimals: number = 1): string {
  return num.toLocaleString('ru-RU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Получить начало и конец месяца (производственные сутки 20:00 - 20:00) в UTC
 */
export function getProductionMonthBounds(date: Date = new Date()) {
  // Текущее время в UTC
  const nowUTC = new Date(date);

  // Преобразуем в местное время (UTC + offset)
  const localYear = nowUTC.getUTCFullYear();
  const localMonth = nowUTC.getUTCMonth();

  // Начало месяца в местном времени (первое число в 20:00)
  const monthStartLocal = new Date(Date.UTC(localYear, localMonth, 1));

  // Устанавливаем 20:00 местного времени = (20 - offset) UTC
  const utcHourForStart = (20 - TIMEZONE_OFFSET + 24) % 24;
  monthStartLocal.setUTCHours(utcHourForStart, 0, 0, 0);

  // Конец месяца - первое число следующего месяца в 20:00
  const monthEndLocal = new Date(Date.UTC(localYear, localMonth + 1, 1));
  monthEndLocal.setUTCHours(utcHourForStart, 0, 0, 0);

  console.log('📅 Production month (local 20:00-20:00):', {
    startUTC: monthStartLocal.toISOString(),
    endUTC: monthEndLocal.toISOString(),
  });

  return { start: monthStartLocal, end: monthEndLocal };
}

/**
 * Группировать данные по суткам (20:00 - 20:00)
 */
export interface DailyGroupedData {
  date: string; // YYYY-MM-DD
  data: ProductionData[];
  stats: DailyStats;
}

/**
 * Данные для 30-минутного интервала
 */
export interface ThirtyMinuteData {
  time: string; // HH:mm
  averageSpeed: number;
  totalProduction: number;
  recordCount: number;
}

export function groupDataByProductionDays(data: ProductionData[]): DailyGroupedData[] {
  if (!data || data.length === 0) return [];

  const grouped = new Map<string, ProductionData[]>();

  data.forEach((item) => {
    const itemDate = new Date(item.datetime);

    // Конвертируем в местное время
    const localTime = new Date(itemDate.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);
    const localHour = localTime.getUTCHours();
    const localDate = new Date(localTime);

    // Если до 20:00 местного времени, это относится к производственному дню,
    // который начался вчера в 20:00
    if (localHour < 20) {
      localDate.setUTCDate(localDate.getUTCDate() - 1);
    }

    // Форматируем местную дату
    const dayKey = format(localDate, 'yyyy-MM-dd');

    if (!grouped.has(dayKey)) {
      grouped.set(dayKey, []);
    }
    grouped.get(dayKey)!.push(item);
  });

  // Преобразуем в массив и рассчитываем статистику для каждого дня
  const result: DailyGroupedData[] = [];

  grouped.forEach((dayData, date) => {
    const sortedDayData = [...dayData].sort(
      (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
    );

    const stats = calculateDailyStats(dayData);

    // Логируем детали для каждого дня
    console.log(`📊 День ${date}:`, {
      записей: dayData.length,
      первая_запись: {
        время: sortedDayData[0]?.datetime,
        время_местное: new Date(new Date(sortedDayData[0]?.datetime).getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000).toISOString(),
        значение: sortedDayData[0]?.value,
      },
      последняя_запись: {
        время: sortedDayData[sortedDayData.length - 1]?.datetime,
        время_местное: new Date(new Date(sortedDayData[sortedDayData.length - 1]?.datetime).getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000).toISOString(),
        значение: sortedDayData[sortedDayData.length - 1]?.value,
      },
      производство: stats.totalProduction,
      средняя_скорость: stats.averageSpeed.toFixed(2),
    });

    result.push({ date, data: dayData, stats });
  });

  // Сортируем по дате
  result.sort((a, b) => a.date.localeCompare(b.date));

  return result;
}

/**
 * Группировать данные по 30-минутным интервалам
 */
export function aggregateToThirtyMinutes(data: ProductionData[]): ThirtyMinuteData[] {
  if (!data || data.length === 0) return [];

  const intervals = new Map<string, { speeds: number[]; production: number; count: number }>();

  data.forEach((item) => {
    const itemDate = new Date(item.datetime);

    // Конвертируем в местное время (UTC+5)
    const localTime = new Date(itemDate.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);
    const hour = localTime.getUTCHours();
    const minute = localTime.getUTCMinutes();

    // Округляем до ближайшего 30-минутного интервала
    const intervalMinute = minute < 30 ? 0 : 30;
    const timeKey = `${hour.toString().padStart(2, '0')}:${intervalMinute.toString().padStart(2, '0')}`;

    if (!intervals.has(timeKey)) {
      intervals.set(timeKey, { speeds: [], production: 0, count: 0 });
    }

    const interval = intervals.get(timeKey)!;
    interval.speeds.push(item.speed);
    interval.production += item.difference || 0;
    interval.count++;
  });

  // Преобразуем в массив и рассчитываем средние значения
  const result: ThirtyMinuteData[] = [];

  intervals.forEach((interval, time) => {
    const averageSpeed = interval.speeds.reduce((sum, s) => sum + s, 0) / interval.speeds.length;

    result.push({
      time,
      averageSpeed,
      totalProduction: interval.production,
      recordCount: interval.count,
    });
  });

  // Сортируем по времени
  result.sort((a, b) => a.time.localeCompare(b.time));

  return result;
}
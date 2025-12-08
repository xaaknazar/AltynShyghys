import { startOfDay, endOfDay, subDays, parseISO } from 'date-fns';

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
 * Получить начало и конец производственных суток (08:00 - 08:00) в UTC
 */
export function getProductionDayBounds(date: Date = new Date()) {
  // Текущее время в UTC
  const nowUTC = new Date(date);
  
  // Преобразуем в местное время (UTC + offset)
  const localHour = (nowUTC.getUTCHours() + TIMEZONE_OFFSET) % 24;
  
  // Начало суток в местном времени: 08:00
  const dayStartLocal = new Date(nowUTC);
  
  // Если сейчас до 08:00 местного времени, то сутки начались вчера
  if (localHour < 8) {
    dayStartLocal.setUTCDate(dayStartLocal.getUTCDate() - 1);
  }
  
  // Устанавливаем 08:00 местного времени = (8 - offset) UTC
  const utcHourForStart = (8 - TIMEZONE_OFFSET + 24) % 24;
  dayStartLocal.setUTCHours(utcHourForStart, 0, 0, 0);
  
  // Конец суток - следующий день в 08:00
  const dayEndLocal = new Date(dayStartLocal);
  dayEndLocal.setUTCDate(dayEndLocal.getUTCDate() + 1);
  
  console.log('🕐 Production day (local 08:00-08:00):', {
    startUTC: dayStartLocal.toISOString(),
    endUTC: dayEndLocal.toISOString(),
    startLocal: new Date(dayStartLocal.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000).toISOString(),
    endLocal: new Date(dayEndLocal.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000).toISOString(),
  });
  
  return { start: dayStartLocal, end: dayEndLocal };
}

/**
 * Получить границы предыдущих производственных суток
 */
export function getPreviousProductionDay(date: Date = new Date()) {
  const { start } = getProductionDayBounds(date);
  const previousDayEnd = new Date(start);
  const previousDayStart = new Date(start);
  previousDayStart.setUTCDate(previousDayStart.getUTCDate() - 1);
  
  console.log('🕐 Previous day (local 08:00-08:00):', {
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

  const firstValue = sortedData[0].value;
  const lastValue = sortedData[sortedData.length - 1].value;
  const totalProduction = lastValue - firstValue;

  const averageSpeed = data.reduce((sum, d) => sum + d.speed, 0) / data.length;
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
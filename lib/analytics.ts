import { ProductionData, TARGETS } from './utils';

/**
 * Расчет эффективности производства
 */
export function calculateEfficiency(speed: number): number {
  return (speed / TARGETS.hourly) * 100;
}

/**
 * Определение наиболее продуктивного периода
 */
export function findPeakProductionPeriod(data: ProductionData[]): {
  period: string;
  speed: number;
  efficiency: number;
} | null {
  if (data.length === 0) return null;

  const sortedBySpeed = [...data].sort((a, b) => b.speed - a.speed);
  const peak = sortedBySpeed[0];

  return {
    period: new Date(peak.datetime).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    speed: peak.speed,
    efficiency: calculateEfficiency(peak.speed),
  };
}

/**
 * Расчет времени достижения цели
 */
export function estimateGoalTime(
  currentProduction: number,
  currentSpeed: number,
  goal: number
): {
  hoursNeeded: number;
  estimatedTime: Date;
  possible: boolean;
} {
  const remaining = goal - currentProduction;
  
  if (remaining <= 0) {
    return {
      hoursNeeded: 0,
      estimatedTime: new Date(),
      possible: true,
    };
  }

  if (currentSpeed <= 0) {
    return {
      hoursNeeded: Infinity,
      estimatedTime: new Date(),
      possible: false,
    };
  }

  const hoursNeeded = remaining / currentSpeed;
  const estimatedTime = new Date(Date.now() + hoursNeeded * 60 * 60 * 1000);

  // Проверяем, можно ли достичь цели до конца суток (20:00 текущего дня)
  const endOfDay = new Date();
  if (endOfDay.getHours() < 20) {
    endOfDay.setHours(20, 0, 0, 0);
  } else {
    endOfDay.setDate(endOfDay.getDate() + 1);
    endOfDay.setHours(20, 0, 0, 0);
  }

  return {
    hoursNeeded,
    estimatedTime,
    possible: estimatedTime <= endOfDay,
  };
}

/**
 * Анализ трендов производительности
 */
export function analyzeTrend(data: ProductionData[]): {
  trend: 'increasing' | 'decreasing' | 'stable';
  change: number;
  description: string;
} {
  if (data.length < 2) {
    return {
      trend: 'stable',
      change: 0,
      description: 'Недостаточно данных для анализа',
    };
  }

  // Берем первую и последнюю четверть данных для сравнения
  const quarterSize = Math.floor(data.length / 4);
  const firstQuarter = data.slice(0, quarterSize);
  const lastQuarter = data.slice(-quarterSize);

  const avgFirstQuarter =
    firstQuarter.reduce((sum, d) => sum + d.speed, 0) / firstQuarter.length;
  const avgLastQuarter =
    lastQuarter.reduce((sum, d) => sum + d.speed, 0) / lastQuarter.length;

  const change = avgLastQuarter - avgFirstQuarter;
  const changePercent = (change / avgFirstQuarter) * 100;

  let trend: 'increasing' | 'decreasing' | 'stable';
  let description: string;

  if (Math.abs(changePercent) < 3) {
    trend = 'stable';
    description = 'Производительность стабильна';
  } else if (changePercent > 0) {
    trend = 'increasing';
    description = `Производительность растет на ${changePercent.toFixed(1)}%`;
  } else {
    trend = 'decreasing';
    description = `Производительность снижается на ${Math.abs(changePercent).toFixed(1)}%`;
  }

  return { trend, change, description };
}

/**
 * Расчет прогноза производства на конец суток
 */
export function forecastEndOfDay(data: ProductionData[]): {
  forecast: number;
  confidence: 'high' | 'medium' | 'low';
  achievesGoal: boolean;
} {
  if (data.length === 0) {
    return {
      forecast: 0,
      confidence: 'low',
      achievesGoal: false,
    };
  }

  const sortedData = [...data].sort(
    (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
  );

  const currentProduction = sortedData[sortedData.length - 1].value - sortedData[0].value;
  const elapsedHours =
    (new Date(sortedData[sortedData.length - 1].datetime).getTime() -
      new Date(sortedData[0].datetime).getTime()) /
    (1000 * 60 * 60);

  if (elapsedHours < 1) {
    return {
      forecast: 0,
      confidence: 'low',
      achievesGoal: false,
    };
  }

  // Средняя скорость
  const avgSpeed = currentProduction / elapsedHours;

  // Оставшееся время до конца суток
  const remainingHours = 24 - elapsedHours;

  // Прогноз
  const forecast = currentProduction + avgSpeed * remainingHours;

  // Уверенность зависит от количества данных и стабильности скорости
  let confidence: 'high' | 'medium' | 'low';
  if (data.length > 100 && elapsedHours > 12) {
    confidence = 'high';
  } else if (data.length > 50 && elapsedHours > 6) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return {
    forecast,
    confidence,
    achievesGoal: forecast >= TARGETS.daily,
  };
}

/**
 * Определение проблемных периодов (низкая производительность)
 */
export function findLowPerformancePeriods(data: ProductionData[]): Array<{
  start: string;
  end: string;
  avgSpeed: number;
  duration: number;
}> {
  if (data.length === 0) return [];

  const threshold = TARGETS.hourly * 0.8; // 80% от нормы
  const problems: Array<{
    start: string;
    end: string;
    avgSpeed: number;
    duration: number;
  }> = [];

  let currentProblemStart: string | null = null;
  let currentProblemSpeeds: number[] = [];

  for (let i = 0; i < data.length; i++) {
    const record = data[i];

    if (record.speed < threshold) {
      if (!currentProblemStart) {
        currentProblemStart = record.datetime;
      }
      currentProblemSpeeds.push(record.speed);
    } else {
      if (currentProblemStart && currentProblemSpeeds.length > 0) {
        const avgSpeed =
          currentProblemSpeeds.reduce((sum, s) => sum + s, 0) / currentProblemSpeeds.length;
        problems.push({
          start: currentProblemStart,
          end: data[i - 1].datetime,
          avgSpeed,
          duration: currentProblemSpeeds.length * 5, // минуты
        });
        currentProblemStart = null;
        currentProblemSpeeds = [];
      }
    }
  }

  // Если проблемный период продолжается до конца
  if (currentProblemStart && currentProblemSpeeds.length > 0) {
    const avgSpeed =
      currentProblemSpeeds.reduce((sum, s) => sum + s, 0) / currentProblemSpeeds.length;
    problems.push({
      start: currentProblemStart,
      end: data[data.length - 1].datetime,
      avgSpeed,
      duration: currentProblemSpeeds.length * 5,
    });
  }

  return problems;
}

/**
 * Форматирование времени в читабельный вид
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);

  if (hours === 0) {
    return `${mins} мин`;
  } else if (mins === 0) {
    return `${hours} ч`;
  } else {
    return `${hours} ч ${mins} мин`;
  }
}

/**
 * Расчет средней производительности за период
 */
export function calculateAveragePerformance(data: ProductionData[]): {
  avgSpeed: number;
  minSpeed: number;
  maxSpeed: number;
  stdDeviation: number;
} {
  if (data.length === 0) {
    return {
      avgSpeed: 0,
      minSpeed: 0,
      maxSpeed: 0,
      stdDeviation: 0,
    };
  }

  const speeds = data.map(d => d.speed);
  const avgSpeed = speeds.reduce((sum, s) => sum + s, 0) / speeds.length;
  const minSpeed = Math.min(...speeds);
  const maxSpeed = Math.max(...speeds);

  // Стандартное отклонение
  const variance = speeds.reduce((sum, s) => sum + Math.pow(s - avgSpeed, 2), 0) / speeds.length;
  const stdDeviation = Math.sqrt(variance);

  return {
    avgSpeed,
    minSpeed,
    maxSpeed,
    stdDeviation,
  };
}

/**
 * Определение оптимального времени для обслуживания
 */
export function suggestMaintenanceWindow(data: ProductionData[]): {
  suggestedTime: string;
  reason: string;
} | null {
  if (data.length === 0) return null;

  // Группируем данные по часам и находим час с наименьшей производительностью
  const hourlyData: { [key: number]: number[] } = {};

  data.forEach(record => {
    const hour = new Date(record.datetime).getHours();
    if (!hourlyData[hour]) {
      hourlyData[hour] = [];
    }
    hourlyData[hour].push(record.speed);
  });

  // Находим час с минимальной средней скоростью
  let minHour = -1;
  let minAvgSpeed = Infinity;

  Object.keys(hourlyData).forEach(hourStr => {
    const hour = parseInt(hourStr);
    const speeds = hourlyData[hour];
    const avgSpeed = speeds.reduce((sum, s) => sum + s, 0) / speeds.length;

    if (avgSpeed < minAvgSpeed) {
      minAvgSpeed = avgSpeed;
      minHour = hour;
    }
  });

  if (minHour === -1) return null;

  return {
    suggestedTime: `${minHour.toString().padStart(2, '0')}:00 - ${((minHour + 1) % 24).toString().padStart(2, '0')}:00`,
    reason: `Наименьшая средняя производительность (${minAvgSpeed.toFixed(1)} т/ч)`,
  };
}
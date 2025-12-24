// Типы лабораторных анализов
export const ANALYSIS_TYPES = {
  MOISTURE_ROASTER_1: 'moisture_roaster_1',
  MOISTURE_ROASTER_2: 'moisture_roaster_2',
  MOISTURE_PRESS_1: 'moisture_press_1',
  MOISTURE_PRESS_2: 'moisture_press_2',
  MOISTURE_TOASTED_MEAL: 'moisture_toasted_meal',
  OIL_CONTENT_MEAL: 'oil_content_meal',
} as const;

export type AnalysisType = typeof ANALYSIS_TYPES[keyof typeof ANALYSIS_TYPES];

// Конфигурация анализов с нормами
export const ANALYSIS_CONFIG: Record<AnalysisType, {
  label: string;
  unit: string;
  min: number;
  max: number;
  warningThreshold: number; // % отклонения от нормы для желтого
}> = {
  [ANALYSIS_TYPES.MOISTURE_ROASTER_1]: {
    label: 'Влага мезги с жаровни №1',
    unit: '%',
    min: 2,
    max: 3,
    warningThreshold: 0.2, // ±0.2% - желтый
  },
  [ANALYSIS_TYPES.MOISTURE_ROASTER_2]: {
    label: 'Влага мезги с жаровни №2',
    unit: '%',
    min: 2,
    max: 3,
    warningThreshold: 0.2,
  },
  [ANALYSIS_TYPES.MOISTURE_PRESS_1]: {
    label: 'Влага жмыха с пресса №1',
    unit: '%',
    min: 2,
    max: 3,
    warningThreshold: 0.2,
  },
  [ANALYSIS_TYPES.MOISTURE_PRESS_2]: {
    label: 'Влага жмыха с пресса №2',
    unit: '%',
    min: 2,
    max: 3,
    warningThreshold: 0.2,
  },
  [ANALYSIS_TYPES.MOISTURE_TOASTED_MEAL]: {
    label: 'Влага тостированного шрота',
    unit: '%',
    min: 10,
    max: 11,
    warningThreshold: 0.3,
  },
  [ANALYSIS_TYPES.OIL_CONTENT_MEAL]: {
    label: 'Масличность шрота',
    unit: '%',
    min: 0,
    max: 1,
    warningThreshold: 0.1,
  },
};

// Определение статуса анализа
export type AnalysisStatus = 'normal' | 'warning' | 'danger';

export function getAnalysisStatus(type: AnalysisType, value: number): AnalysisStatus {
  const config = ANALYSIS_CONFIG[type];

  // Для масличности (только max)
  if (type === ANALYSIS_TYPES.OIL_CONTENT_MEAL) {
    if (value <= config.max - config.warningThreshold) return 'normal';
    if (value <= config.max) return 'warning';
    return 'danger';
  }

  // Для остальных (диапазон min-max)
  const midPoint = (config.min + config.max) / 2;
  const range = config.max - config.min;

  if (value >= config.min && value <= config.max) {
    // Внутри нормы - проверяем насколько близко к границам
    if (Math.abs(value - midPoint) <= range / 2 - config.warningThreshold) {
      return 'normal';
    }
    return 'warning';
  }

  return 'danger';
}

// Типы смен
export type ShiftType = 'day' | 'night';

// Интерфейс записи анализа
export interface QualityAnalysis {
  id: string;
  shift_date: string; // YYYY-MM-DD
  shift_type: ShiftType;
  sample_time: string; // ISO datetime
  analysis_type: AnalysisType;
  value: number;
  technician_name?: string;
  comments?: string;
  created_at: string;
}

// Определение текущей смены
export function getCurrentShift(): { date: string; type: ShiftType } {
  const TIMEZONE_OFFSET = 5; // UTC+5
  const now = new Date();
  const localTime = new Date(now.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);
  const hour = localTime.getUTCHours();

  // Дневная смена: 08:00-20:00, Ночная смена: 20:00-08:00
  const isDayShift = hour >= 8 && hour < 20;
  const shiftType: ShiftType = isDayShift ? 'day' : 'night';

  // Дата смены
  const shiftDate = new Date(localTime);
  if (hour < 8) {
    // Если до 8 утра, это ночная смена предыдущего дня
    shiftDate.setUTCDate(shiftDate.getUTCDate() - 1);
  }

  return {
    date: shiftDate.toISOString().split('T')[0],
    type: shiftType,
  };
}

// Группировка данных
export interface GroupedAnalysis {
  shift_date: string;
  shift_type: ShiftType;
  analysis_type: AnalysisType;
  average: number;
  min: number;
  max: number;
  count: number;
  samples: QualityAnalysis[];
}

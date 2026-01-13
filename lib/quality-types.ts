// Типы лабораторных анализов
export const ANALYSIS_TYPES = {
  // Входящее сырье
  MOISTURE_RAW_MATERIAL: 'moisture_raw_material',
  OIL_CONTENT_RAW_MATERIAL: 'oil_content_raw_material',

  // Лузга
  MOISTURE_HUSK: 'moisture_husk',
  FAT_HUSK: 'fat_husk',
  KERNEL_LOSS_HUSK: 'kernel_loss_husk',

  // Рушанка
  MOISTURE_CRUSHED: 'moisture_crushed',
  HUSK_CONTENT_CRUSHED: 'husk_content_crushed',

  // Мезга с жаровни
  MOISTURE_ROASTER_1: 'moisture_roaster_1',
  MOISTURE_ROASTER_2: 'moisture_roaster_2',

  // Жмых с пресса
  MOISTURE_PRESS_1: 'moisture_press_1',
  MOISTURE_PRESS_2: 'moisture_press_2',
  FAT_PRESS_1: 'fat_press_1',
  FAT_PRESS_2: 'fat_press_2',

  // Шрот
  MOISTURE_TOASTED_MEAL: 'moisture_toasted_meal',
  OIL_CONTENT_MEAL: 'oil_content_meal',

  // Мисцелла (экстракция)
  MISCELLA_CONCENTRATION: 'miscella_concentration',
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
  // Входящее сырье
  [ANALYSIS_TYPES.MOISTURE_RAW_MATERIAL]: {
    label: 'Влага входящего сырья',
    unit: '%',
    min: 6,
    max: 8,
    warningThreshold: 0.3,
  },
  [ANALYSIS_TYPES.OIL_CONTENT_RAW_MATERIAL]: {
    label: 'Масличность входящего сырья',
    unit: '%',
    min: 45, // Обычно ~49%, установим диапазон 45-55
    max: 55,
    warningThreshold: 2,
  },

  // Лузга
  [ANALYSIS_TYPES.MOISTURE_HUSK]: {
    label: 'Влага лузги',
    unit: '%',
    min: 9, // Обычно 11-12%, установим диапазон 9-14
    max: 14,
    warningThreshold: 1,
  },
  [ANALYSIS_TYPES.FAT_HUSK]: {
    label: 'Жир лузги',
    unit: '%',
    min: 0,
    max: 4.5,
    warningThreshold: 0.3,
  },
  [ANALYSIS_TYPES.KERNEL_LOSS_HUSK]: {
    label: 'Вынос ядра в лузгу',
    unit: '%',
    min: 0,
    max: 1,
    warningThreshold: 0.1,
  },

  // Рушанка
  [ANALYSIS_TYPES.MOISTURE_CRUSHED]: {
    label: 'Влага рушанки',
    unit: '%',
    min: 0,
    max: 5,
    warningThreshold: 0.3,
  },
  [ANALYSIS_TYPES.HUSK_CONTENT_CRUSHED]: {
    label: 'Лузжистость рушанки',
    unit: '%',
    min: 10,
    max: 11,
    warningThreshold: 0.2,
  },

  // Мезга с жаровни
  [ANALYSIS_TYPES.MOISTURE_ROASTER_1]: {
    label: 'Влага мезги с жаровни №1',
    unit: '%',
    min: 2,
    max: 3,
    warningThreshold: 0.2,
  },
  [ANALYSIS_TYPES.MOISTURE_ROASTER_2]: {
    label: 'Влага мезги с жаровни №2',
    unit: '%',
    min: 2,
    max: 3,
    warningThreshold: 0.2,
  },

  // Жмых с пресса
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
  [ANALYSIS_TYPES.FAT_PRESS_1]: {
    label: 'Жир жмыха с пресса №1',
    unit: '%',
    min: 20,
    max: 24, // ~22%, установим диапазон 20-24
    warningThreshold: 1,
  },
  [ANALYSIS_TYPES.FAT_PRESS_2]: {
    label: 'Жир жмыха с пресса №2',
    unit: '%',
    min: 20,
    max: 24,
    warningThreshold: 1,
  },

  // Шрот
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

  // Мисцелла (экстракция)
  [ANALYSIS_TYPES.MISCELLA_CONCENTRATION]: {
    label: 'Концентрация мисцеллы',
    unit: '%',
    min: 25,
    max: 30,
    warningThreshold: 1,
  },
};

// Определение статуса анализа
export type AnalysisStatus = 'normal' | 'warning' | 'danger';

export function getAnalysisStatus(type: AnalysisType, value: number): AnalysisStatus {
  const config = ANALYSIS_CONFIG[type];

  // Для анализов с min = 0 (только max) - типа "до X%"
  const onlyMaxTypes: readonly AnalysisType[] = [
    ANALYSIS_TYPES.OIL_CONTENT_MEAL,
    ANALYSIS_TYPES.FAT_HUSK,
    ANALYSIS_TYPES.KERNEL_LOSS_HUSK,
    ANALYSIS_TYPES.MOISTURE_CRUSHED,
  ] as const;

  if (onlyMaxTypes.includes(type)) {
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

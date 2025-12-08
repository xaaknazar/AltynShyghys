export interface ProductionRecord {
  _id: string;
  datetime: string;
  value: number;
  difference: number;
  speed: number;
  metric_unit: string;
}

export interface ProductionStats {
  totalProduction: number;
  averageSpeed: number;
  currentSpeed: number;
  progress: number;
  status: 'normal' | 'warning' | 'danger';
}

export interface ProductionPeriod {
  start: Date;
  end: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  period?: {
    start: string;
    end: string;
  };
}

export interface Targets {
  hourly: number;
  shift: number;
  daily: number;
}

export const PRODUCTION_TARGETS: Targets = {
  hourly: 50,
  shift: 600,
  daily: 1200,
};

export type StatusType = 'normal' | 'warning' | 'danger';

export interface StatusConfig {
  color: string;
  glow: string;
  gradient: string;
  label: string;
}
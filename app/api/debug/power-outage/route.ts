import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { TIMEZONE_OFFSET } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Диагностический эндпоинт для анализа данных после посадки света 10-11 февраля 2026
 *
 * Использование:
 *   /api/debug/power-outage
 *   /api/debug/power-outage?date=2026-02-10
 *   /api/debug/power-outage?date=2026-02-11
 */
export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const rawCollection = db.collection('Rvo_Production_Job');
    const shiftCollection = db.collection('Rvo_Production_Job_shift_report');

    const searchParams = request.nextUrl.searchParams;
    const targetDate = searchParams.get('date') || '2026-02-11';

    // Период анализа: production day = targetDate 08:00 → targetDate+1 08:00 (UTC+5)
    // Плюс берём данные за предыдущий день для контекста
    const analyzeStart = new Date(`${targetDate}T03:00:00.000Z`); // 08:00 UTC+5 = 03:00 UTC
    // Для контекста берём ещё предыдущий день
    const contextStart = new Date(analyzeStart.getTime() - 24 * 60 * 60 * 1000);
    const analyzeEnd = new Date(analyzeStart.getTime() + 48 * 60 * 60 * 1000); // +2 дня

    // ========== 1. RAW DATA (Rvo_Production_Job) ==========
    const rawData = await rawCollection
      .find({
        datetime: { $gte: contextStart, $lt: analyzeEnd }
      })
      .sort({ datetime: 1 })
      .toArray();

    // ========== 2. SHIFT REPORTS ==========
    const shiftReports = await shiftCollection
      .find({
        datetime: { $gte: contextStart, $lt: analyzeEnd }
      })
      .sort({ datetime: 1 })
      .toArray();

    // ========== 3. АНАЛИЗ СЫРЫХ ДАННЫХ ==========
    // Группируем записи по часам чтобы найти пробелы
    const hourlyBuckets: Record<string, {
      count: number;
      totalDiff: number;
      minSpeed: number;
      maxSpeed: number;
      avgSpeed: number;
      speeds: number[];
      firstRecord: string;
      lastRecord: string;
      anomalies: string[];
    }> = {};

    let prevTimestamp: number | null = null;
    let prevValue: number | null = null;
    const gaps: { from: string; to: string; gapMinutes: number }[] = [];
    const anomalousRecords: {
      datetime: string;
      localTime: string;
      value: number;
      difference: number;
      speed: number;
      issue: string;
    }[] = [];

    rawData.forEach((doc, index) => {
      const utcTime = new Date(doc.datetime);
      const localTime = new Date(utcTime.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);
      const hourKey = localTime.toISOString().substring(0, 13) + ':00'; // YYYY-MM-DDTHH:00

      if (!hourlyBuckets[hourKey]) {
        hourlyBuckets[hourKey] = {
          count: 0,
          totalDiff: 0,
          minSpeed: Infinity,
          maxSpeed: -Infinity,
          avgSpeed: 0,
          speeds: [],
          firstRecord: localTime.toISOString(),
          lastRecord: localTime.toISOString(),
          anomalies: [],
        };
      }

      const bucket = hourlyBuckets[hourKey];
      bucket.count++;
      bucket.totalDiff += (doc.difference || 0) > 0 ? (doc.difference || 0) : 0;
      bucket.speeds.push(doc.speed || 0);
      bucket.minSpeed = Math.min(bucket.minSpeed, doc.speed || 0);
      bucket.maxSpeed = Math.max(bucket.maxSpeed, doc.speed || 0);
      bucket.lastRecord = localTime.toISOString();

      // Проверяем промежутки между записями (нормально: 2-5 минут)
      const currentTimestamp = utcTime.getTime();
      if (prevTimestamp !== null) {
        const gapMinutes = (currentTimestamp - prevTimestamp) / (1000 * 60);
        if (gapMinutes > 15) {
          const fromLocal = new Date(prevTimestamp + TIMEZONE_OFFSET * 60 * 60 * 1000);
          gaps.push({
            from: fromLocal.toISOString(),
            to: localTime.toISOString(),
            gapMinutes: Math.round(gapMinutes),
          });
        }
      }

      // Проверяем аномалии в данных
      const issues: string[] = [];

      // Аномальная скорость (> 200 т/ч или отрицательная)
      if ((doc.speed || 0) > 200) {
        issues.push(`Скорость аномально высокая: ${doc.speed} т/ч`);
      }
      if ((doc.speed || 0) < 0) {
        issues.push(`Отрицательная скорость: ${doc.speed} т/ч`);
      }

      // Аномальный difference (> 100 тонн за одну запись ~ 5 минут)
      if ((doc.difference || 0) > 100) {
        issues.push(`Аномально высокий difference: ${doc.difference} т (одна запись ~5мин)`);
      }
      if ((doc.difference || 0) < -10) {
        issues.push(`Большой отрицательный difference: ${doc.difference} т`);
      }

      // Скачок value назад (сброс счётчика)
      if (prevValue !== null && doc.value < prevValue - 10) {
        issues.push(`Откат value: ${prevValue} → ${doc.value} (сброс счётчика?)`);
      }

      // Резкий скачок value вперёд (> 100 тонн за одну запись)
      if (prevValue !== null && (doc.value - prevValue) > 100) {
        issues.push(`Скачок value: ${prevValue} → ${doc.value} (+${doc.value - prevValue} за одну запись)`);
      }

      if (issues.length > 0) {
        anomalousRecords.push({
          datetime: utcTime.toISOString(),
          localTime: localTime.toISOString(),
          value: doc.value,
          difference: doc.difference || 0,
          speed: doc.speed || 0,
          issue: issues.join('; '),
        });
        bucket.anomalies.push(...issues);
      }

      prevTimestamp = currentTimestamp;
      prevValue = doc.value;
    });

    // Рассчитываем средние скорости в бакетах
    Object.values(hourlyBuckets).forEach(bucket => {
      bucket.avgSpeed = bucket.speeds.length > 0
        ? bucket.speeds.reduce((s, v) => s + v, 0) / bucket.speeds.length
        : 0;
      if (bucket.minSpeed === Infinity) bucket.minSpeed = 0;
      if (bucket.maxSpeed === -Infinity) bucket.maxSpeed = 0;
    });

    // ========== 4. АНАЛИЗ PRODUCTION DAY (08:00-08:00) ==========
    // Текущий production day = targetDate
    const prodDayStart = new Date(`${targetDate}T03:00:00.000Z`); // 08:00 UTC+5
    const prodDayEnd = new Date(prodDayStart.getTime() + 24 * 60 * 60 * 1000);

    const prodDayRaw = rawData.filter(doc => {
      const dt = new Date(doc.datetime);
      return dt >= prodDayStart && dt < prodDayEnd;
    });

    // Расчёт как делает сейчас monthly API
    let currentCalcTotalProduction = 0;
    prodDayRaw.forEach(doc => {
      const diff = doc.difference || 0;
      if (diff > 0) currentCalcTotalProduction += diff;
    });

    let currentCalcAvgSpeed = 0;
    let currentCalcHoursElapsed = 0;
    if (prodDayRaw.length > 0) {
      const sorted = [...prodDayRaw].sort((a, b) =>
        new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
      );
      const firstTime = new Date(sorted[0].datetime).getTime();
      const lastTime = new Date(sorted[sorted.length - 1].datetime).getTime();
      currentCalcHoursElapsed = (lastTime - firstTime) / (1000 * 60 * 60);
      currentCalcAvgSpeed = currentCalcHoursElapsed > 0
        ? currentCalcTotalProduction / currentCalcHoursElapsed
        : 0;
    }

    // Правильный расчёт (от начала production day до сейчас)
    const nowUTC = new Date();
    const realHoursElapsed = Math.min(
      24,
      (nowUTC.getTime() - prodDayStart.getTime()) / (1000 * 60 * 60)
    );
    const correctAvgSpeed = realHoursElapsed > 0
      ? currentCalcTotalProduction / realHoursElapsed
      : 0;

    // Прогноз по текущему (неправильному) расчёту
    const hoursRemaining = Math.max(0, (prodDayEnd.getTime() - nowUTC.getTime()) / (1000 * 60 * 60));
    const wrongForecast = currentCalcTotalProduction + (currentCalcAvgSpeed * hoursRemaining);
    const correctForecast = currentCalcTotalProduction + (correctAvgSpeed * hoursRemaining);

    // ========== 5. SHIFT REPORTS АНАЛИЗ ==========
    const shiftReportsFormatted = shiftReports.map(doc => {
      const utcTime = new Date(doc.datetime);
      const localTime = new Date(utcTime.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);
      const hour = localTime.getUTCHours();
      let shiftType = 'unknown';
      if (hour >= 6 && hour <= 10) shiftType = 'night (завершение ночной)';
      else if (hour >= 18 && hour <= 22) shiftType = 'day (завершение дневной)';

      return {
        datetime_utc: utcTime.toISOString(),
        datetime_local: localTime.toISOString(),
        hour_local: hour,
        shift_type: shiftType,
        difference: doc.difference || 0,
        speed: doc.speed || 0,
        value: doc.value,
      };
    });

    // ========== 6. ИТОГОВЫЙ ОТЧЁТ ==========
    const report = {
      analysis_date: targetDate,
      analysis_time_utc: nowUTC.toISOString(),
      analysis_time_local: new Date(nowUTC.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000).toISOString(),

      production_day: {
        date: targetDate,
        start_local: new Date(prodDayStart.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000).toISOString(),
        end_local: new Date(prodDayEnd.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000).toISOString(),
        raw_records_count: prodDayRaw.length,
        total_production_tonnes: Math.round(currentCalcTotalProduction * 10) / 10,
      },

      average_speed_comparison: {
        current_calculation: {
          method: 'totalProduction / (lastRecord - firstRecord)',
          hours_elapsed: Math.round(currentCalcHoursElapsed * 100) / 100,
          avg_speed: Math.round(currentCalcAvgSpeed * 10) / 10,
          forecast: Math.round(wrongForecast),
          note: 'ЭТО ТО ЧТО ПОКАЗЫВАЕТ ДАШБОРД СЕЙЧАС',
        },
        correct_calculation: {
          method: 'totalProduction / (now - productionDayStart)',
          hours_elapsed: Math.round(realHoursElapsed * 100) / 100,
          avg_speed: Math.round(correctAvgSpeed * 10) / 10,
          forecast: Math.round(correctForecast),
          note: 'ТАК ДОЛЖНО БЫТЬ (реальное время с начала суток)',
        },
        difference: {
          speed_inflation: `${Math.round(currentCalcAvgSpeed * 10) / 10} → ${Math.round(correctAvgSpeed * 10) / 10} (в ${Math.round((currentCalcAvgSpeed / (correctAvgSpeed || 1)) * 10) / 10}x завышена)`,
          forecast_error: `${Math.round(wrongForecast)} → ${Math.round(correctForecast)} (ошибка ${Math.round(wrongForecast - correctForecast)} т)`,
        }
      },

      data_gaps: {
        total_gaps: gaps.length,
        gaps_over_15min: gaps.filter(g => g.gapMinutes > 15),
        gaps_over_60min: gaps.filter(g => g.gapMinutes > 60),
        longest_gap_minutes: gaps.length > 0 ? Math.max(...gaps.map(g => g.gapMinutes)) : 0,
        details: gaps,
      },

      anomalous_records: {
        total: anomalousRecords.length,
        details: anomalousRecords,
      },

      hourly_breakdown: hourlyBuckets,

      shift_reports: {
        total: shiftReportsFormatted.length,
        details: shiftReportsFormatted,
      },

      raw_data_summary: {
        total_records_in_range: rawData.length,
        date_range: {
          first_record: rawData.length > 0 ? new Date(new Date(rawData[0].datetime).getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000).toISOString() : null,
          last_record: rawData.length > 0 ? new Date(new Date(rawData[rawData.length - 1].datetime).getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000).toISOString() : null,
        }
      },
    };

    return NextResponse.json({ success: true, report });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Debug power-outage error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

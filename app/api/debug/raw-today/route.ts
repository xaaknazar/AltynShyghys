import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { TIMEZONE_OFFSET } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Показывает ВСЕ сырые записи за production day (08:00-08:00)
 * Сортировка по difference DESC — аномалии сверху
 *
 * /api/debug/raw-today              — текущий production day
 * /api/debug/raw-today?date=2026-02-10  — конкретная дата
 * /api/debug/raw-today?sort=time    — сортировка по времени
 */
export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const rawCollection = db.collection('Rvo_Production_Job');

    const searchParams = request.nextUrl.searchParams;
    const sortBy = searchParams.get('sort') || 'diff'; // 'diff' или 'time'

    // Определяем production day
    let targetDate = searchParams.get('date');
    if (!targetDate) {
      const now = new Date();
      const localNow = new Date(now.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);
      const localHour = localNow.getUTCHours();
      const prodDate = new Date(localNow);
      if (localHour < 8) {
        prodDate.setUTCDate(prodDate.getUTCDate() - 1);
      }
      targetDate = prodDate.toISOString().split('T')[0];
    }

    // Production day boundaries: targetDate 08:00 UTC+5 → targetDate+1 08:00 UTC+5
    const prodDayStartUTC = new Date(`${targetDate}T03:00:00.000Z`); // 08:00 UTC+5
    const prodDayEndUTC = new Date(prodDayStartUTC.getTime() + 24 * 60 * 60 * 1000);

    const rawData = await rawCollection
      .find({
        datetime: { $gte: prodDayStartUTC, $lt: prodDayEndUTC }
      })
      .sort({ datetime: 1 })
      .toArray();

    // Форматируем и анализируем
    let prevTimestamp: number | null = null;
    let prevValue: number | null = null;

    const records = rawData.map((doc, index) => {
      const utcTime = new Date(doc.datetime);
      const localTime = new Date(utcTime.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);
      const diff = doc.difference || 0;
      const speed = doc.speed || 0;

      const issues: string[] = [];

      // Пробел > 15 мин
      if (prevTimestamp !== null) {
        const gapMin = (utcTime.getTime() - prevTimestamp) / (1000 * 60);
        if (gapMin > 15) {
          issues.push(`ПРОБЕЛ ${Math.round(gapMin)} мин`);
        }
      }

      // Аномальный difference
      if (diff > 20) issues.push(`ВЫСОКИЙ difference: ${diff}т`);
      if (diff < -5) issues.push(`ОТРИЦАТЕЛЬНЫЙ difference: ${diff}т`);

      // Скачок value
      if (prevValue !== null && doc.value < prevValue - 5) {
        issues.push(`СБРОС value: ${prevValue.toFixed(1)} → ${doc.value.toFixed(1)}`);
      }
      if (prevValue !== null && (doc.value - prevValue) > 50) {
        issues.push(`СКАЧОК value: +${(doc.value - prevValue).toFixed(1)}`);
      }

      // Аномальная скорость
      if (speed > 150) issues.push(`СКОРОСТЬ ${speed} т/ч`);

      prevTimestamp = utcTime.getTime();
      prevValue = doc.value;

      return {
        n: index + 1,
        time_local: localTime.toISOString().substring(11, 19),
        time_utc: utcTime.toISOString(),
        value: Math.round(doc.value * 10) / 10,
        difference: Math.round(diff * 100) / 100,
        speed: Math.round(speed * 10) / 10,
        issues: issues.length > 0 ? issues.join('; ') : null,
      };
    });

    // Сортировка
    const sorted = sortBy === 'diff'
      ? [...records].sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
      : records; // уже по времени

    // Статистика
    const totalDiff = records.reduce((s, r) => s + (r.difference > 0 ? r.difference : 0), 0);
    const avgDiff = records.length > 0 ? totalDiff / records.length : 0;
    const anomalous = records.filter(r => r.issues !== null);
    const top10Diff = [...records].sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference)).slice(0, 10);

    // Средняя скорость speed из записей
    const avgSpeed = records.length > 0
      ? records.reduce((s, r) => s + r.speed, 0) / records.length
      : 0;

    // Производство без аномалий (difference > 20)
    const normalRecords = records.filter(r => r.difference <= 20 && r.difference >= 0);
    const totalWithoutAnomalies = normalRecords.reduce((s, r) => s + r.difference, 0);
    const anomalyRecords = records.filter(r => r.difference > 20);
    const totalFromAnomalies = anomalyRecords.reduce((s, r) => s + r.difference, 0);

    return NextResponse.json({
      success: true,
      production_day: targetDate,
      sort: sortBy,
      summary: {
        total_records: records.length,
        total_production: Math.round(totalDiff * 10) / 10,
        avg_difference_per_record: Math.round(avgDiff * 100) / 100,
        avg_speed_from_records: Math.round(avgSpeed * 10) / 10,
        records_with_issues: anomalous.length,
        production_without_anomalies: {
          normal_records: normalRecords.length,
          total: Math.round(totalWithoutAnomalies * 10) / 10,
          note: 'Записи с difference <= 20 т (нормальные ~5мин интервалы)',
        },
        production_from_anomalies: {
          anomaly_records: anomalyRecords.length,
          total: Math.round(totalFromAnomalies * 10) / 10,
          note: 'Записи с difference > 20 т (вероятно повреждённые)',
        },
      },
      top_10_largest_difference: top10Diff,
      all_issues: anomalous,
      records: sorted,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { groupDataByProductionDays, TIMEZONE_OFFSET } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Получить данные производства за период
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date'); // YYYY-MM-DD
    const endDate = searchParams.get('end_date'); // YYYY-MM-DD
    const shiftType = searchParams.get('shift_type'); // 'all' | 'day' | 'night'

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'Missing start_date or end_date parameters' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const collection = db.collection('Rvo_Production_Job');

    // Конвертируем даты в UTC для запроса
    // Производственный день "01.01" начинается 31.12 в 20:00 (ночная смена)
    // Поэтому нужно начать выборку с предыдущего дня
    const startDateTime = new Date(`${startDate}T20:00:00`);
    startDateTime.setDate(startDateTime.getDate() - 1); // Вычитаем день для захвата ночной смены
    const startUTC = new Date(startDateTime.getTime() - TIMEZONE_OFFSET * 60 * 60 * 1000);

    // Конец: следующий день после endDate в 20:00 местного времени
    const endDateTime = new Date(endDate);
    endDateTime.setDate(endDateTime.getDate() + 1);
    const endDateTimeStr = endDateTime.toISOString().split('T')[0];
    const endDateTimeFull = new Date(`${endDateTimeStr}T20:00:00`);
    const endUTC = new Date(endDateTimeFull.getTime() - TIMEZONE_OFFSET * 60 * 60 * 1000);

    console.log('🔍 Fetching production data:', {
      startDate,
      endDate,
      startUTC: startUTC.toISOString(),
      endUTC: endUTC.toISOString(),
    });

    // Получаем данные за период
    const data = await collection
      .find({
        datetime: {
          $gte: startUTC,
          $lt: endUTC,
        },
      })
      .sort({ datetime: 1 })
      .toArray();

    console.log(`✅ Found ${data.length} records`);

    if (data.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
      });
    }

    const formattedData = data.map((doc) => ({
      _id: doc._id.toString(),
      datetime: doc.datetime.toISOString(),
      value: doc.value,
      difference: doc.difference || 0,
      speed: doc.speed,
      metric_unit: doc.metric_unit || 'тонна',
    }));

    // Группируем данные по суткам (20:00-20:00)
    const dailyGrouped = groupDataByProductionDays(formattedData);

    // Преобразуем в нужный формат с разделением на смены
    const result = dailyGrouped.map((day) => {
      // Разделяем на дневную (08:00-20:00) и ночную (20:00-08:00) смены
      const dayShiftData = day.data.filter((item) => {
        const itemDate = new Date(item.datetime);
        const localTime = new Date(itemDate.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);
        const hour = localTime.getUTCHours();
        return hour >= 8 && hour < 20;
      });

      const nightShiftData = day.data.filter((item) => {
        const itemDate = new Date(item.datetime);
        const localTime = new Date(itemDate.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);
        const hour = localTime.getUTCHours();
        return hour < 8 || hour >= 20;
      });

      // Суммируем только положительные значения difference (игнорируем отрицательные - сброс счетчика)
      const dayShiftProduction = dayShiftData.reduce((sum, d) => {
        const diff = d.difference || 0;
        return sum + (diff > 0 ? diff : 0);
      }, 0);
      const nightShiftProduction = nightShiftData.reduce((sum, d) => {
        const diff = d.difference || 0;
        return sum + (diff > 0 ? diff : 0);
      }, 0);

      return {
        date: day.date,
        dayShift: dayShiftProduction,
        nightShift: nightShiftProduction,
        total: day.stats.totalProduction,
      };
    });

    // Фильтруем по типу смены если указан
    let filteredResult = result;
    if (shiftType === 'day') {
      filteredResult = result.map(r => ({ ...r, nightShift: 0, total: r.dayShift }));
    } else if (shiftType === 'night') {
      filteredResult = result.map(r => ({ ...r, dayShift: 0, total: r.nightShift }));
    }

    const response = NextResponse.json({
      success: true,
      data: filteredResult,
      count: filteredResult.length,
    });

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('Error fetching production range data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch production range data' },
      { status: 500 }
    );
  }
}

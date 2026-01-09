import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { aggregateToThirtyMinutes, TIMEZONE_OFFSET } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Получить детальные данные производства за сутки (30-минутные интервалы)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date'); // YYYY-MM-DD

    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Missing date parameter' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const collection = db.collection('Rvo_Production_Job');

    // Производственный день начинается в 08:00 текущего дня (дневная смена)
    const startDateTime = new Date(`${date}T08:00:00`);
    const startUTC = new Date(startDateTime.getTime() - TIMEZONE_OFFSET * 60 * 60 * 1000);

    // Конец: следующий день в 08:00 местного времени
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);
    const endDateStr = endDate.toISOString().split('T')[0];
    const endDateTime = new Date(`${endDateStr}T08:00:00`);
    const endUTC = new Date(endDateTime.getTime() - TIMEZONE_OFFSET * 60 * 60 * 1000);

    console.log('🔍 Fetching detailed production data:', {
      date,
      startUTC: startUTC.toISOString(),
      endUTC: endUTC.toISOString(),
    });

    // Получаем данные за сутки
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

    // Группируем данные по 30-минутным интервалам
    const thirtyMinuteData = aggregateToThirtyMinutes(formattedData);

    const response = NextResponse.json({
      success: true,
      data: thirtyMinuteData,
      count: thirtyMinuteData.length,
      date: date,
    });

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('Error fetching detailed production data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch detailed production data' },
      { status: 500 }
    );
  }
}

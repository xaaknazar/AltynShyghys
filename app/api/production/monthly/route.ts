import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getProductionMonthBounds, groupDataByProductionDays } from '@/lib/utils';

// Отключаем кеширование для получения свежих данных
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('Rvo_Production_Job');

    const { start, end } = getProductionMonthBounds();

    console.log('🔍 Searching for monthly data between:', {
      start: start.toISOString(),
      end: end.toISOString(),
    });

    // Получаем данные за месяц
    const data = await collection
      .find({
        datetime: {
          $gte: start,
          $lt: end,
        },
      })
      .sort({ datetime: 1 })
      .toArray();

    console.log(`✅ Found ${data.length} records for current month`);

    if (data.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No data found for current month',
      }, { status: 404 });
    }

    const formattedData = data.map((doc) => ({
      _id: doc._id.toString(),
      datetime: doc.datetime.toISOString(),
      value: doc.value,
      difference: doc.difference || 0,
      speed: doc.speed,
      metric_unit: doc.metric_unit || 'тонна',
    }));

    // Группируем данные по суткам
    const dailyGrouped = groupDataByProductionDays(formattedData);

    const response = NextResponse.json({
      success: true,
      data: formattedData,
      dailyGrouped: dailyGrouped,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      count: formattedData.length,
      daysCount: dailyGrouped.length,
    });

    // Отключаем кеширование на клиенте
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error: any) {
    console.error('❌ Error fetching monthly data:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

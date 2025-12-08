import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getProductionDayBounds } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('Rvo_Production_Job');

    const { start, end } = getProductionDayBounds();

    console.log('🔍 Searching for data between:', {
      start: start.toISOString(),
      end: end.toISOString(),
    });

    // Ищем данные за производственные сутки (08:00-08:00 местного времени)
    const data = await collection
      .find({
        datetime: {
          $gte: start,
          $lt: end,
        },
      })
      .sort({ datetime: 1 })
      .toArray();

    console.log(`✅ Found ${data.length} records for current production day`);

    // Если данных нет - берем последние 288 записей
    if (data.length === 0) {
      console.log('⚠️ No data for current period, fetching latest 288 records...');
      
      const latestData = await collection
        .find({})
        .sort({ datetime: -1 })
        .limit(288)
        .toArray();
      
      const sortedLatest = latestData.reverse();
      
      const formattedLatest = sortedLatest.map((doc) => ({
        _id: doc._id.toString(),
        datetime: doc.datetime.toISOString(),
        value: doc.value,
        difference: doc.difference || 0,
        speed: doc.speed,
        metric_unit: doc.metric_unit || 'тонна',
      }));

      return NextResponse.json({
        success: true,
        data: formattedLatest,
        period: {
          start: formattedLatest[0]?.datetime || start.toISOString(),
          end: formattedLatest[formattedLatest.length - 1]?.datetime || end.toISOString(),
        },
        count: formattedLatest.length,
        isLatest: true,
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

    return NextResponse.json({
      success: true,
      data: formattedData,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      count: formattedData.length,
    });
  } catch (error: any) {
    console.error('❌ Error fetching current data:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
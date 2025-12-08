import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getPreviousProductionDay } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('Rvo_Production_Job');

    const { start, end } = getPreviousProductionDay();

    console.log('🔍 Searching for previous day data between:', {
      start: start.toISOString(),
      end: end.toISOString(),
    });

    const data = await collection
      .find({
        datetime: {
          $gte: start,
          $lt: end,
        },
      })
      .sort({ datetime: 1 })
      .toArray();

    console.log(`✅ Found ${data.length} records for previous production day`);

    // Если данных нет - берем записи 288-576
    if (data.length === 0) {
      console.log('⚠️ No data for previous period, fetching older records...');
      
      const latestData = await collection
        .find({})
        .sort({ datetime: -1 })
        .limit(576)
        .toArray();
      
      const previousData = latestData.slice(288, 576).reverse();
      
      const formattedPrevious = previousData.map((doc) => ({
        _id: doc._id.toString(),
        datetime: doc.datetime.toISOString(),
        value: doc.value,
        difference: doc.difference || 0,
        speed: doc.speed,
        metric_unit: doc.metric_unit || 'тонна',
      }));

      return NextResponse.json({
        success: true,
        data: formattedPrevious,
        period: {
          start: formattedPrevious[0]?.datetime || start.toISOString(),
          end: formattedPrevious[formattedPrevious.length - 1]?.datetime || end.toISOString(),
        },
        count: formattedPrevious.length,
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
    console.error('❌ Error fetching previous data:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
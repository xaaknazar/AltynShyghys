import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// Отключаем кеширование для получения свежих данных
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('Rvo_Production_Job');

    const latestData = await collection
      .find({})
      .sort({ datetime: -1 })
      .limit(1)
      .toArray();

    if (latestData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No data found',
      }, { status: 404 });
    }

    const doc = latestData[0];
    
    const response = NextResponse.json({
      success: true,
      data: {
        _id: doc._id.toString(),
        datetime: doc.datetime.toISOString(),
        value: doc.value,
        difference: doc.difference,
        speed: doc.speed,
        metric_unit: doc.metric_unit,
      },
    });

    // Отключаем кеширование на клиенте
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('Error fetching latest data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}
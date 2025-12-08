import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

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
    
    return NextResponse.json({
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
  } catch (error) {
    console.error('Error fetching latest data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}
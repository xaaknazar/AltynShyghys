import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { client } = await connectToDatabase();
    const db = client.db('scheduler-sync-pro');
    const coll = db.collection('Data_Extractor_Cooking');

    // Получаем последние 10 документов
    const docs = await coll
      .find({})
      .sort({ datetime: -1 })
      .limit(10)
      .toArray();

    // Собираем все уникальные метрики
    const metricsMap = new Map<string, { unit: string; sampleValue: number }>();

    docs.forEach(doc => {
      if (doc.values && Array.isArray(doc.values)) {
        doc.values.forEach((val: any) => {
          if (!metricsMap.has(val.title)) {
            metricsMap.set(val.title, {
              unit: val.metric_unit,
              sampleValue: val.value
            });
          }
        });
      }
    });

    const metrics = Array.from(metricsMap.entries()).map(([title, data]) => ({
      title,
      unit: data.unit,
      sampleValue: data.sampleValue
    }));

    return NextResponse.json({
      success: true,
      collection: 'Data_Extractor_Cooking',
      totalMetrics: metrics.length,
      metrics
    });
  } catch (error) {
    console.error('Error listing metrics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list metrics' },
      { status: 500 }
    );
  }
}

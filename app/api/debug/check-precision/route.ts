import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const collection = searchParams.get('collection') || 'Data_Extractor_Cooking';
    const limit = parseInt(searchParams.get('limit') || '10');

    const { client } = await connectToDatabase();
    const db = client.db('scheduler-sync-pro');
    const coll = db.collection(collection);

    // Получаем последние документы
    const data = await coll
      .find({})
      .sort({ datetime: -1 })
      .limit(limit)
      .toArray();

    // Анализируем типы данных
    const analysis: any[] = [];

    data.forEach((doc, docIndex) => {
      if (doc.values && Array.isArray(doc.values)) {
        doc.values.forEach((val: any) => {
          if (val.title && val.title.toLowerCase().includes('масличность')) {
            analysis.push({
              datetime: doc.datetime,
              title: val.title,
              value: val.value,
              valueType: typeof val.value,
              isInteger: Number.isInteger(val.value),
              originalValue: val.value,
              rounded: Math.round(val.value),
              twoDecimals: Math.round(val.value * 100) / 100,
            });
          }
        });
      }
    });

    return NextResponse.json({
      success: true,
      collection,
      documentsChecked: data.length,
      foundMetrics: analysis.length,
      samples: analysis.slice(0, 20),
      allTitles: data.length > 0 && data[0].values ?
        data[0].values.map((v: any) => v.title) : [],
    });
  } catch (error) {
    console.error('Error checking precision:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

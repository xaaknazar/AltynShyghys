import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { client } = await connectToDatabase();
    const db = client.db('scheduler-sync-pro');

    // Проверяем обе коллекции
    const collections = ['Extractor_TechData_Job', 'Data_extractor_cooking'];
    const results: any = {};

    for (const collName of collections) {
      const coll = db.collection(collName);

      // Получаем общее количество документов
      const totalCount = await coll.countDocuments();

      // Получаем последний документ по дате
      const latestDoc = await coll
        .find({})
        .sort({ datetime: -1 })
        .limit(1)
        .toArray();

      // Получаем документы за последние 7 дней
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentCount = await coll.countDocuments({
        datetime: { $gte: sevenDaysAgo }
      });

      // Получаем документы после 30 января 2026
      const jan30 = new Date('2026-01-30T00:00:00Z');
      const afterJan30Count = await coll.countDocuments({
        datetime: { $gte: jan30 }
      });

      // Получаем примеры документов после 30 января
      const afterJan30Samples = await coll
        .find({ datetime: { $gte: jan30 } })
        .sort({ datetime: -1 })
        .limit(3)
        .toArray();

      results[collName] = {
        totalCount,
        latestDocument: latestDoc[0] ? {
          datetime: latestDoc[0].datetime,
          valuesCount: latestDoc[0].values?.length || 0,
          sampleValues: latestDoc[0].values?.slice(0, 3) || [],
          fields: Object.keys(latestDoc[0])
        } : null,
        recentCount7Days: recentCount,
        afterJan30Count,
        afterJan30Samples: afterJan30Samples.map(doc => ({
          datetime: doc.datetime,
          valuesCount: doc.values?.length || 0,
          sampleValues: doc.values?.slice(0, 2) || []
        }))
      };
    }

    // Проверяем все коллекции в базе scheduler-sync-pro
    const allCollections = await db.listCollections().toArray();
    const collectionNames = allCollections.map(c => c.name);

    // Ищем похожие коллекции на Data_extractor
    const extractorCollections = collectionNames.filter(name =>
      name.toLowerCase().includes('extractor') ||
      name.toLowerCase().includes('cooking') ||
      name.toLowerCase().includes('jarovn') ||
      name.toLowerCase().includes('toster')
    );

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
      allCollectionsInDB: collectionNames,
      extractorRelatedCollections: extractorCollections
    });
  } catch (error) {
    console.error('Error checking tech data status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check tech data status' },
      { status: 500 }
    );
  }
}

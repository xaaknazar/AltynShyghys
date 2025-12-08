import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    
    // Получаем список всех коллекций
    const collections = await db.listCollections().toArray();
    
    console.log('Available collections:', collections.map(c => c.name));
    
    // Для каждой коллекции проверяем последнюю запись
    const collectionsInfo = await Promise.all(
      collections.map(async (col) => {
        const collection = db.collection(col.name);
        const count = await collection.countDocuments();
        
        // Пытаемся получить последнюю запись
        const latest = await collection
          .find({})
          .sort({ datetime: -1 })
          .limit(1)
          .toArray();
        
        return {
          name: col.name,
          totalRecords: count,
          latestRecord: latest.length > 0 ? {
            datetime: latest[0].datetime,
            hasSpeed: 'speed' in latest[0],
            hasValue: 'value' in latest[0],
          } : null,
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      database: 'SchedulerSyncPro',
      collections: collectionsInfo,
    });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
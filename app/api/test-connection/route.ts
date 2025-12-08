import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing MongoDB connection...');
    const { db } = await connectToDatabase();
    
    const collection = db.collection('Rvo_Production_Job');
    
    // Получаем последние 5 записей
    const latest = await collection
      .find({})
      .sort({ datetime: -1 })
      .limit(5)
      .toArray();
    
    console.log('Found records:', latest.length);
    
    // Получаем количество всех записей
    const totalCount = await collection.countDocuments();
    
    return NextResponse.json({
      success: true,
      message: 'Connected to MongoDB successfully',
      database: 'SchedulerSyncPro',
      collection: 'Rvo_Production_Job',
      totalRecords: totalCount,
      latestRecords: latest.map(doc => ({
        _id: doc._id.toString(),
        datetime: doc.datetime,
        value: doc.value,
        speed: doc.speed,
      })),
    });
  } catch (error: any) {
    console.error('MongoDB connection error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
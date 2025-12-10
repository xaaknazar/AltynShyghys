import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Получить логи смены
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shiftDate = searchParams.get('shift_date'); // YYYY-MM-DD
    const shiftType = searchParams.get('shift_type'); // 'day' or 'night'

    const client = await clientPromise;
    const db = client.db('ALtyn_Shyghys');
    const collection = db.collection('Shift_Logs');

    let query: any = {};

    if (shiftDate && shiftType) {
      query = { shift_date: shiftDate, shift_type: shiftType };
    } else if (shiftDate) {
      query = { shift_date: shiftDate };
    }

    const logs = await collection
      .find(query)
      .sort({ created_at: -1 })
      .limit(100)
      .toArray();

    const response = NextResponse.json({
      success: true,
      logs: logs.map((log) => ({
        id: log._id.toString(),
        shift_date: log.shift_date,
        shift_type: log.shift_type,
        event_time: log.event_time,
        event_type: log.event_type,
        workshop: log.workshop,
        description: log.description,
        actions_taken: log.actions_taken,
        speed_before: log.speed_before,
        speed_after: log.speed_after,
        master_name: log.master_name,
        created_at: log.created_at,
      })),
      count: logs.length,
    });

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('Error fetching shift logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch shift logs' },
      { status: 500 }
    );
  }
}

// Создать новый лог смены
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      shift_date,
      shift_type,
      event_time,
      event_type,
      workshop,
      description,
      actions_taken,
      speed_before,
      speed_after,
      master_name,
    } = body;

    // Валидация
    if (!shift_date || !shift_type || !event_time || !event_type || !description) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('ALtyn_Shyghys');
    const collection = db.collection('Shift_Logs');

    const newLog = {
      shift_date,
      shift_type,
      event_time: new Date(event_time),
      event_type,
      workshop: workshop || null,
      description,
      actions_taken: actions_taken || null,
      speed_before: speed_before || null,
      speed_after: speed_after || null,
      master_name: master_name || null,
      created_at: new Date(),
    };

    const result = await collection.insertOne(newLog);

    return NextResponse.json({
      success: true,
      id: result.insertedId.toString(),
      message: 'Shift log created successfully',
    });
  } catch (error) {
    console.error('Error creating shift log:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create shift log' },
      { status: 500 }
    );
  }
}

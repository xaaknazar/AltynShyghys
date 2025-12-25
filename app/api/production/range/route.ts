import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Получить данные производства за период
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const shiftType = searchParams.get('shift_type'); // 'all' | 'day' | 'night'

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'Missing start_date or end_date parameters' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const collection = db.collection('Shift_Logs');

    let query: any = {
      shift_date: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    // Фильтр по смене
    if (shiftType && shiftType !== 'all') {
      query.shift_type = shiftType;
    }

    const shiftLogs = await collection
      .find(query)
      .sort({ shift_date: 1, shift_type: 1 })
      .toArray();

    // Группируем по датам
    const grouped: { [key: string]: any } = {};

    shiftLogs.forEach((log) => {
      const date = log.shift_date;
      if (!grouped[date]) {
        grouped[date] = {
          date,
          dayShift: 0,
          nightShift: 0,
          total: 0,
        };
      }

      const production = log.production || 0;
      if (log.shift_type === 'day') {
        grouped[date].dayShift += production;
      } else {
        grouped[date].nightShift += production;
      }
      grouped[date].total += production;
    });

    const data = Object.values(grouped).sort((a: any, b: any) =>
      a.date.localeCompare(b.date)
    );

    const response = NextResponse.json({
      success: true,
      data,
      count: data.length,
    });

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('Error fetching production range data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch production range data' },
      { status: 500 }
    );
  }
}

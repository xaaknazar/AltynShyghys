import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { TIMEZONE_OFFSET } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Получить данные производства по месяцам за период
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startMonth = parseInt(searchParams.get('start_month') || '1');
    const startYear = parseInt(searchParams.get('start_year') || '2024');
    const endMonth = parseInt(searchParams.get('end_month') || String(new Date().getMonth() + 1));
    const endYear = parseInt(searchParams.get('end_year') || String(new Date().getFullYear()));

    // Формируем начальную и конечную дату периода
    const startDate = new Date(startYear, startMonth - 1, 1);
    const endDate = new Date(endYear, endMonth, 0); // Последний день месяца

    const { db } = await connectToDatabase();
    const collection = db.collection('Rvo_Production_Job_shift_report');

    // Расширяем диапазон для захвата всех нужных shift_report документов
    const startDateTime = new Date(startDate);
    startDateTime.setDate(startDateTime.getDate() - 1);
    const startUTC = new Date(startDateTime.getTime() - TIMEZONE_OFFSET * 60 * 60 * 1000);

    const endDateTime = new Date(endDate);
    endDateTime.setDate(endDateTime.getDate() + 3);
    const endUTC = new Date(endDateTime.getTime() - TIMEZONE_OFFSET * 60 * 60 * 1000);

    console.log('🔍 Fetching monthly shift_report data:', {
      startMonth,
      startYear,
      endMonth,
      endYear,
      startUTC: startUTC.toISOString(),
      endUTC: endUTC.toISOString(),
    });

    // Получаем все shift_report документы за период
    const shiftReports = await collection
      .find({
        datetime: {
          $gte: startUTC,
          $lt: endUTC,
        },
      })
      .sort({ datetime: 1 })
      .toArray();

    console.log(`✅ Found ${shiftReports.length} shift reports`);

    if (shiftReports.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        monthsCount: 0,
      });
    }

    // Группируем shift_report документы по производственным дням
    const productionDays = new Map<string, {
      dayShift: number;
      nightShift: number;
    }>();

    shiftReports.forEach((doc) => {
      const docDate = new Date(doc.datetime);
      const localTime = new Date(docDate.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);
      const hour = localTime.getUTCHours();
      const difference = doc.difference || 0;

      // Определяем к какому производственному дню относится документ
      let productionDate: Date;
      let isNightShift = false;

      if (hour >= 6 && hour <= 10) {
        isNightShift = true;
        productionDate = new Date(localTime);
        productionDate.setUTCDate(productionDate.getUTCDate() - 1);
      } else if (hour >= 18 && hour <= 22) {
        isNightShift = false;
        productionDate = new Date(localTime);
        productionDate.setUTCDate(productionDate.getUTCDate() - 1);
      } else {
        return;
      }

      const dateKey = productionDate.toISOString().split('T')[0];

      if (!productionDays.has(dateKey)) {
        productionDays.set(dateKey, {
          dayShift: 0,
          nightShift: 0,
        });
      }

      const dayData = productionDays.get(dateKey)!;

      if (isNightShift) {
        dayData.nightShift = difference;
      } else {
        dayData.dayShift = difference;
      }
    });

    // Группируем производственные дни по месяцам
    const monthlyData = new Map<string, {
      year: number;
      month: number;
      total: number;
      daysCount: number;
    }>();

    productionDays.forEach((data, dateKey) => {
      const dateObj = new Date(dateKey);
      const year = dateObj.getFullYear();
      const month = dateObj.getMonth() + 1;
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          year,
          month,
          total: 0,
          daysCount: 0,
        });
      }

      const monthData = monthlyData.get(monthKey)!;
      const dayTotal = data.dayShift + data.nightShift;

      if (dayTotal > 0) {
        monthData.total += dayTotal;
        monthData.daysCount++;
      }
    });

    // Преобразуем в массив и сортируем
    const monthNames = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];

    const result = Array.from(monthlyData.entries())
      .map(([key, data]) => ({
        month: `${monthNames[data.month - 1]} ${data.year}`,
        year: data.year,
        monthNumber: data.month,
        total: data.total,
        averageDaily: data.daysCount > 0 ? data.total / data.daysCount : 0,
        daysCount: data.daysCount,
      }))
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.monthNumber - b.monthNumber;
      });

    console.log('📊 Monthly production summary:', result);

    const response = NextResponse.json({
      success: true,
      data: result,
      period: {
        start: `${startMonth}/${startYear}`,
        end: `${endMonth}/${endYear}`,
      },
      monthsCount: result.length,
    });

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('Error fetching monthly production data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch monthly production data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

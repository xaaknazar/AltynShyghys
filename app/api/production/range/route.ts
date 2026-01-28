import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { TIMEZONE_OFFSET } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Получить данные производства за период из shift_report (как в Telegram боте)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date'); // YYYY-MM-DD
    const endDate = searchParams.get('end_date'); // YYYY-MM-DD
    const shiftType = searchParams.get('shift_type'); // 'all' | 'day' | 'night'

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'Missing start_date or end_date parameters' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const collection = db.collection('Rvo_Production_Job_shift_report');

    // Получаем shift_report документы за период
    // Производственный день "01.01" (01.01 08:00 → 02.01 08:00) включает:
    //   - Дневная смена: документ около 01.01 20:00:30
    //   - Ночная смена: документ около 02.01 08:00:30
    // Нужно расширить диапазон чтобы захватить все нужные документы

    // Начинаем с предыдущего дня от startDate (чтобы захватить ночную смену первого дня)
    const startDateTime = new Date(`${startDate}T00:00:00`);
    startDateTime.setDate(startDateTime.getDate() - 1); // За день до начала
    const startUTC = new Date(startDateTime.getTime() - TIMEZONE_OFFSET * 60 * 60 * 1000);

    // Заканчиваем на 2 дня после endDate (чтобы захватить ночную смену последнего дня)
    const endDateTime = new Date(endDate);
    endDateTime.setDate(endDateTime.getDate() + 3); // +3 дня для гарантии
    const endDateTimeStr = endDateTime.toISOString().split('T')[0];
    const endDateTimeFull = new Date(`${endDateTimeStr}T00:00:00`);
    const endUTC = new Date(endDateTimeFull.getTime() - TIMEZONE_OFFSET * 60 * 60 * 1000);

    console.log('🔍 Fetching shift_report data:', {
      startDate,
      endDate,
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
        count: 0,
      });
    }

    // Группируем shift_report документы по производственным дням
    // Производственный день (08:00-08:00) определяется по времени окончания смены:
    //   - Дневная смена (заканчивается ~20:00 на день X) → относится к дню X
    //   - Ночная смена (заканчивается ~08:00 на день X+1) → относится к дню X

    const productionDays = new Map<string, {
      dayShift: number;
      nightShift: number;
      dayShiftDoc?: any;
      nightShiftDoc?: any;
    }>();

    shiftReports.forEach((doc) => {
      const docDate = new Date(doc.datetime);
      const localTime = new Date(docDate.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);
      const hour = localTime.getUTCHours();
      const difference = doc.difference || 0;

      // Определяем к какому производственному дню относится документ
      // Производственные сутки: 08:00 - 08:00
      let productionDate: Date;
      let isNightShift = false;

      // Ночная смена (заканчивается около 08:00) → относится к предыдущему дню
      // Пример: shift report 02.01 08:00 → производственный день 01.01 (01.01 08:00 - 02.01 08:00)
      if (hour >= 6 && hour <= 10) {
        isNightShift = true;
        productionDate = new Date(localTime);
        productionDate.setUTCDate(productionDate.getUTCDate() - 1); // Вычитаем день

        // Детальное логирование для проверки
        const prodDay = productionDate.toISOString().split('T')[0];
        if (prodDay === '2025-07-09' && difference > 10000) {
          console.log('⚠️  АНОМАЛИЯ ОБНАРУЖЕНА:');
          console.log(`   Документ datetime: ${doc.datetime.toISOString()}`);
          console.log(`   Локальное время: ${localTime.toISOString()}`);
          console.log(`   Час: ${hour}`);
          console.log(`   Производственный день: ${prodDay}`);
          console.log(`   difference: ${difference.toFixed(2)} т`);
          console.log(`   value: ${doc.value?.toFixed(2) || 'N/A'} т`);
          console.log(`   shift_type: ${doc.shift_type || 'N/A'}`);
        }
      }
      // Дневная смена (заканчивается около 20:00) → относится к текущему дню
      // Пример: shift report 01.01 20:00 → производственный день 01.01 (01.01 08:00 - 02.01 08:00)
      else if (hour >= 18 && hour <= 22) {
        isNightShift = false;
        productionDate = new Date(localTime);
        // НЕ вычитаем день - дневная смена относится к производственному дню, который начался сегодня в 08:00
      } else {
        // Документ вне стандартного времени смены - пропускаем
        console.warn(`⚠️ Документ вне времени смены: ${doc.datetime.toISOString()} (час: ${hour})`);
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
        dayData.nightShiftDoc = doc;
      } else {
        dayData.dayShift = difference;
        dayData.dayShiftDoc = doc;
      }

      console.log(`📊 ${dateKey} (${isNightShift ? 'Ночная' : 'Дневная'}): ${difference.toFixed(1)} тонн (час: ${hour})`);
    });

    // Преобразуем в массив и фильтруем по диапазону дат
    const result: Array<{
      date: string;
      dayShift: number;
      nightShift: number;
      total: number;
    }> = [];

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    productionDays.forEach((data, dateKey) => {
      const dateObj = new Date(dateKey);

      // Проверяем что дата в запрошенном диапазоне
      if (dateObj >= startDateObj && dateObj <= endDateObj) {
        result.push({
          date: dateKey,
          dayShift: data.dayShift,
          nightShift: data.nightShift,
          total: data.dayShift + data.nightShift,
        });
      }
    });

    // Сортируем по дате
    result.sort((a, b) => a.date.localeCompare(b.date));

    // Фильтруем по типу смены если указан
    let filteredResult = result;
    if (shiftType === 'day') {
      filteredResult = result.map(r => ({ ...r, nightShift: 0, total: r.dayShift }));
    } else if (shiftType === 'night') {
      filteredResult = result.map(r => ({ ...r, dayShift: 0, total: r.nightShift }));
    }

    console.log('📈 Production summary:', filteredResult);

    const response = NextResponse.json({
      success: true,
      data: filteredResult,
      count: filteredResult.length,
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

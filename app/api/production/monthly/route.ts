import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getProductionMonthBounds, TIMEZONE_OFFSET, DailyGroupedData, ProductionData, DailyStats, TARGETS } from '@/lib/utils';

// Отключаем кеширование для получения свежих данных
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const shiftReportCollection = db.collection('Rvo_Production_Job_shift_report');
    const rawDataCollection = db.collection('Rvo_Production_Job');

    const { start, end } = getProductionMonthBounds();

    console.log('🔍 Fetching monthly data (shift_report):', {
      start: start.toISOString(),
      end: end.toISOString(),
    });

    // Получаем shift_report документы за месяц для правильного расчета production
    const shiftReports = await shiftReportCollection
      .find({
        datetime: {
          $gte: start,
          $lt: end,
        },
      })
      .sort({ datetime: 1 })
      .toArray();

    console.log(`✅ Found ${shiftReports.length} shift reports`);

    // Группируем shift_report документы по производственным дням
    const productionDaysMap = new Map<string, {
      dayShift: number;
      nightShift: number;
      dayShiftSpeed: number;
      nightShiftSpeed: number;
    }>();

    shiftReports.forEach((doc) => {
      const docDate = new Date(doc.datetime);
      const localTime = new Date(docDate.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);
      const hour = localTime.getUTCHours();
      const difference = doc.difference || 0;
      const speed = doc.speed || 0;

      // Определяем к какому производственному дню относится документ
      let productionDate: Date;
      let isNightShift = false;

      // Ночная смена (заканчивается около 08:00) → относится к предыдущему дню
      if (hour >= 6 && hour <= 10) {
        isNightShift = true;
        productionDate = new Date(localTime);
        productionDate.setUTCDate(productionDate.getUTCDate() - 1);
      }
      // Дневная смена (заканчивается около 20:00) → относится к текущему дню
      else if (hour >= 18 && hour <= 22) {
        isNightShift = false;
        productionDate = new Date(localTime);
      } else {
        console.warn(`⚠️ Документ вне времени смены: ${doc.datetime.toISOString()} (час: ${hour})`);
        return;
      }

      const dateKey = productionDate.toISOString().split('T')[0];

      if (!productionDaysMap.has(dateKey)) {
        productionDaysMap.set(dateKey, {
          dayShift: 0,
          nightShift: 0,
          dayShiftSpeed: 0,
          nightShiftSpeed: 0,
        });
      }

      const dayData = productionDaysMap.get(dateKey)!;

      if (isNightShift) {
        dayData.nightShift = difference;
        dayData.nightShiftSpeed = speed;
      } else {
        dayData.dayShift = difference;
        dayData.dayShiftSpeed = speed;
      }
    });

    // Получаем сырые данные для графиков
    const rawData = await rawDataCollection
      .find({
        datetime: {
          $gte: start,
          $lt: end,
        },
      })
      .sort({ datetime: 1 })
      .toArray();

    console.log(`✅ Found ${rawData.length} raw data records`);

    const formattedRawData: ProductionData[] = rawData.map((doc) => ({
      _id: doc._id.toString(),
      datetime: doc.datetime.toISOString(),
      value: doc.value,
      difference: doc.difference || 0,
      speed: doc.speed,
      metric_unit: doc.metric_unit || 'тонна',
    }));

    // Группируем сырые данные по производственным дням для графиков
    const rawDataByDay = new Map<string, ProductionData[]>();

    formattedRawData.forEach((item) => {
      const itemDate = new Date(item.datetime);
      const localTime = new Date(itemDate.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);
      const localHour = localTime.getUTCHours();
      const localDate = new Date(localTime);

      // Производственные сутки начинаются в 08:00
      if (localHour < 8) {
        localDate.setUTCDate(localDate.getUTCDate() - 1);
      }

      const dateKey = localDate.toISOString().split('T')[0];

      if (!rawDataByDay.has(dateKey)) {
        rawDataByDay.set(dateKey, []);
      }
      rawDataByDay.get(dateKey)!.push(item);
    });

    // Создаем DailyGroupedData из shift_report данных и сырых данных
    const dailyGrouped: DailyGroupedData[] = [];

    productionDaysMap.forEach((shiftData, dateKey) => {
      const totalProduction = shiftData.dayShift + shiftData.nightShift;
      const averageSpeed = (shiftData.dayShiftSpeed + shiftData.nightShiftSpeed) / 2;

      // Берем сырые данные для этого дня (для графиков)
      const dayRawData = rawDataByDay.get(dateKey) || [];

      // Текущая скорость - последняя запись дня
      const currentSpeed = dayRawData.length > 0
        ? dayRawData[dayRawData.length - 1].speed
        : averageSpeed;

      const progress = (totalProduction / TARGETS.daily) * 100;

      const stats: DailyStats = {
        totalProduction,
        averageSpeed,
        currentSpeed,
        progress,
        status: progress >= 100 ? 'success' : progress >= 80 ? 'warning' : 'danger',
      };

      dailyGrouped.push({
        date: dateKey,
        data: dayRawData,
        stats,
      });
    });

    // Сортируем по дате
    dailyGrouped.sort((a, b) => a.date.localeCompare(b.date));

    console.log(`📊 Created ${dailyGrouped.length} daily groups from shift reports`);

    const response = NextResponse.json({
      success: true,
      data: formattedRawData,
      dailyGrouped: dailyGrouped,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      count: formattedRawData.length,
      daysCount: dailyGrouped.length,
    });

    // Отключаем кеширование на клиенте
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error: any) {
    console.error('❌ Error fetching monthly data:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

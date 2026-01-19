import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { TIMEZONE_OFFSET } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const requestedDate = searchParams.get('date'); // YYYY-MM-DD (опционально)

    const { db } = await connectToDatabase();
    const shiftReportCollection = db.collection('Rvo_Production_Job_shift_report');

    let targetDate: string;

    if (requestedDate) {
      // Если дата указана явно - используем её
      targetDate = requestedDate;
    } else {
      // Определяем последние ЗАВЕРШЕННЫЕ производственные сутки
      const now = new Date();
      const localNow = new Date(now.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);
      const localHour = localNow.getUTCHours();

      // Последние завершенные сутки (так как сутки заканчиваются в 20:00)
      const lastCompletedDay = new Date(localNow);
      if (localHour >= 20) {
        // Если сейчас после 20:00, то вчерашние сутки завершены
        // (они начались вчера в 20:00 и закончились сегодня в 20:00)
        lastCompletedDay.setUTCDate(lastCompletedDay.getUTCDate() - 1);
      } else {
        // Если до 20:00, то позавчерашние сутки последние завершенные
        // (текущие сутки начались вчера в 20:00 и еще не завершились)
        lastCompletedDay.setUTCDate(lastCompletedDay.getUTCDate() - 2);
      }

      targetDate = lastCompletedDay.toISOString().split('T')[0];
    }

    console.log('🔍 Fetching production data for:', targetDate);

    // Получаем shift_report документы для этого дня
    // Производственный день "08.01" включает:
    //   - Дневная смена: документ около 08.01 20:00:30
    //   - Ночная смена: документ около 09.01 08:00:30

    const startDateTime = new Date(`${targetDate}T00:00:00`);
    startDateTime.setDate(startDateTime.getDate() - 1); // За день до
    const startUTC = new Date(startDateTime.getTime() - TIMEZONE_OFFSET * 60 * 60 * 1000);

    const endDateTime = new Date(targetDate);
    endDateTime.setDate(endDateTime.getDate() + 2); // +2 дня после
    const endDateTimeStr = endDateTime.toISOString().split('T')[0];
    const endDateTimeFull = new Date(`${endDateTimeStr}T00:00:00`);
    const endUTC = new Date(endDateTimeFull.getTime() - TIMEZONE_OFFSET * 60 * 60 * 1000);

    const shiftReports = await shiftReportCollection
      .find({
        datetime: {
          $gte: startUTC,
          $lt: endUTC,
        },
      })
      .sort({ datetime: 1 })
      .toArray();

    console.log(`✅ Found ${shiftReports.length} shift reports`);

    let dayShift = 0;
    let nightShift = 0;

    // Группируем по производственным дням
    shiftReports.forEach((doc) => {
      const docDate = new Date(doc.datetime);
      const localTime = new Date(docDate.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);
      const hour = localTime.getUTCHours();
      const difference = doc.difference || 0;

      let productionDate: Date;
      let isNightShift = false;

      // Производственные сутки: 20:00 - 20:00
      // Ночная смена (заканчивается около 08:00) → относится к предыдущему дню
      if (hour >= 6 && hour <= 10) {
        isNightShift = true;
        productionDate = new Date(localTime);
        productionDate.setUTCDate(productionDate.getUTCDate() - 1);
      }
      // Дневная смена (заканчивается около 20:00) → также относится к предыдущему дню
      // так как сутки начинаются в 20:00 предыдущего дня
      else if (hour >= 18 && hour <= 22) {
        isNightShift = false;
        productionDate = new Date(localTime);
        productionDate.setUTCDate(productionDate.getUTCDate() - 1);
      } else {
        return;
      }

      const dateKey = productionDate.toISOString().split('T')[0];

      if (dateKey === targetDate) {
        if (isNightShift) {
          nightShift = difference;
        } else {
          dayShift = difference;
        }
      }
    });

    const totalProduction = dayShift + nightShift;
    const dailyTarget = 1200; // тонн
    const planPercentage = (totalProduction / dailyTarget) * 100;

    console.log(`📊 Production for ${targetDate}:`, {
      dayShift,
      nightShift,
      total: totalProduction,
      planPercentage: planPercentage.toFixed(1)
    });

    return NextResponse.json({
      success: true,
      date: targetDate,
      dayShift,
      nightShift,
      totalProduction,
      planPercentage,
      dailyTarget,
    });
  } catch (error: any) {
    console.error('❌ Error fetching current data:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

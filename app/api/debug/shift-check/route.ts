import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { TIMEZONE_OFFSET } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Временный эндпоинт для проверки данных смены
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const checkDate = searchParams.get('date') || '2025-07-09'; // YYYY-MM-DD

    const { db } = await connectToDatabase();
    const shiftReportCollection = db.collection('Rvo_Production_Job_shift_report');
    const productionCollection = db.collection('Rvo_Production_Job');

    // Получаем документы shift_report около этой даты
    const startDate = new Date(`${checkDate}T00:00:00`);
    startDate.setDate(startDate.getDate() - 1);
    const startUTC = new Date(startDate.getTime() - TIMEZONE_OFFSET * 60 * 60 * 1000);

    const endDate = new Date(`${checkDate}T00:00:00`);
    endDate.setDate(endDate.getDate() + 2);
    const endUTC = new Date(endDate.getTime() - TIMEZONE_OFFSET * 60 * 60 * 1000);

    const shiftReports = await shiftReportCollection
      .find({
        datetime: {
          $gte: startUTC,
          $lt: endUTC,
        },
      })
      .sort({ datetime: 1 })
      .toArray();

    // Обрабатываем все shift_report документы
    const processedReports = shiftReports.map((doc) => {
      const docDate = new Date(doc.datetime);
      const localTime = new Date(docDate.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);
      const hour = localTime.getUTCHours();

      let productionDate = new Date(localTime);
      let isNightShift = false;

      if (hour >= 6 && hour <= 10) {
        isNightShift = true;
        productionDate.setUTCDate(productionDate.getUTCDate() - 1);
      } else if (hour >= 18 && hour <= 22) {
        isNightShift = false;
        productionDate.setUTCDate(productionDate.getUTCDate() - 1);
      }

      return {
        datetime: doc.datetime.toISOString(),
        localTime: localTime.toISOString(),
        hour,
        productionDay: productionDate.toISOString().split('T')[0],
        shiftType: isNightShift ? 'НОЧНАЯ' : 'ДНЕВНАЯ',
        difference: doc.difference,
        value: doc.value,
        shift_type_db: doc.shift_type,
      };
    });

    // Ищем ночную смену для указанной даты
    const targetNightShift = processedReports.find(
      (r) => r.productionDay === checkDate && r.shiftType === 'НОЧНАЯ'
    );

    // Находим предыдущую смену (дневную того же производственного дня)
    const previousShift = processedReports.find(
      (r) => r.productionDay === checkDate && r.shiftType === 'ДНЕВНАЯ'
    );

    // Если нашли ночную смену, всегда проверяем сырые данные
    let rawDataAnalysis = null;
    if (targetNightShift) {
      // Ночная смена начинается в 20:00 предыдущего дня и заканчивается в 08:00 текущего дня
      const shiftStartLocal = new Date(`${checkDate}T20:00:00`);
      shiftStartLocal.setDate(shiftStartLocal.getDate() - 1); // Предыдущий день
      const shiftEndLocal = new Date(`${checkDate}T08:00:00`);

      const shiftStartUTC = new Date(shiftStartLocal.getTime() - TIMEZONE_OFFSET * 60 * 60 * 1000);
      const shiftEndUTC = new Date(shiftEndLocal.getTime() - TIMEZONE_OFFSET * 60 * 60 * 1000);

      const rawData = await productionCollection
        .find({
          datetime: {
            $gte: shiftStartUTC,
            $lte: shiftEndUTC,
          },
        })
        .sort({ datetime: 1 })
        .toArray();

      if (rawData.length > 0) {
        const first = rawData[0];
        const last = rawData[rawData.length - 1];
        const calculatedDiff = last.value - first.value;

        rawDataAnalysis = {
          recordsCount: rawData.length,
          firstRecord: {
            datetime: first.datetime.toISOString(),
            localTime: new Date(first.datetime.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000).toISOString(),
            value: first.value,
          },
          lastRecord: {
            datetime: last.datetime.toISOString(),
            localTime: new Date(last.datetime.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000).toISOString(),
            value: last.value,
          },
          calculatedDifference: calculatedDiff,
          shiftReportDifference: targetNightShift.difference,
          discrepancy: Math.abs(calculatedDiff - targetNightShift.difference),
        };
      }
    }

    // Диагностика проблемы
    let diagnosis = 'Проблем не обнаружено';
    let recommendation = null;

    if (targetNightShift && targetNightShift.difference > 10000) {
      diagnosis = `АНОМАЛИЯ: difference = ${targetNightShift.difference.toFixed(2)} т (ожидалось ~400 т)`;

      if (targetNightShift.difference === targetNightShift.value) {
        recommendation = {
          issue: 'В shift_report записано абсолютное значение счетчика (value) вместо разницы за смену (difference)',
          context: previousShift
            ? `Предыдущая смена (дневная) имела value=${previousShift.value}. ${
                previousShift.value === 0
                  ? '⚠️ Счетчик был сброшен в 0!'
                  : ''
              }`
            : 'Предыдущая смена не найдена',
          solution: 'Необходимо пересчитать difference как: value_конца_смены - value_начала_смены',
          possibleFix: rawDataAnalysis
            ? `Правильное значение difference должно быть ${rawDataAnalysis.calculatedDifference.toFixed(2)} т`
            : 'Для точного расчета нужны сырые данные из Rvo_Production_Job за период смены. Возможно, счетчик был сброшен.',
        };
      }
    }

    return NextResponse.json({
      success: true,
      checkDate,
      allShiftReports: processedReports,
      previousShift,
      targetNightShift,
      rawDataAnalysis,
      problem: diagnosis,
      recommendation,
    });
  } catch (error) {
    console.error('Error checking shift data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check shift data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

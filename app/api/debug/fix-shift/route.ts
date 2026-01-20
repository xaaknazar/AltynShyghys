import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { TIMEZONE_OFFSET } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// API для исправления данных смены при сбросе счетчика
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, dryRun = true } = body; // date: YYYY-MM-DD

    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Не указана дата (параметр date)' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const shiftReportCollection = db.collection('Rvo_Production_Job_shift_report');
    const productionCollection = db.collection('Rvo_Production_Job');

    // Ищем документ shift_report для ночной смены указанной даты
    const startDate = new Date(`${date}T00:00:00`);
    startDate.setDate(startDate.getDate() - 1);
    const startUTC = new Date(startDate.getTime() - TIMEZONE_OFFSET * 60 * 60 * 1000);

    const endDate = new Date(`${date}T00:00:00`);
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

    // Находим ночную смену для указанной даты
    let targetShift = null;
    for (const doc of shiftReports) {
      const docDate = new Date(doc.datetime);
      const localTime = new Date(docDate.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);
      const hour = localTime.getUTCHours();

      if (hour >= 6 && hour <= 10) {
        const productionDate = new Date(localTime);
        productionDate.setUTCDate(productionDate.getUTCDate() - 1);
        const prodDay = productionDate.toISOString().split('T')[0];

        if (prodDay === date) {
          targetShift = doc;
          break;
        }
      }
    }

    if (!targetShift) {
      return NextResponse.json({
        success: false,
        error: `Ночная смена для даты ${date} не найдена в shift_report`,
      });
    }

    // Проверяем, есть ли проблема
    if (targetShift.difference < 10000) {
      return NextResponse.json({
        success: true,
        message: `Смена ${date} не требует исправления. difference = ${targetShift.difference.toFixed(2)} т`,
        needsFix: false,
      });
    }

    // Получаем сырые данные производства за смену
    const shiftStartLocal = new Date(`${date}T20:00:00`);
    shiftStartLocal.setDate(shiftStartLocal.getDate() - 1); // Предыдущий день
    const shiftEndLocal = new Date(`${date}T08:00:00`);

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

    if (rawData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Не найдены сырые данные производства за период смены',
        recommendation: 'Возможно данные были очищены. Если был сброс счетчика в 0, то difference можно взять равным финальному value.',
      });
    }

    const first = rawData[0];
    const last = rawData[rawData.length - 1];

    // Вычисляем правильное значение difference
    let correctDifference = 0;

    // Если счетчик был сброшен (начальное значение близко к 0)
    if (first.value < 10) {
      // После сброса difference = конечное значение
      correctDifference = last.value;
    } else {
      // Нормальный случай: разница между концом и началом
      correctDifference = last.value - first.value;
    }

    const analysis = {
      shiftId: targetShift._id.toString(),
      date,
      currentData: {
        difference: targetShift.difference,
        value: targetShift.value,
        datetime: targetShift.datetime.toISOString(),
      },
      rawDataAnalysis: {
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
      },
      correction: {
        oldDifference: targetShift.difference,
        newDifference: correctDifference,
        wasCounterReset: first.value < 10,
      },
    };

    // Применяем исправление, если не dryRun
    if (!dryRun) {
      const updateResult = await shiftReportCollection.updateOne(
        { _id: targetShift._id },
        {
          $set: {
            difference: correctDifference,
            corrected: true,
            corrected_at: new Date(),
            correction_reason: first.value < 10 ? 'counter_reset' : 'manual_fix',
          },
        }
      );

      return NextResponse.json({
        success: true,
        message: `Данные смены ${date} успешно исправлены!`,
        applied: true,
        analysis,
        updateResult: {
          matchedCount: updateResult.matchedCount,
          modifiedCount: updateResult.modifiedCount,
        },
      });
    } else {
      return NextResponse.json({
        success: true,
        message: 'Режим предпросмотра (dryRun=true). Для применения отправьте запрос с dryRun=false',
        applied: false,
        analysis,
      });
    }
  } catch (error) {
    console.error('Error fixing shift data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fix shift data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// Функция для получения начала производственного дня
function getProductionDayStart(date: Date): Date {
  const result = new Date(date);
  result.setHours(20, 0, 0, 0);

  if (date.getHours() < 20) {
    result.setDate(result.getDate() - 1);
  }

  return result;
}

// Функция для получения конца производственного дня
function getProductionDayEnd(date: Date): Date {
  const start = getProductionDayStart(date);
  const end = new Date(start);
  end.setHours(end.getHours() + 24);
  return end;
}

// Функция для получения всех производственных дней в месяце
function getProductionDaysInMonth(year: number, month: number): string[] {
  const days: string[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const prodDay = getProductionDayStart(date);
    const dateStr = prodDay.toISOString().split('T')[0];

    if (!days.includes(dateStr)) {
      days.push(dateStr);
    }
  }

  return days.sort();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startMonth = parseInt(searchParams.get('start_month') || '1');
    const startYear = parseInt(searchParams.get('start_year') || '2024');
    const endMonth = parseInt(searchParams.get('end_month') || String(new Date().getMonth() + 1));
    const endYear = parseInt(searchParams.get('end_year') || String(new Date().getFullYear()));

    const client = await clientPromise;
    const database = client.db('Factory');
    const collection = database.collection('Maslozavod_Proizvodstvo');

    const monthlyData: any[] = [];

    // Перебираем все месяцы в указанном диапазоне
    let currentYear = startYear;
    let currentMonth = startMonth;

    while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
      // Получаем все производственные дни этого месяца
      const productionDays = getProductionDaysInMonth(currentYear, currentMonth);

      if (productionDays.length > 0) {
        // Для каждого дня получаем начало и конец производственных суток
        let monthTotalProduction = 0;
        let daysCount = 0;

        for (const dayDate of productionDays) {
          const date = new Date(dayDate);
          const dayStart = getProductionDayStart(date);
          const dayEnd = getProductionDayEnd(date);

          // Получаем первую и последнюю записи дня
          const [firstRecord, lastRecord] = await Promise.all([
            collection
              .find({
                datetime: {
                  $gte: dayStart.toISOString(),
                  $lt: dayEnd.toISOString(),
                },
              })
              .sort({ datetime: 1 })
              .limit(1)
              .toArray(),
            collection
              .find({
                datetime: {
                  $gte: dayStart.toISOString(),
                  $lt: dayEnd.toISOString(),
                },
              })
              .sort({ datetime: -1 })
              .limit(1)
              .toArray(),
          ]);

          if (firstRecord.length > 0 && lastRecord.length > 0) {
            const dayProduction = lastRecord[0].value - firstRecord[0].value;
            if (dayProduction > 0) {
              monthTotalProduction += dayProduction;
              daysCount++;
            }
          }
        }

        if (daysCount > 0) {
          const monthNames = [
            'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
            'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
          ];

          monthlyData.push({
            month: `${monthNames[currentMonth - 1]} ${currentYear}`,
            year: currentYear,
            monthNumber: currentMonth,
            total: monthTotalProduction,
            averageDaily: monthTotalProduction / daysCount,
            daysCount: daysCount,
          });
        }
      }

      // Переходим к следующему месяцу
      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
    }

    return NextResponse.json({
      success: true,
      data: monthlyData,
      period: {
        start: `${startMonth}/${startYear}`,
        end: `${endMonth}/${endYear}`,
      },
      monthsCount: monthlyData.length,
    });
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

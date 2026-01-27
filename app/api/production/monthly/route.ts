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

    const localStart = new Date(start.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);
    const localEnd = new Date(end.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);

    console.log('\n\n🚀 ========== ЗАПРОС МЕСЯЧНЫХ ДАННЫХ ==========');
    console.log('🔍 Период загрузки данных:');
    console.log(`   UTC: ${start.toISOString()} → ${end.toISOString()}`);
    console.log(`   Местное: ${localStart.toISOString()} → ${localEnd.toISOString()}`);
    console.log('===============================================\n');

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

    console.log('\n🔍 ========== ОБРАБОТКА SHIFT REPORTS ==========');
    shiftReports.forEach((doc, index) => {
      const docDate = new Date(doc.datetime);
      const localTime = new Date(docDate.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);
      const hour = localTime.getUTCHours();
      const difference = doc.difference || 0;
      const speed = doc.speed || 0;

      // Определяем к какому производственному дню относится документ
      // Производственные сутки: 20:00 - 20:00
      // Shift report приходит В КОНЦЕ смены
      let productionDate: Date;
      let isNightShift = false;

      // Ночная смена заканчивается утром (около 08:00)
      // Пример: shift report 01.01 08:00 → производственные сутки 01 января
      if (hour >= 6 && hour <= 10) {
        isNightShift = true;
        productionDate = new Date(localTime);
        // НЕ вычитаем день - shift report в конце смены относится к ЭТОМУ производственному дню
      }
      // Дневная смена заканчивается вечером (около 20:00)
      // Пример: shift report 01.01 20:00 → производственные сутки 01 января
      else if (hour >= 18 && hour <= 22) {
        isNightShift = false;
        productionDate = new Date(localTime);
        // НЕ вычитаем день - shift report в конце смены относится к ЭТОМУ производственному дню
      } else {
        console.warn(`⚠️ Документ вне времени смены: ${doc.datetime.toISOString()} (час: ${hour})`);
        return;
      }

      const dateKey = productionDate.toISOString().split('T')[0];

      // ЛОГИРОВАНИЕ КАЖДОГО SHIFT REPORT
      console.log(`\n📄 Shift Report #${index + 1}:`);
      console.log(`   UTC время: ${doc.datetime.toISOString()}`);
      console.log(`   Местное время: ${localTime.toISOString()} (час: ${hour})`);
      console.log(`   Смена: ${isNightShift ? 'НОЧНАЯ' : 'ДНЕВНАЯ'}`);
      console.log(`   Производство: ${difference.toFixed(1)}т, Скорость: ${speed.toFixed(1)}т/ч`);
      console.log(`   ➡️  Группируется как: ${dateKey}`);

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

      // ВАЖНО: Производственный день называется по дню ОКОНЧАНИЯ суток
      // Пример: сутки 26 января = 25.01 20:00 → 26.01 20:00
      if (localHour >= 20) {
        // Если 20:00 или позже, данные относятся к ЗАВТРАШНИМ суткам
        localDate.setUTCDate(localDate.getUTCDate() + 1);
      }
      // Если час < 20, оставляем текущую дату (сутки завершатся сегодня)

      const dateKey = localDate.toISOString().split('T')[0];

      if (!rawDataByDay.has(dateKey)) {
        rawDataByDay.set(dateKey, []);
      }
      rawDataByDay.get(dateKey)!.push(item);
    });

    // Создаем DailyGroupedData из shift_report данных и сырых данных
    let dailyGrouped: DailyGroupedData[] = [];

    console.log('\n\n📊 ========== СОЗДАНИЕ ПРОИЗВОДСТВЕННЫХ ДНЕЙ ==========');
    productionDaysMap.forEach((shiftData, dateKey) => {
      const totalProduction = shiftData.dayShift + shiftData.nightShift;

      // Берем сырые данные для этого дня (для графиков)
      const dayRawData = rawDataByDay.get(dateKey) || [];

      // Рассчитываем среднюю скорость на основе фактического времени работы
      let averageSpeed = 0;
      if (dayRawData.length > 0) {
        const sortedData = [...dayRawData].sort(
          (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
        );
        const firstTime = new Date(sortedData[0].datetime).getTime();
        const lastTime = new Date(sortedData[sortedData.length - 1].datetime).getTime();
        const hoursElapsed = (lastTime - firstTime) / (1000 * 60 * 60);

        // Средняя скорость = производство / фактическое время работы
        averageSpeed = hoursElapsed > 0 ? totalProduction / hoursElapsed : totalProduction / 24;
      } else {
        // Если нет сырых данных, используем 24 часа как fallback
        averageSpeed = totalProduction / 24;
      }

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
        status: progress >= 100 ? 'normal' : progress >= 80 ? 'warning' : 'danger',
      };

      dailyGrouped.push({
        date: dateKey,
        data: dayRawData,
        stats,
      });

      // ЛОГИРОВАНИЕ СОЗДАННОГО ДНЯ
      console.log(`\n📅 Производственный день: ${dateKey}`);
      console.log(`   Ночная смена: ${shiftData.nightShift.toFixed(1)}т (${shiftData.nightShiftSpeed.toFixed(1)}т/ч)`);
      console.log(`   Дневная смена: ${shiftData.dayShift.toFixed(1)}т (${shiftData.dayShiftSpeed.toFixed(1)}т/ч)`);
      console.log(`   Итого производство: ${totalProduction.toFixed(1)}т`);
      console.log(`   Средняя скорость: ${averageSpeed.toFixed(1)}т/ч`);
      console.log(`   Raw данных: ${dayRawData.length} записей`);
    });

    // Сортируем по дате
    dailyGrouped.sort((a, b) => a.date.localeCompare(b.date));

    console.log(`📊 Created ${dailyGrouped.length} daily groups from shift reports`);

    // Фильтруем только дни текущего месяца (исключаем декабрьские дни из январской таблицы)
    const filterNow = new Date();
    const filterLocalNow = new Date(filterNow.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);
    const currentMonth = filterLocalNow.getUTCMonth();
    const currentYear = filterLocalNow.getUTCFullYear();

    console.log('\n🔍 ========== ФИЛЬТРАЦИЯ ПО МЕСЯЦУ ==========');
    console.log(`   Текущий месяц: ${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`);
    console.log(`   До фильтрации: ${dailyGrouped.length} дней`);

    dailyGrouped = dailyGrouped.filter(day => {
      const [year, month] = day.date.split('-').map(Number);
      const belongsToCurrentMonth = year === currentYear && month - 1 === currentMonth;
      if (!belongsToCurrentMonth) {
        console.log(`   ❌ Исключен: ${day.date} (не относится к текущему месяцу)`);
      }
      return belongsToCurrentMonth;
    });

    console.log(`   После фильтрации: ${dailyGrouped.length} дней`);
    console.log('=============================================\n');

    // Добавляем ТЕКУЩИЕ производственные сутки из сырых данных (если их нет в shift_report)
    const now = new Date();
    const localNow = new Date(now.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);
    const localHour = localNow.getUTCHours();

    // Определяем дату текущих производственных суток
    // ВАЖНО: Производственный день называется по дню ОКОНЧАНИЯ суток (не начала!)
    // Пример: сутки 26 января = 25.01 20:00 → 26.01 20:00
    const currentProductionDate = new Date(localNow);
    if (localHour >= 20) {
      // Если 20:00 или позже, сутки только начались, завершатся завтра
      currentProductionDate.setUTCDate(currentProductionDate.getUTCDate() + 1);
    }
    // Если час < 20, оставляем сегодняшнюю дату (сутки завершатся сегодня в 20:00)
    const currentDateKey = currentProductionDate.toISOString().split('T')[0];

    console.log('\n\n⚡ ========== ОБРАБОТКА ТЕКУЩЕГО ДНЯ ==========');
    console.log(`   Местное время СЕЙЧАС: ${localNow.toISOString()} (час: ${localHour})`);
    console.log(`   Текущий производственный день: ${currentDateKey}`);
    if (localHour >= 20) {
      console.log(`   ℹ️  Час >= 20, сутки только начались, завершатся завтра в 20:00`);
    } else {
      console.log(`   ℹ️  Час < 20, сутки идут, начались вчера в 20:00, завершатся сегодня в 20:00`);
    }

    // Проверяем есть ли текущие сутки в shift_report данных
    const currentDayIndex = dailyGrouped.findIndex(d => d.date === currentDateKey);
    console.log(`   Индекс в dailyGrouped: ${currentDayIndex} (${currentDayIndex !== -1 ? 'УЖЕ ЕСТЬ' : 'НЕТ'})`);

    // Для текущего дня используем real-time данные (они содержат ВСЕ данные за сутки)
    if (rawDataByDay.has(currentDateKey)) {
      console.log(`   ✅ Есть raw данные для ${currentDateKey}`);

      const currentDayRawData = rawDataByDay.get(currentDateKey)!;

      // Рассчитываем производство из сырых данных (только положительные difference)
      const totalProduction = currentDayRawData.reduce((sum, d) => {
        const diff = d.difference || 0;
        return sum + (diff > 0 ? diff : 0);
      }, 0);

      // Рассчитываем время работы (от первой до последней записи)
      const sortedData = [...currentDayRawData].sort(
        (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
      );
      const firstTime = new Date(sortedData[0].datetime).getTime();
      const lastTime = new Date(sortedData[sortedData.length - 1].datetime).getTime();
      const hoursElapsed = (lastTime - firstTime) / (1000 * 60 * 60);

      // Средняя скорость = производство / время
      const averageSpeed = hoursElapsed > 0 ? totalProduction / hoursElapsed : 0;

      const currentSpeed = currentDayRawData.length > 0
        ? currentDayRawData[currentDayRawData.length - 1].speed
        : 0;

      const progress = (totalProduction / TARGETS.daily) * 100;

      const stats: DailyStats = {
        totalProduction,
        averageSpeed,
        currentSpeed,
        progress,
        status: progress >= 100 ? 'normal' : progress >= 80 ? 'warning' : 'danger',
      };

      const currentDayData = {
        date: currentDateKey,
        data: currentDayRawData,
        stats,
      };

      // Если день уже существует (из shift_report), заменяем его real-time данными
      // Иначе добавляем новый день
      console.log(`\n   📊 ДАННЫЕ ТЕКУЩЕГО ДНЯ ${currentDateKey}:`);
      console.log(`      Raw записей: ${currentDayRawData.length}`);
      console.log(`      Производство: ${totalProduction.toFixed(1)}т`);
      console.log(`      Средняя скорость: ${averageSpeed.toFixed(1)}т/ч`);
      console.log(`      Текущая скорость: ${currentSpeed.toFixed(1)}т/ч`);

      if (currentDayIndex !== -1) {
        console.log(`   🔄 ЗАМЕНЯЕМ существующий день на индексе ${currentDayIndex}`);
        dailyGrouped[currentDayIndex] = currentDayData;
      } else {
        console.log(`   ➕ ДОБАВЛЯЕМ новый день в конец массива`);
        dailyGrouped.push(currentDayData);
        // Пересортируем после добавления
        dailyGrouped.sort((a, b) => a.date.localeCompare(b.date));
      }
    } else {
      console.log(`   ❌ НЕТ raw данных для текущего дня ${currentDateKey}`);
    }

    // ФИНАЛЬНОЕ ЛОГИРОВАНИЕ
    console.log('\n\n✅ ========== ИТОГОВЫЙ СПИСОК ДНЕЙ ==========');
    console.log(`Всего дней в массиве: ${dailyGrouped.length}`);
    dailyGrouped.forEach((day, index) => {
      console.log(`${index + 1}. ${day.date} - ${day.stats.totalProduction.toFixed(1)}т (${day.data.length} записей)`);
    });
    console.log('==============================================\n');

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

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const TIMEZONE_OFFSET = 5; // UTC+5

// Вместимость силосов в тоннах
const SMALL_SILO_CAPACITY = 750; // Уравнемер (суточные)
const LARGE_SILO_CAPACITY = 5000; // Большие силоса

interface SiloRecord {
  date: string;
  smallSilo1: number; // Уравнемер 1 (%)
  smallSilo2: number; // Уравнемер 2 (%)
  largeSilo1: number; // Уровень 1 (%) - лузга, не считаем
  largeSilo2: number; // Уровень 2 (%)
  largeSilo3: number; // Уровень 3 (%)
  largeSilo4: number; // Уровень 4 (%)
  largeSilo5: number; // Уровень 5 (%)
  smallSiloTons: number; // Суммарно в уравнемерах (т)
  largeSiloTons: number; // Суммарно в больших силосах без 1-го (т)
  totalTons: number; // Общий остаток (т)
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date') || '2026-01-01';
    const endDate = searchParams.get('end_date') || '2026-02-01';
    const listCollections = searchParams.get('list_collections') === 'true';

    const { client } = await connectToDatabase();
    const db = client.db('scheduler-sync-pro');

    // Если нужен список коллекций
    if (listCollections) {
      const collections = await db.listCollections().toArray();
      const collectionsInfo = await Promise.all(
        collections.map(async (col) => {
          const collection = db.collection(col.name);
          const count = await collection.countDocuments();
          const sample = await collection.find({}).limit(1).toArray();
          return {
            name: col.name,
            count,
            sampleFields: sample.length > 0 ? Object.keys(sample[0]) : [],
            sample: sample.length > 0 ? sample[0] : null,
          };
        })
      );
      return NextResponse.json({ success: true, collections: collectionsInfo });
    }

    // Коллекции с данными уровней
    const smallSiloCollection = db.collection('Level_Rvo_Job'); // Уравнемер 1, 2
    const largeSiloCollection = db.collection('Sgp_Silos_Job'); // Уровень 🌻 1-5

    // Получаем данные за период
    // 08:00 местного времени = 03:00 UTC
    const start = new Date(startDate);
    start.setUTCHours(3, 0, 0, 0);

    const end = new Date(endDate);
    end.setUTCHours(3, 0, 0, 0);

    console.log('Запрос данных:', { start: start.toISOString(), end: end.toISOString() });

    // Получаем данные из обеих коллекций
    const [smallSiloData, largeSiloData] = await Promise.all([
      smallSiloCollection
        .find({ datetime: { $gte: start, $lte: end } })
        .sort({ datetime: 1 })
        .toArray(),
      largeSiloCollection
        .find({ datetime: { $gte: start, $lte: end } })
        .sort({ datetime: 1 })
        .toArray(),
    ]);

    console.log('Найдено записей:', {
      smallSilo: smallSiloData.length,
      largeSilo: largeSiloData.length,
    });

    // Группируем по дням (берем первую запись около 08:00)
    const smallSiloByDay = new Map<string, any>();
    const largeSiloByDay = new Map<string, any>();

    // Обрабатываем данные уравнемеров
    smallSiloData.forEach((doc: any) => {
      const datetime = new Date(doc.datetime);
      const localTime = new Date(datetime.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);
      const dateKey = localTime.toISOString().split('T')[0];
      const hour = localTime.getUTCHours();

      // Берем записи около 08:00 (7-9 часов)
      if (hour >= 7 && hour <= 9) {
        if (!smallSiloByDay.has(dateKey)) {
          smallSiloByDay.set(dateKey, doc);
        }
      }
    });

    // Обрабатываем данные больших силосов
    largeSiloData.forEach((doc: any) => {
      const datetime = new Date(doc.datetime);
      const localTime = new Date(datetime.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);
      const dateKey = localTime.toISOString().split('T')[0];
      const hour = localTime.getUTCHours();

      // Берем записи около 08:00
      if (hour >= 7 && hour <= 9) {
        if (!largeSiloByDay.has(dateKey)) {
          largeSiloByDay.set(dateKey, doc);
        }
      }
    });

    // Собираем все уникальные даты
    const allDates = new Set([...smallSiloByDay.keys(), ...largeSiloByDay.keys()]);

    // Формируем результат
    const results: SiloRecord[] = [];

    allDates.forEach((dateKey) => {
      const smallDoc = smallSiloByDay.get(dateKey);
      const largeDoc = largeSiloByDay.get(dateKey);

      const record: SiloRecord = {
        date: dateKey,
        smallSilo1: 0,
        smallSilo2: 0,
        largeSilo1: 0,
        largeSilo2: 0,
        largeSilo3: 0,
        largeSilo4: 0,
        largeSilo5: 0,
        smallSiloTons: 0,
        largeSiloTons: 0,
        totalTons: 0,
      };

      // Данные уравнемеров
      if (smallDoc?.values && Array.isArray(smallDoc.values)) {
        smallDoc.values.forEach((v: any) => {
          const title = v.title || '';
          const value = v.value || 0;

          if (title.includes('Уравнемер 1')) {
            record.smallSilo1 = value;
          } else if (title.includes('Уравнемер 2')) {
            record.smallSilo2 = value;
          }
        });
      }

      // Данные больших силосов
      if (largeDoc?.values && Array.isArray(largeDoc.values)) {
        largeDoc.values.forEach((v: any) => {
          const title = v.title || '';
          const value = v.value || 0;

          if (title.includes('1')) {
            record.largeSilo1 = value;
          } else if (title.includes('2')) {
            record.largeSilo2 = value;
          } else if (title.includes('3')) {
            record.largeSilo3 = value;
          } else if (title.includes('4')) {
            record.largeSilo4 = value;
          } else if (title.includes('5')) {
            record.largeSilo5 = value;
          }
        });
      }

      // Рассчитываем тоннаж
      record.smallSiloTons = Math.round(
        (record.smallSilo1 / 100) * SMALL_SILO_CAPACITY +
        (record.smallSilo2 / 100) * SMALL_SILO_CAPACITY
      );

      // Без 1-го силоса (там лузга)
      record.largeSiloTons = Math.round(
        (record.largeSilo2 / 100) * LARGE_SILO_CAPACITY +
        (record.largeSilo3 / 100) * LARGE_SILO_CAPACITY +
        (record.largeSilo4 / 100) * LARGE_SILO_CAPACITY +
        (record.largeSilo5 / 100) * LARGE_SILO_CAPACITY
      );

      record.totalTons = record.smallSiloTons + record.largeSiloTons;

      results.push(record);
    });

    // Сортируем по дате
    results.sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      success: true,
      collections: {
        smallSilo: 'Level_Rvo_Job',
        largeSilo: 'Sgp_Silos_Job',
      },
      period: { start: startDate, end: endDate },
      count: results.length,
      capacities: {
        smallSilo: `${SMALL_SILO_CAPACITY} т (каждый)`,
        largeSilo: `${LARGE_SILO_CAPACITY} т (каждый)`,
      },
      note: 'Силос 1 (лузга) не учитывается в расчете',
      data: results,
    });
  } catch (error: any) {
    console.error('Error fetching silo levels:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

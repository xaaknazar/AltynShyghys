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

    // Ищем коллекции с данными уровней
    // Пробуем разные варианты названий
    const possibleCollections = [
      'Level_Job',
      'Levels_Job',
      'Silo_Level_Job',
      'Silo_Levels_Job',
      'Urovnemer_Job',
      'Daily_Levels_Job',
      'Storage_Level_Job',
    ];

    let levelCollection = null;
    let collectionName = '';

    for (const name of possibleCollections) {
      const collections = await db.listCollections({ name }).toArray();
      if (collections.length > 0) {
        levelCollection = db.collection(name);
        collectionName = name;
        break;
      }
    }

    // Если не нашли по стандартным названиям, ищем по содержимому
    if (!levelCollection) {
      const allCollections = await db.listCollections().toArray();

      for (const col of allCollections) {
        const collection = db.collection(col.name);
        const sample = await collection.find({}).limit(5).toArray();

        // Проверяем, есть ли в данных упоминание уровнемера или силоса
        for (const doc of sample) {
          if (doc.values && Array.isArray(doc.values)) {
            const hasLevel = doc.values.some((v: any) =>
              v.title && (
                v.title.includes('Уравнемер') ||
                v.title.includes('Уровень') ||
                v.title.includes('уровень') ||
                v.title.includes('Level')
              )
            );
            if (hasLevel) {
              levelCollection = collection;
              collectionName = col.name;
              break;
            }
          }
        }
        if (levelCollection) break;
      }
    }

    if (!levelCollection) {
      // Выводим все коллекции для отладки
      const allCollections = await db.listCollections().toArray();
      return NextResponse.json({
        success: false,
        error: 'Не найдена коллекция с данными уровней силосов',
        availableCollections: allCollections.map(c => c.name),
      });
    }

    // Получаем данные за период
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Устанавливаем время 08:00 UTC+5 (03:00 UTC)
    const startUTC = new Date(start);
    startUTC.setUTCHours(3, 0, 0, 0); // 08:00 местного = 03:00 UTC

    const endUTC = new Date(end);
    endUTC.setUTCHours(3, 0, 0, 0);

    const data = await levelCollection
      .find({
        datetime: {
          $gte: startUTC,
          $lte: endUTC,
        },
      })
      .sort({ datetime: 1 })
      .toArray();

    // Группируем по дням (берем запись ближайшую к 08:00)
    const dailyData = new Map<string, any>();

    data.forEach((doc: any) => {
      const datetime = new Date(doc.datetime);
      const localTime = new Date(datetime.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);
      const dateKey = localTime.toISOString().split('T')[0];
      const hour = localTime.getUTCHours();

      // Берем записи около 08:00 (7-9 часов)
      if (hour >= 7 && hour <= 9) {
        if (!dailyData.has(dateKey) || Math.abs(hour - 8) < Math.abs(dailyData.get(dateKey).hour - 8)) {
          dailyData.set(dateKey, { ...doc, hour });
        }
      }
    });

    // Формируем результат
    const results: SiloRecord[] = [];

    dailyData.forEach((doc, dateKey) => {
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

      if (doc.values && Array.isArray(doc.values)) {
        doc.values.forEach((v: any) => {
          const title = v.title || '';
          const value = v.value || 0;

          if (title.includes('Уравнемер 1') || title.includes('Уровнемер 1')) {
            record.smallSilo1 = value;
          } else if (title.includes('Уравнемер 2') || title.includes('Уровнемер 2')) {
            record.smallSilo2 = value;
          } else if (title.includes('Уровень') && title.includes('1')) {
            record.largeSilo1 = value;
          } else if (title.includes('Уровень') && title.includes('2')) {
            record.largeSilo2 = value;
          } else if (title.includes('Уровень') && title.includes('3')) {
            record.largeSilo3 = value;
          } else if (title.includes('Уровень') && title.includes('4')) {
            record.largeSilo4 = value;
          } else if (title.includes('Уровень') && title.includes('5')) {
            record.largeSilo5 = value;
          }
        });
      }

      // Рассчитываем тоннаж
      record.smallSiloTons =
        (record.smallSilo1 / 100) * SMALL_SILO_CAPACITY +
        (record.smallSilo2 / 100) * SMALL_SILO_CAPACITY;

      // Без 1-го силоса (там лузга)
      record.largeSiloTons =
        (record.largeSilo2 / 100) * LARGE_SILO_CAPACITY +
        (record.largeSilo3 / 100) * LARGE_SILO_CAPACITY +
        (record.largeSilo4 / 100) * LARGE_SILO_CAPACITY +
        (record.largeSilo5 / 100) * LARGE_SILO_CAPACITY;

      record.totalTons = record.smallSiloTons + record.largeSiloTons;

      results.push(record);
    });

    // Сортируем по дате
    results.sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      success: true,
      collection: collectionName,
      period: { start: startDate, end: endDate },
      count: results.length,
      capacities: {
        smallSilo: SMALL_SILO_CAPACITY,
        largeSilo: LARGE_SILO_CAPACITY,
      },
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

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const TIMEZONE_OFFSET = 5; // UTC+5

interface TechDataPoint {
  datetime: Date;
  values: {
    title: string;
    value: number;
    metric_unit: string;
  }[];
}

interface AggregatedTechData {
  time: string;
  [key: string]: string | number; // Динамические ключи для разных метрик
}

// Группируем данные по 30-минутным интервалам
function aggregateToThirtyMinutes(data: TechDataPoint[]): AggregatedTechData[] {
  const intervals = new Map<string, Map<string, number[]>>();

  data.forEach((item) => {
    const date = new Date(item.datetime);
    const localTime = new Date(date.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);

    const minutes = localTime.getUTCMinutes();
    const roundedMinutes = minutes < 30 ? 0 : 30;
    localTime.setUTCMinutes(roundedMinutes, 0, 0);

    const timeKey = localTime.toISOString().substring(11, 16);

    if (!intervals.has(timeKey)) {
      intervals.set(timeKey, new Map());
    }

    const intervalData = intervals.get(timeKey)!;

    item.values.forEach((val) => {
      if (!intervalData.has(val.title)) {
        intervalData.set(val.title, []);
      }
      intervalData.get(val.title)!.push(val.value);
    });
  });

  const result: AggregatedTechData[] = [];

  intervals.forEach((metricsMap, timeKey) => {
    const dataPoint: AggregatedTechData = { time: timeKey };

    metricsMap.forEach((values, metricTitle) => {
      const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
      dataPoint[metricTitle] = Math.round(avg * 100) / 100;
    });

    result.push(dataPoint);
  });

  return result.sort((a, b) => a.time.localeCompare(b.time));
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');
    const collection = searchParams.get('collection');

    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Missing date parameter' },
        { status: 400 }
      );
    }

    if (!collection) {
      return NextResponse.json(
        { success: false, error: 'Missing collection parameter' },
        { status: 400 }
      );
    }

    const validCollections = [
      'Extractor_TechData_Job',
      'Press_1_Job',
      'Press_2_Job',
      'Press_Extractor_Job',
      'Press_Jarovnia_Mezga',
      'Data_extractor_cooking'
    ];

    if (!validCollections.includes(collection)) {
      return NextResponse.json(
        { success: false, error: 'Invalid collection name' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const coll = db.collection(collection);

    // Производственный день начинается в 08:00 текущего дня (дневная смена)
    const startDateTime = new Date(`${date}T08:00:00`);
    const startUTC = new Date(startDateTime.getTime() - TIMEZONE_OFFSET * 60 * 60 * 1000);

    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);
    const endDateStr = endDate.toISOString().split('T')[0];
    const endDateTime = new Date(`${endDateStr}T08:00:00`);
    const endUTC = new Date(endDateTime.getTime() - TIMEZONE_OFFSET * 60 * 60 * 1000);

    const data = await coll
      .find({
        datetime: {
          $gte: startUTC,
          $lt: endUTC,
        },
      })
      .sort({ datetime: 1 })
      .toArray();

    if (!data || data.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        metrics: [],
      });
    }

    // Преобразуем данные
    const formattedData: TechDataPoint[] = data.map((item) => ({
      datetime: item.datetime,
      values: item.values || [],
    }));

    // Группируем данные по 30-минутным интервалам
    const aggregatedData = aggregateToThirtyMinutes(formattedData);

    // Получаем список всех метрик с их единицами измерения
    const metricsSet = new Set<string>();
    const metricsUnits = new Map<string, string>();

    formattedData.forEach((item) => {
      item.values.forEach((val) => {
        metricsSet.add(val.title);
        if (!metricsUnits.has(val.title)) {
          metricsUnits.set(val.title, val.metric_unit);
        }
      });
    });

    const cleanUnit = (unit: string): string => {
      return unit
        .replace(/Celsius/gi, '°C')
        .replace(/А ампер/gi, 'A')
        .replace(/A ампер/gi, 'A')
        .replace(/ампер/gi, 'A')
        .replace(/% процент/gi, '%')
        .replace(/процент/gi, '%')
        .trim();
    };

    const metrics = Array.from(metricsSet).map((title) => ({
      title,
      unit: cleanUnit(metricsUnits.get(title) || ''),
    }));

    return NextResponse.json({
      success: true,
      data: aggregatedData,
      metrics,
    });
  } catch (error) {
    console.error('Error fetching technical data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch technical data' },
      { status: 500 }
    );
  }
}

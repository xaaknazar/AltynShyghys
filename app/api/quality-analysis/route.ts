import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ANALYSIS_TYPES } from '@/lib/quality-types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Получить анализы с фильтрами
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date'); // YYYY-MM-DD
    const endDate = searchParams.get('end_date'); // YYYY-MM-DD
    const shiftType = searchParams.get('shift_type'); // 'day' | 'night' | 'all'
    const analysisType = searchParams.get('analysis_type'); // тип анализа или 'all'
    const groupBy = searchParams.get('group_by'); // 'none' | 'shift' | 'day'

    const { db } = await connectToDatabase();
    const collection = db.collection('Quality_Analysis');

    let query: any = {};

    // Фильтр по датам
    if (startDate || endDate) {
      query.shift_date = {};
      if (startDate) query.shift_date.$gte = startDate;
      if (endDate) query.shift_date.$lte = endDate;
    }

    // Фильтр по смене
    if (shiftType && shiftType !== 'all') {
      query.shift_type = shiftType;
    }

    // Фильтр по типу анализа
    if (analysisType && analysisType !== 'all') {
      query.analysis_type = analysisType;
    }

    const analyses = await collection
      .find(query)
      .sort({ sample_time: -1 })
      .limit(1000)
      .toArray();

    const formattedAnalyses = analyses.map((a) => ({
      id: a._id.toString(),
      shift_date: a.shift_date,
      shift_type: a.shift_type,
      sample_time: a.sample_time,
      analysis_type: a.analysis_type,
      value: a.value,
      technician_name: a.technician_name,
      comments: a.comments,
      created_at: a.created_at,
    }));

    // Группировка данных если требуется
    let groupedData = null;
    if (groupBy && groupBy !== 'none') {
      groupedData = groupAnalyses(formattedAnalyses, groupBy as 'shift' | 'day');
    }

    const response = NextResponse.json({
      success: true,
      analyses: formattedAnalyses,
      grouped: groupedData,
      count: formattedAnalyses.length,
    });

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('Error fetching quality analyses:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch quality analyses' },
      { status: 500 }
    );
  }
}

// Создать новый анализ
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      shift_date,
      shift_type,
      sample_time,
      analysis_type,
      value,
      technician_name,
      comments,
    } = body;

    // Валидация
    if (!shift_date || !shift_type || !sample_time || !analysis_type || value === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Проверка типа анализа
    const validTypes = Object.values(ANALYSIS_TYPES);
    if (!validTypes.includes(analysis_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid analysis type' },
        { status: 400 }
      );
    }

    // Проверка значения
    if (typeof value !== 'number' || value < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid value' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const collection = db.collection('Quality_Analysis');

    const newAnalysis = {
      shift_date,
      shift_type,
      sample_time: new Date(sample_time),
      analysis_type,
      value: parseFloat(value.toFixed(2)),
      technician_name: technician_name || null,
      comments: comments || null,
      created_at: new Date(),
    };

    const result = await collection.insertOne(newAnalysis);

    return NextResponse.json({
      success: true,
      id: result.insertedId.toString(),
      message: 'Quality analysis created successfully',
    });
  } catch (error) {
    console.error('Error creating quality analysis:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create quality analysis' },
      { status: 500 }
    );
  }
}

// Удалить анализ
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing analysis ID' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const collection = db.collection('Quality_Analysis');

    // Проверяем, существует ли анализ
    const { ObjectId } = require('mongodb');
    const analysis = await collection.findOne({ _id: new ObjectId(id) });

    if (!analysis) {
      return NextResponse.json(
        { success: false, error: 'Analysis not found' },
        { status: 404 }
      );
    }

    // Удаляем анализ
    await collection.deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      success: true,
      message: 'Analysis deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting quality analysis:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete quality analysis' },
      { status: 500 }
    );
  }
}

// Функция группировки данных
function groupAnalyses(analyses: any[], groupBy: 'shift' | 'day') {
  const grouped: any = {};

  analyses.forEach((analysis) => {
    const key = groupBy === 'shift'
      ? `${analysis.shift_date}_${analysis.shift_type}_${analysis.analysis_type}`
      : `${analysis.shift_date}_${analysis.analysis_type}`;

    if (!grouped[key]) {
      grouped[key] = {
        shift_date: analysis.shift_date,
        shift_type: groupBy === 'shift' ? analysis.shift_type : 'both',
        analysis_type: analysis.analysis_type,
        values: [],
        count: 0,
      };
    }

    grouped[key].values.push(analysis.value);
    grouped[key].count++;
  });

  // Вычисляем статистику для каждой группы
  return Object.values(grouped).map((group: any) => ({
    ...group,
    average: group.values.reduce((sum: number, v: number) => sum + v, 0) / group.count,
    min: Math.min(...group.values),
    max: Math.max(...group.values),
  }));
}

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

// CORS headers для кросс-доменных запросов
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// OPTIONS - preflight запрос для CORS
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// GET - получить все задачи
export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('Rafdez_Tasks');

    const tasks = await collection
      .find({})
      .sort({ startDate: 1 })
      .toArray();

    return NextResponse.json({
      success: true,
      data: tasks,
      count: tasks.length,
    }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST - создать новую задачу
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { name, object, category, startDate, endDate, responsible, status, description, createdBy } = body;

    if (!name || !responsible) {
      return NextResponse.json(
        { success: false, error: 'Название и ответственный обязательны' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { db } = await connectToDatabase();
    const collection = db.collection('Rafdez_Tasks');

    const task = {
      name,
      object: Array.isArray(object) ? object : (object ? [object] : []),
      category: category || 'other',
      startDate,
      endDate,
      responsible,
      status: status || 'planned',
      description: description || '',
      createdBy: createdBy || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await collection.insertOne(task);

    return NextResponse.json({
      success: true,
      data: { ...task, _id: result.insertedId },
    }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

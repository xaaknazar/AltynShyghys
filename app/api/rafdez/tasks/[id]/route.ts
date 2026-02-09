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

// GET - получить одну задачу
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Неверный ID задачи' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { db } = await connectToDatabase();
    const collection = db.collection('Rafdez_Tasks');

    const task = await collection.findOne({ _id: new ObjectId(id) });

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Задача не найдена' },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      data: task,
    }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// PUT - обновить задачу
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Неверный ID задачи' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { name, object, category, startDate, endDate, responsible, status, description } = body;

    if (!name || !responsible) {
      return NextResponse.json(
        { success: false, error: 'Название и ответственный обязательны' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { db } = await connectToDatabase();
    const collection = db.collection('Rafdez_Tasks');

    const updateData = {
      name,
      object: object || '',
      category,
      startDate,
      endDate,
      responsible,
      status,
      description,
      updatedAt: new Date().toISOString(),
    };

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Задача не найдена' },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      data: { _id: id, ...updateData },
    }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// DELETE - удалить задачу
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Неверный ID задачи' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { db } = await connectToDatabase();
    const collection = db.collection('Rafdez_Tasks');

    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Задача не найдена' },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Задача удалена',
    }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

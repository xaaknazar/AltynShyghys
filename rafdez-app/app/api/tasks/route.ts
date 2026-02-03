import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

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
    });
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - создать новую задачу
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { name, category, startDate, endDate, responsible, status, progress, description } = body;

    if (!name || !responsible) {
      return NextResponse.json(
        { success: false, error: 'Название и ответственный обязательны' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const collection = db.collection('Rafdez_Tasks');

    const task = {
      name,
      category: category || 'other',
      startDate,
      endDate,
      responsible,
      status: status || 'planned',
      progress: progress || 0,
      description: description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await collection.insertOne(task);

    return NextResponse.json({
      success: true,
      data: { ...task, _id: result.insertedId },
    });
  } catch (error: any) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

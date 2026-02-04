import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Google Sheets конфигурация (нужно настроить в переменных окружения)
const SPREADSHEET_ID = process.env.RAFDEZ_GOOGLE_SPREADSHEET_ID;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

interface LogEntry {
  action: 'create' | 'update' | 'delete' | 'approve' | 'revoke_approval';
  taskName: string;
  taskId?: string;
  user?: string;
  userRole?: string;
  changes?: string;
  timestamp?: string;
}

// Инициализация Google Sheets API
async function getGoogleSheetsClient() {
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    return null;
  }

  const auth = new google.auth.JWT(
    GOOGLE_SERVICE_ACCOUNT_EMAIL,
    undefined,
    GOOGLE_PRIVATE_KEY,
    ['https://www.googleapis.com/auth/spreadsheets']
  );

  return google.sheets({ version: 'v4', auth });
}

// Добавление записи в Google Sheets
async function appendToGoogleSheets(entry: LogEntry) {
  const sheets = await getGoogleSheetsClient();

  if (!sheets || !SPREADSHEET_ID) {
    console.log('Google Sheets not configured, logging to console:', entry);
    return false;
  }

  const timestamp = entry.timestamp || new Date().toISOString();
  const formattedDate = new Date(timestamp).toLocaleString('ru-RU', {
    timeZone: 'Asia/Almaty',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const actionLabels: Record<string, string> = {
    create: 'Создание',
    update: 'Изменение',
    delete: 'Удаление',
    approve: 'Согласование',
    revoke_approval: 'Отмена согласования',
  };

  const row = [
    formattedDate,
    actionLabels[entry.action] || entry.action,
    entry.taskName,
    entry.taskId || '',
    entry.user || 'Гость',
    entry.userRole === 'project_manager' ? 'Проектный менеджер' :
      entry.userRole === 'director' ? 'Директор' : 'Гость',
    entry.changes || '',
  ];

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Журнал!A:G', // Лист "Журнал" с колонками A-G
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row],
      },
    });
    return true;
  } catch (error) {
    console.error('Error appending to Google Sheets:', error);
    return false;
  }
}

// CORS заголовки
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

// POST - Добавить запись в лог
export async function POST(request: NextRequest) {
  try {
    const body: LogEntry = await request.json();

    if (!body.action || !body.taskName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: action, taskName' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const success = await appendToGoogleSheets(body);

    return NextResponse.json(
      {
        success: true,
        logged: success,
        message: success ? 'Logged to Google Sheets' : 'Google Sheets not configured, logged to console',
      },
      { headers: corsHeaders() }
    );
  } catch (error) {
    console.error('Error logging action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to log action' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

// OPTIONS для CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}

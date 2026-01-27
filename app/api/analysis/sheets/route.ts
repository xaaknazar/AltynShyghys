import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';

const DOCUMENT_ID = '1B9R1LVyEsfILWMs8aMhOTIEtKICMlFuX';

const SHEET_GIDS = {
  top0: '716153082',      // Топ 0 (входящее сырье)
  rvo: '1039536554',      // РВО (рушанка и лузга)
  extraction: '1864196626', // Экстракция
  granulation: '431656613', // Грануляция
  press: '889626486',     // Прессовый
};

/**
 * Получить CSV данные из Google Sheets
 */
async function fetchSheetData(gid: string): Promise<string> {
  const url = `https://docs.google.com/spreadsheets/d/${DOCUMENT_ID}/export?format=csv&gid=${gid}`;

  try {
    const response = await fetch(url, {
      cache: 'no-store', // Всегда получаем свежие данные
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch sheet data: ${response.status}`);
    }

    return await response.text();
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    throw error;
  }
}

/**
 * Парсинг CSV в массив объектов с использованием papaparse
 */
function parseCSV(csv: string): any[] {
  const result = Papa.parse<Record<string, string>>(csv, {
    header: true, // Первая строка - заголовки
    skipEmptyLines: true, // Пропускаем пустые строки
    dynamicTyping: false, // Оставляем все как строки (чтобы избежать ошибок с числами)
  });

  if (result.errors.length > 0) {
    console.warn('CSV parsing warnings:', result.errors);
  }

  return result.data || [];
}

/**
 * API endpoint для получения анализов из Google Sheets
 * GET /api/analysis/sheets?type=top0|rvo|extraction|granulation|press
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'top0';

    // Проверяем тип
    if (!Object.keys(SHEET_GIDS).includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Use: top0, rvo, extraction, granulation, press' },
        { status: 400 }
      );
    }

    // Получаем gid для типа
    const gid = SHEET_GIDS[type as keyof typeof SHEET_GIDS];

    console.log(`📊 Fetching ${type} analysis data from Google Sheets (gid: ${gid})`);

    // Загружаем CSV
    const csvData = await fetchSheetData(gid);

    // Парсим CSV
    const rows = parseCSV(csvData);

    console.log(`✅ Parsed ${rows.length} rows for ${type}`);

    return NextResponse.json({
      type,
      data: rows,
      count: rows.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Error in sheets API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analysis data', details: error.message },
      { status: 500 }
    );
  }
}

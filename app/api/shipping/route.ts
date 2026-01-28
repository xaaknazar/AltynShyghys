import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';

const DOCUMENT_ID = '1B9R1LVyEsfILWMs8aMhOTIEtKICMlFuX';
const SHIPPING_GID = '1303939556'; // GID из URL отгрузки

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
 * Парсинг CSV в массив объектов
 */
function parseCSV(csv: string): any[] {
  const result = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  if (result.errors.length > 0) {
    console.warn('CSV parsing warnings:', result.errors);
  }

  return result.data || [];
}

/**
 * Преобразование строковых данных в числовые
 */
function parseShippingRow(row: any) {
  const parseNumber = (val: any): number => {
    if (val === null || val === undefined || val === '') return 0;
    const num = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : parseFloat(val);
    return isNaN(num) ? 0 : num;
  };

  return {
    date: row['Дата'] || row['date'] || '',
    time: row['Время'] || row['time'] || '',
    cistern: row['№ цистерны, автомобиля'] || row['cistern'] || '',
    brutto: parseNumber(row['Брутто']),
    tara: parseNumber(row['Тара']),
    netto: parseNumber(row['Нетто']),
    pressed: parseNumber(row['Прессовое, кг']),
    extraction: parseNumber(row['Экстракционное, кг']),
    buyer: row['Покупатель'] || row['buyer'] || '',
    mixLevel: row['МБ уровень\nпресс% экстр%'] || row['МБ уровень пресс% экстр%'] || row['mixLevel'] || '',
    sample: row['№ пробы'] || row['sample'] || '',
    moisture: parseNumber(row['влага']),
    acidNumber: parseNumber(row['кис.ч']),
    peroxideNumber: parseNumber(row['пер.ч']),
    phosphorus: parseNumber(row['Фосфор']),
    sediment: parseNumber(row['Отстой']),
  };
}

/**
 * API endpoint для получения данных отгрузки из Google Sheets
 * GET /api/shipping
 */
export async function GET(request: NextRequest) {
  try {
    console.log(`📦 Fetching shipping data from Google Sheets (gid: ${SHIPPING_GID})`);

    // Загружаем CSV
    const csvData = await fetchSheetData(SHIPPING_GID);

    // Парсим CSV
    const rows = parseCSV(csvData);

    // Преобразуем данные
    const shippingData = rows
      .map(parseShippingRow)
      .filter(row => row.date && row.netto > 0); // Фильтруем пустые строки

    console.log(`✅ Parsed ${shippingData.length} shipping records`);

    return NextResponse.json({
      success: true,
      data: shippingData,
      count: shippingData.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Error in shipping API:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch shipping data',
        details: error.message
      },
      { status: 500 }
    );
  }
}

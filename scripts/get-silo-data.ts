/**
 * Скрипт для получения данных силосов из MongoDB
 * Запуск: npx ts-node --project tsconfig.json scripts/get-silo-data.ts
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config({ path: '.env.local' });

const TIMEZONE_OFFSET = 5; // UTC+5
const SMALL_SILO_CAPACITY = 750; // Уравнемер (т)
const LARGE_SILO_CAPACITY = 5000; // Большие силоса (т)

interface SiloData {
  date: string;
  smallSilo1Percent: number;
  smallSilo2Percent: number;
  largeSilo2Percent: number;
  largeSilo3Percent: number;
  largeSilo4Percent: number;
  largeSilo5Percent: number;
  smallSiloTons: number;
  largeSiloTons: number;
  totalTons: number;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI не найден в .env.local');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Подключено к MongoDB');

    const db = client.db('scheduler-sync-pro');

    // Получаем список коллекций
    const collections = await db.listCollections().toArray();
    console.log('\nДоступные коллекции:');
    collections.forEach(c => console.log(`  - ${c.name}`));

    // Ищем коллекцию с уровнями
    let levelCollection = null;
    let collectionName = '';

    for (const col of collections) {
      const collection = db.collection(col.name);
      const sample = await collection.find({}).limit(3).toArray();

      for (const doc of sample) {
        if (doc.values && Array.isArray(doc.values)) {
          const titles = doc.values.map((v: any) => v.title).join(', ');
          if (titles.includes('Уравнемер') || titles.includes('Уровень')) {
            console.log(`\nНайдена коллекция с уровнями: ${col.name}`);
            console.log(`Пример данных: ${titles}`);
            levelCollection = collection;
            collectionName = col.name;
            break;
          }
        }
      }
      if (levelCollection) break;
    }

    if (!levelCollection) {
      console.error('\nНе найдена коллекция с данными уровней силосов');

      // Показываем структуру всех коллекций
      console.log('\nСтруктура коллекций:');
      for (const col of collections) {
        const collection = db.collection(col.name);
        const sample = await collection.findOne({});
        if (sample) {
          console.log(`\n${col.name}:`);
          if (sample.values && Array.isArray(sample.values)) {
            console.log(`  Поля values: ${sample.values.map((v: any) => v.title).join(', ')}`);
          } else {
            console.log(`  Ключи: ${Object.keys(sample).join(', ')}`);
          }
        }
      }
      return;
    }

    // Запрашиваем данные за период 1 января - 1 февраля 2026
    const startDate = new Date('2026-01-01T03:00:00Z'); // 08:00 UTC+5
    const endDate = new Date('2026-02-01T03:00:00Z');

    console.log(`\nПериод: ${startDate.toISOString()} - ${endDate.toISOString()}`);

    const data = await levelCollection
      .find({
        datetime: {
          $gte: startDate,
          $lte: endDate,
        },
      })
      .sort({ datetime: 1 })
      .toArray();

    console.log(`Найдено записей: ${data.length}`);

    // Группируем по дням
    const dailyData = new Map<string, any>();

    data.forEach((doc: any) => {
      const datetime = new Date(doc.datetime);
      const localTime = new Date(datetime.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000);
      const dateKey = localTime.toISOString().split('T')[0];
      const hour = localTime.getUTCHours();

      // Берем записи около 08:00
      if (hour >= 7 && hour <= 9) {
        if (!dailyData.has(dateKey)) {
          dailyData.set(dateKey, doc);
        }
      }
    });

    // Формируем таблицу
    const results: SiloData[] = [];

    dailyData.forEach((doc, dateKey) => {
      const record: SiloData = {
        date: dateKey,
        smallSilo1Percent: 0,
        smallSilo2Percent: 0,
        largeSilo2Percent: 0,
        largeSilo3Percent: 0,
        largeSilo4Percent: 0,
        largeSilo5Percent: 0,
        smallSiloTons: 0,
        largeSiloTons: 0,
        totalTons: 0,
      };

      if (doc.values && Array.isArray(doc.values)) {
        doc.values.forEach((v: any) => {
          const title = v.title || '';
          const value = v.value || 0;

          if (title.includes('Уравнемер 1') || title.includes('Уровнемер 1')) {
            record.smallSilo1Percent = value;
          } else if (title.includes('Уравнемер 2') || title.includes('Уровнемер 2')) {
            record.smallSilo2Percent = value;
          } else if (title.match(/Уровень.*2/)) {
            record.largeSilo2Percent = value;
          } else if (title.match(/Уровень.*3/)) {
            record.largeSilo3Percent = value;
          } else if (title.match(/Уровень.*4/)) {
            record.largeSilo4Percent = value;
          } else if (title.match(/Уровень.*5/)) {
            record.largeSilo5Percent = value;
          }
        });
      }

      // Рассчитываем тоннаж
      record.smallSiloTons = Math.round(
        (record.smallSilo1Percent / 100) * SMALL_SILO_CAPACITY +
        (record.smallSilo2Percent / 100) * SMALL_SILO_CAPACITY
      );

      record.largeSiloTons = Math.round(
        (record.largeSilo2Percent / 100) * LARGE_SILO_CAPACITY +
        (record.largeSilo3Percent / 100) * LARGE_SILO_CAPACITY +
        (record.largeSilo4Percent / 100) * LARGE_SILO_CAPACITY +
        (record.largeSilo5Percent / 100) * LARGE_SILO_CAPACITY
      );

      record.totalTons = record.smallSiloTons + record.largeSiloTons;

      results.push(record);
    });

    results.sort((a, b) => a.date.localeCompare(b.date));

    // Выводим таблицу
    console.log('\n' + '='.repeat(120));
    console.log('ОСТАТКИ В СИЛОСАХ (с 1 января по 1 февраля 2026)');
    console.log('='.repeat(120));
    console.log(
      '| Дата       | Уравн.1 | Уравн.2 | Силос 2 | Силос 3 | Силос 4 | Силос 5 | Суточные (т) | Большие (т) | ИТОГО (т) |'
    );
    console.log('|' + '-'.repeat(118) + '|');

    results.forEach((r) => {
      console.log(
        `| ${r.date} | ${r.smallSilo1Percent.toFixed(0).padStart(6)}% | ${r.smallSilo2Percent.toFixed(0).padStart(6)}% | ${r.largeSilo2Percent.toFixed(0).padStart(6)}% | ${r.largeSilo3Percent.toFixed(0).padStart(6)}% | ${r.largeSilo4Percent.toFixed(0).padStart(6)}% | ${r.largeSilo5Percent.toFixed(0).padStart(6)}% | ${r.smallSiloTons.toString().padStart(12)} | ${r.largeSiloTons.toString().padStart(11)} | ${r.totalTons.toString().padStart(9)} |`
      );
    });

    console.log('='.repeat(120));
    console.log(`\nВсего дней: ${results.length}`);
    console.log(`Вместимость: Уравнемер = ${SMALL_SILO_CAPACITY} т, Большой силос = ${LARGE_SILO_CAPACITY} т`);
    console.log('Примечание: Силос 1 (лузга) не учитывается в расчете');

  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    await client.close();
  }
}

main();

'use client';

import { useState } from 'react';

export default function FixShiftPage() {
  const [date, setDate] = useState('2025-07-09');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleCheck = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/debug/fix-shift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, dryRun: true }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error:', error);
      setResult({ success: false, error: 'Ошибка при проверке данных' });
    } finally {
      setLoading(false);
    }
  };

  const handleFix = async () => {
    if (!confirm('Вы уверены, что хотите исправить данные в базе данных?')) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/debug/fix-shift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, dryRun: false }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error:', error);
      setResult({ success: false, error: 'Ошибка при исправлении данных' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-800 mb-8">
          🔧 Исправление данных смены при сбросе счетчика
        </h1>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Выбор даты</h2>

          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm text-slate-600 mb-2">
                Производственный день (YYYY-MM-DD)
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>

            <button
              onClick={handleCheck}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold rounded-lg transition-all"
            >
              {loading ? 'Проверка...' : '🔍 Проверить'}
            </button>
          </div>

          <div className="mt-4 text-sm text-slate-500">
            <p>• Выберите производственный день, для которого нужно исправить данные ночной смены</p>
            <p>• Сначала нажмите "Проверить" для предпросмотра изменений</p>
          </div>
        </div>

        {result && (
          <div className={`bg-white rounded-2xl border-2 p-6 shadow-sm ${
            result.success ? 'border-blue-200' : 'border-red-200'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`text-2xl ${result.success ? '✅' : '❌'}`}>
                {result.success ? '✅' : '❌'}
              </div>
              <h2 className="text-xl font-bold text-slate-800">
                {result.message || (result.success ? 'Успешно' : 'Ошибка')}
              </h2>
            </div>

            {result.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-700 font-semibold">{result.error}</p>
                {result.recommendation && (
                  <p className="text-red-600 text-sm mt-2">{result.recommendation}</p>
                )}
                {result.suggestion && (
                  <div className="mt-3 pt-3 border-t border-red-200">
                    <p className="text-sm font-semibold text-red-700 mb-1">💡 Возможное решение:</p>
                    <p className="text-sm text-red-600">{result.suggestion}</p>
                  </div>
                )}
              </div>
            )}

            {result.analysis && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-slate-600 mb-2">Текущие данные</h3>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-slate-500">difference:</span> <span className="font-mono font-bold text-red-600">{result.analysis.currentData.difference.toFixed(2)} т</span></p>
                      <p><span className="text-slate-500">value:</span> <span className="font-mono">{result.analysis.currentData.value.toFixed(2)} т</span></p>
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-slate-600 mb-2">Исправленные данные</h3>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-slate-500">difference:</span> <span className="font-mono font-bold text-green-600">{result.analysis.correction.newDifference.toFixed(2)} т</span></p>
                      <p><span className="text-slate-500">Счетчик сброшен:</span> <span className="font-semibold">{result.analysis.correction.wasCounterReset ? 'Да ⚠️' : 'Нет'}</span></p>
                      {result.analysis.correction.calculationMethod && (
                        <p className="text-xs text-slate-600 mt-2 pt-2 border-t border-green-200">
                          <span className="font-semibold">Метод:</span> {result.analysis.correction.calculationMethod}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {result.analysis.rawDataAnalysis && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h3 className="text-sm font-semibold text-blue-800 mb-2">Анализ сырых данных</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-blue-600 font-semibold mb-1">Начало смены:</p>
                        <p className="text-slate-600">{result.analysis.rawDataAnalysis.firstRecord.localTime}</p>
                        <p className="font-mono">value: {result.analysis.rawDataAnalysis.firstRecord.value.toFixed(2)} т</p>
                      </div>
                      <div>
                        <p className="text-blue-600 font-semibold mb-1">Конец смены:</p>
                        <p className="text-slate-600">{result.analysis.rawDataAnalysis.lastRecord.localTime}</p>
                        <p className="font-mono">value: {result.analysis.rawDataAnalysis.lastRecord.value.toFixed(2)} т</p>
                      </div>
                    </div>
                    <p className="text-slate-500 mt-2">Записей за смену: {result.analysis.rawDataAnalysis.recordsCount}</p>
                  </div>
                )}

                {!result.analysis.rawDataAnalysis && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                    <h3 className="text-sm font-semibold text-amber-800 mb-2">⚠️ Сырые данные недоступны</h3>
                    <p className="text-sm text-amber-700">Сырые данные из Rvo_Production_Job не найдены (возможно были очищены).</p>
                    <p className="text-sm text-amber-600 mt-2">Расчет: {result.analysis.correction.calculationMethod}</p>
                  </div>
                )}

                {!result.applied && result.success && result.analysis.correction.oldDifference !== result.analysis.correction.newDifference && (
                  <button
                    onClick={handleFix}
                    disabled={loading}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-bold rounded-lg transition-all text-lg"
                  >
                    ✅ Применить исправление
                  </button>
                )}

                {result.applied && (
                  <div className="bg-green-100 border border-green-300 rounded-lg p-4 text-center">
                    <p className="text-green-800 font-bold text-lg">✅ Данные успешно исправлены!</p>
                    <p className="text-green-700 text-sm mt-1">
                      Изменено записей: {result.updateResult?.modifiedCount || 0}
                    </p>
                  </div>
                )}
              </>
            )}

            {result.needsFix === false && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <p className="text-green-700 font-semibold">Данные смены не требуют исправления</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

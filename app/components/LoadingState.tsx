'use client';

export default function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 border-4 border-blue-200 rounded-full" />
          <div className="absolute inset-0 border-4 border-transparent border-t-blue-600 rounded-full animate-spin" />
          <div className="absolute inset-4 bg-blue-100 rounded-full blur-xl animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 bg-blue-600 rounded-full shadow-lg animate-pulse" />
          </div>
        </div>

        <h2 className="text-2xl font-display text-slate-800 mb-2">
          Загрузка данных...
        </h2>
        <p className="text-sm text-slate-600 font-mono">
          Подключение к базе данных
        </p>

        <div className="flex items-center justify-center gap-2 mt-6">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
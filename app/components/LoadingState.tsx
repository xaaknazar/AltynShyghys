'use client';

export default function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center grid-background">
      <div className="text-center">
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 border-4 border-industrial-accent/30 rounded-full" />
          <div className="absolute inset-0 border-4 border-transparent border-t-industrial-accent rounded-full animate-spin" />
          <div className="absolute inset-4 bg-industrial-accent/20 rounded-full blur-xl animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 bg-industrial-accent rounded-full shadow-[0_0_20px_rgba(255,107,44,0.8)] animate-pulse" />
          </div>
        </div>

        <h2 className="text-2xl font-display text-gray-300 mb-2">
          Загрузка данных...
        </h2>
        <p className="text-sm text-gray-500 font-mono">
          Подключение к базе данных
        </p>

        <div className="flex items-center justify-center gap-2 mt-6">
          <div className="w-2 h-2 bg-industrial-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-industrial-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-industrial-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
'use client';

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center max-w-md px-4">
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 border-4 border-rose-200 rounded-full animate-pulse" />
          <div className="absolute inset-4 bg-rose-100 rounded-full blur-xl" />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-rose-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        <h2 className="text-2xl font-display text-rose-500 mb-3">
          Ошибка подключения
        </h2>

        <p className="text-slate-700 font-mono text-sm mb-8">
          {message}
        </p>

        <div className="bg-white border border-rose-200 rounded-lg p-4 mb-8 text-left shadow-sm">
          <h3 className="text-sm font-display text-slate-800 mb-2">
            Возможные причины:
          </h3>
          <ul className="text-xs text-slate-600 space-y-2 font-mono">
            <li className="flex items-start gap-2">
              <span className="text-rose-500">•</span>
              <span>Отсутствует подключение к базе данных</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rose-500">•</span>
              <span>Неверные credentials в переменных окружения</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rose-500">•</span>
              <span>IP адрес не в whitelist MongoDB</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rose-500">•</span>
              <span>Проблемы с сетью или firewall</span>
            </li>
          </ul>
        </div>

        <button
          onClick={onRetry}
          className="group px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-display tracking-wider transition-all duration-300 shadow-lg"
        >
          <span className="flex items-center gap-3">
            <svg
              className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Попробовать снова
          </span>
        </button>

        <p className="mt-8 text-xs text-slate-500 font-mono">
          Если проблема сохраняется, обратитесь к администратору системы
        </p>
      </div>
    </div>
  );
}
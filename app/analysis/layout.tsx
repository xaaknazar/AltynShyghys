'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function AnalysisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { href: '/analysis/overview', label: 'Общий анализ', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { href: '/analysis/quality', label: 'Качественный анализ', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { href: '/analysis/production', label: 'Количественный анализ', icon: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { href: '/analysis/shipping', label: 'Отгрузка', icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header с логотипом как на главной странице */}
      <header className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <img
                src="/logo.jpg"
                alt="Altyn Shyghys"
                className="h-12 w-auto object-contain"
              />
              <div className="h-8 w-px bg-slate-300"></div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
                  Анализ данных
                </span>
                <span className="text-xs text-slate-500">
                  Графики и статистика маслозавода
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/otk"
                className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 border border-slate-300 rounded hover:bg-slate-50 transition-colors"
              >
                ОТК
              </Link>
              <Link
                href="/"
                className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 border border-slate-300 rounded hover:bg-slate-50 transition-colors"
              >
                ← На главную
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-8">
        {/* Навигация вкладками */}
        <nav className="mb-8">
          <div className="flex gap-2 flex-wrap">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Основной контент */}
        <div>
          {children}
        </div>
      </main>
    </div>
  );
}

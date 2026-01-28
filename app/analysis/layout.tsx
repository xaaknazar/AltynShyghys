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
    { href: '/analysis/comparison', label: 'Свод анализов', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
    { href: '/analysis/shipping', label: 'Отгрузка', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-blue-600">
                АНАЛИЗ ДАННЫХ
              </h1>
              <p className="text-xs text-slate-600 font-mono mt-1">
                Графики и статистика маслозавода
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/otk"
                className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all"
              >
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-blue-700">ОТК</span>
              </Link>
              <Link
                href="/"
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-800 transition-all"
              >
                ← На главную
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Сайдбар */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm sticky top-24">
              <nav className="space-y-2">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                        isActive
                          ? 'bg-blue-50 border-2 border-blue-500 text-blue-700'
                          : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                      </svg>
                      <span className={`text-sm font-semibold ${isActive ? 'text-blue-700' : 'text-slate-700'}`}>
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Основной контент */}
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

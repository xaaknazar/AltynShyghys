'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function OTKLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { href: '/otk', label: 'Добавить анализ', icon: 'M12 4v16m8-8H4' },
    { href: '/otk/list', label: 'Все анализы', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-blue-600">
                ЛАБОРАТОРНЫЙ КОНТРОЛЬ
              </h1>
              <p className="text-xs text-slate-600 font-mono mt-1">
                Ввод и просмотр результатов анализов качества
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/analysis"
                className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all"
              >
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-sm font-medium text-blue-700">Анализ данных</span>
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

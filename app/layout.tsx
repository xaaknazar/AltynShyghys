import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Маслозавод - Производственная панель',
  description: 'Мониторинг производительности маслозавода в реальном времени',
  icons: {
    icon: '/logo.jpg',
    shortcut: '/logo.jpg',
    apple: '/logo.jpg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
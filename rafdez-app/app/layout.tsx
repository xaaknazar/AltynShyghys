import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Рафдез - Управление строительством',
  description: 'Система управления строительством цеха рафинирования и дезодорирования',
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

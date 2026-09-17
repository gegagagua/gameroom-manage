import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Game Room',
  description: 'Game room / internet cafe management',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ka" suppressHydrationWarning>
      {/* suppressHydrationWarning: browser extensions inject attributes into <body> */}
      <body className="font-sans antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

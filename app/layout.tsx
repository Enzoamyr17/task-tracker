'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from './utils/serviceWorker';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
} 
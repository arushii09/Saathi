import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Paytm Saathi - AI Support Teammate for Small Merchants',
  description: 'Voice-first, vernacular AI support teammate for Paytm Soundbox shopkeepers',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Montserrat:wght@600;700&family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-surface text-text antialiased font-body">
        {children}
      </body>
    </html>
  );
}

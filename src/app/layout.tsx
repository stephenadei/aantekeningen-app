import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import SessionProvider from '@/components/providers/SessionProvider'
import { DarkModeProvider } from '@/contexts/DarkModeContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: "Aantekeningen - Stephen's Privelessen",
  description: "Vind je aantekeningen van Stephen's Privelessen. Alle notities georganiseerd en direct toegankelijk.",
  keywords: ['aantekeningen', 'privelessen', 'stephen', 'notities', 'studie'],
  authors: [{ name: "Stephen's Privelessen" }],
  openGraph: {
    title: "Aantekeningen - Stephen's Privelessen",
    description: "Vind je aantekeningen van Stephen's Privelessen. Alle notities georganiseerd en direct toegankelijk.",
    type: 'website',
    locale: 'nl_NL',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Aantekeningen - Stephen's Privelessen",
    description: "Vind je aantekeningen van Stephen's Privelessen. Alle notities georganiseerd en direct toegankelijk.",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Suppress browser extension errors
              (function() {
                // Suppress message port errors
                window.addEventListener('error', function(e) {
                  if (e.message && (
                    e.message.includes('message port closed') ||
                    e.message.includes('runtime.lastError') ||
                    e.message.includes('Extension context invalidated')
                  )) {
                    e.preventDefault();
                    return false;
                  }
                });
                
                // Suppress unhandled promise rejections from extensions
                window.addEventListener('unhandledrejection', function(e) {
                  if (e.reason && (
                    e.reason.message && e.reason.message.includes('message port closed') ||
                    e.reason.message && e.reason.message.includes('runtime.lastError')
                  )) {
                    e.preventDefault();
                    return false;
                  }
                });
                
                // Override console.error to filter extension errors
                const originalConsoleError = console.error;
                console.error = function(...args) {
                  const message = args.join(' ');
                  if (message.includes('message port closed') || 
                      message.includes('runtime.lastError') ||
                      message.includes('Extension context invalidated')) {
                    return; // Suppress the error
                  }
                  originalConsoleError.apply(console, args);
                };
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <DarkModeProvider>
          <SessionProvider>
            {children}
          </SessionProvider>
        </DarkModeProvider>
      </body>
    </html>
  )
}
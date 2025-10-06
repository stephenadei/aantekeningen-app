import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

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
  viewport: 'width=device-width, initial-scale=1',
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
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Bujanen Palestra',
  description: 'Trainer and client management platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-bg text-white font-sans antialiased">
        {children}
      </body>
    </html>
  )
}

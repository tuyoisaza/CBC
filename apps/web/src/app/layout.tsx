import type { Metadata } from 'next'
import { Raleway } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { DebugCaptureInit } from '@/components/DebugCaptureInit'
import '@/lib/env'
import './globals.css'

const raleway = Raleway({
  subsets: ['latin'],
  variable: '--font-raleway',
  display: 'swap',
  weight: ['300', '400', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'Coffee Bunn Café | Regalos Corporativos de Café',
  description: 'Regalos corporativos premium con café de especialidad mexicano.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${raleway.variable} font-sans antialiased`}>
        <meta name="app-version" content={process.env.NEXT_PUBLIC_APP_VERSION || '?'} />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          disableTransitionOnChange
        >
          <DebugCaptureInit />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

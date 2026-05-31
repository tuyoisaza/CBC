import type { Metadata } from 'next'
import { Raleway } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import './globals.css'

const raleway = Raleway({
  subsets: ['latin'],
  variable: '--font-raleway',
  display: 'swap',
  weight: ['300', '400', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'Admin | Coffee Bunn Café',
  description: 'CBC Operations Platform',
  robots: { index: false, follow: false },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${raleway.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

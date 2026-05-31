import type { Metadata } from 'next'
import { Raleway } from 'next/font/google'
import '../globals.css'

const raleway = Raleway({
  subsets: ['latin'],
  variable: '--font-raleway',
  display: 'swap',
  weight: ['300', '400', '600', '700'],
})

export const metadata: Metadata = {
  title: 'CBC Admin — Iniciar sesión',
  robots: { index: false, follow: false },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${raleway.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}

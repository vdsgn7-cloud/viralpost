import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ViralPost Studio',
  description: 'Crie posts virais com IA em segundos',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;600;700&family=Space+Grotesk:wght@300;400;500;600;700&family=Bebas+Neue&family=Lora:wght@400;500;600&family=Manrope:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
      </head>
      <body>{children}</body>
    </html>
  )
}

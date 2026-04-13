import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Translator — SAMVAD Agent',
  description: 'Multilingual translation and language detection agent.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

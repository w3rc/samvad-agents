import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FactCheck — SAMVAD Agent',
  description: 'Checks claims against live web sources. A SAMVAD protocol agent.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

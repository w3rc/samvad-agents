import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Research — SAMVAD Agent',
  description: 'Multi-agent research assistant. Searches the web, calls Scout over SAMVAD, synthesizes a research brief.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

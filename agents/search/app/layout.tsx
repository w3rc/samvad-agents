import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Search — SAMVAD Agent',
  description: 'Web search agent. Give it a query, get back ranked results with titles, snippets, and URLs.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

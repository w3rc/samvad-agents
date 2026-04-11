import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Scout — SAMVAD Agent',
  description: 'Web page reader and summarizer. A SAMVAD protocol agent.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

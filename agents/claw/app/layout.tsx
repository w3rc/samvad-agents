import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Claw — SAMVAD Agent',
  description: 'OpenClaw-powered conversational agent exposed via the SAMVAD protocol.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

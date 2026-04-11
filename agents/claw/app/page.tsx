export default function Home() {
  return (
    <main style={{ fontFamily: 'monospace', padding: '2rem', maxWidth: '600px' }}>
      <h1>Claw</h1>
      <p>An OpenClaw-powered agent exposed via the SAMVAD protocol. This is an API endpoint, not a web app.</p>
      <ul>
        <li><a href="/.well-known/agent.json">Agent Card</a></li>
        <li><a href="/agent/health">Health</a></li>
      </ul>
    </main>
  )
}

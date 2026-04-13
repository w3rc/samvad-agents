export default function Home() {
  return (
    <main style={{ fontFamily: 'monospace', padding: '2rem', maxWidth: '600px' }}>
      <h1>Research</h1>
      <p>A multi-agent research assistant exposed via the SAMVAD protocol. Give it a topic, it calls Scout to read sources, then synthesizes a research brief.</p>
      <ul>
        <li><a href="/.well-known/agent.json">Agent Card</a></li>
        <li><a href="/agent/health">Health</a></li>
      </ul>
    </main>
  )
}

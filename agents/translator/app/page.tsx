export default function Home() {
  return (
    <main style={{ fontFamily: 'monospace', padding: '2rem', maxWidth: '600px' }}>
      <h1>Translator</h1>
      <p>A multilingual translation agent exposed via the SAMVAD protocol. Translate text between 30+ languages, or detect the language of any text.</p>
      <ul>
        <li><a href="/.well-known/agent.json">Agent Card</a></li>
        <li><a href="/agent/health">Health</a></li>
      </ul>
    </main>
  )
}

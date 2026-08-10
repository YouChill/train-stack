import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Bez granicy błędu jeden wyjątek renderowania (np. zepsuty wpis z importu)
// odmontowuje całe drzewo i zostaje biały ekran bez żadnej informacji.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Render error:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 12, padding: 24, textAlign: 'center',
        background: '#0d1117', color: '#e6edf3', fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{ fontSize: 40 }}>⚠️</div>
        <h1 style={{ fontSize: 18, margin: 0 }}>Coś poszło nie tak</h1>
        <p style={{ margin: 0, color: '#9aa4af', maxWidth: 420, fontSize: 14 }}>
          Aplikacja napotkała błąd podczas wyświetlania danych. Odśwież stronę —
          jeśli problem wraca, daj znać i podeślij treść błędu poniżej.
        </p>
        <code style={{
          fontSize: 12, color: '#f85149', background: '#161b22', padding: '8px 12px',
          borderRadius: 8, maxWidth: 480, overflowWrap: 'anywhere',
        }}>
          {String(this.state.error?.message || this.state.error)}
        </code>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: 4, padding: '8px 20px', borderRadius: 8, border: 'none',
            background: '#2f81f7', color: '#fff', fontSize: 14, cursor: 'pointer',
          }}
        >
          Odśwież stronę
        </button>
      </div>
    )
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)

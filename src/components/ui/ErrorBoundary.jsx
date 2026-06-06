import { Component } from 'react'
import { AlertTriangle } from 'lucide-react'

// Error boundary por painel (ROADMAP 1.4). Um widget que estoura (ex.: shape
// inesperado de uma fonte que mudou) não pode apagar a página inteira do pit
// wall — sobretudo durante o ao vivo. Aqui isolamos a falha: o painel mostra um
// aviso discreto e o resto da tela continua de pé.
//
// Precisa ser classe: só componentes de classe têm getDerivedStateFromError /
// componentDidCatch. O `label` aparece no aviso pra dizer QUAL painel falhou.
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Log no console ajuda a depurar em prod sem derrubar a UI.
    console.error(`[ErrorBoundary${this.props.label ? ` · ${this.props.label}` : ''}]`, error, info)
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div
          className="flex items-center gap-2 px-3 py-4 rounded-lg text-xs"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
        >
          <AlertTriangle size={14} className="flex-shrink-0" aria-hidden />
          <span>
            Falha ao exibir{this.props.label ? ` "${this.props.label}"` : ' este painel'}. O restante da página segue normal.
          </span>
        </div>
      )
    }
    return this.props.children
  }
}

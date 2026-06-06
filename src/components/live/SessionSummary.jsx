import { useState } from 'react'
import { Sparkles, Loader, RefreshCw } from 'lucide-react'
import { summarizeSession, hasApiKey } from '../../api/claude'

// Resumo automático da sessão (ROADMAP 3.3). Gera um boletim de pit wall em
// PT-BR a partir do snapshot ao vivo real (mesmo contexto do PITWALL AI). Sob
// demanda (botão) para não gastar API à toa. Renderizado só quando AI_ENABLED.
export function SessionSummary({ live }) {
  const [text, setText] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function generate() {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      setText(await summarizeSession(live))
    } catch (e) {
      setError(e.message === 'NO_API_KEY'
        ? 'Configure a chave da API no PITWALL AI (botão flutuante) para gerar o resumo.'
        : e.message)
    } finally {
      setLoading(false)
    }
  }

  if (!text && !loading && !error) {
    return (
      <button
        onClick={generate}
        className="flex items-center gap-2 w-full justify-center px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
        style={{ background: 'rgba(225,6,0,0.1)', color: 'var(--color-f1)', border: '1px solid rgba(225,6,0,0.25)' }}
      >
        <Sparkles size={13} aria-hidden />
        Gerar resumo da sessão{!hasApiKey() ? ' (requer chave)' : ''}
      </button>
    )
  }

  return (
    <div className="space-y-2">
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-text-mute py-2">
          <Loader size={13} className="animate-spin" aria-hidden /> Analisando a sessão…
        </div>
      ) : error ? (
        <div className="text-[11px] text-red-400">{error}</div>
      ) : (
        <p className="text-sm text-text-dim leading-relaxed whitespace-pre-line">{text}</p>
      )}
      {!loading && (
        <button
          onClick={generate}
          className="flex items-center gap-1.5 text-[10px] text-text-mute hover:text-text transition-colors"
        >
          <RefreshCw size={11} aria-hidden /> Atualizar resumo
        </button>
      )}
    </div>
  )
}

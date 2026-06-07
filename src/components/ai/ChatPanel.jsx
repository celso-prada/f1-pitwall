import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { getCalendar } from '../../api/jolpica'
import { useDriverStandings } from '../../hooks/useStandings'
import { getNextRace } from '../../utils/format'
import { useLiveTiming } from '../../hooks/useLiveTiming'
import { askClaude, hasApiKey, setApiKey } from '../../api/claude'
import { Bot, X, Send, Key, Loader } from 'lucide-react'

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: 'rgba(225,6,0,0.12)', border: '1px solid rgba(225,6,0,0.3)' }}
          aria-hidden
        >
          <Bot size={12} className="text-red-500" />
        </div>
      )}
      <div
        className="max-w-[82%] px-3 py-2 rounded-xl text-sm leading-relaxed"
        style={{
          background:   isUser ? 'var(--color-f1)' : 'var(--color-surface-2)',
          color:        isUser ? 'white' : 'var(--color-text)',
          borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
        }}
      >
        {msg.content}
      </div>
    </div>
  )
}

function ApiKeyInput({ onSave }) {
  const [key, setKey] = useState('')
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2 text-text-mute text-xs">
        <Key size={12} aria-hidden />
        Configure sua Anthropic API Key para usar o PITWALL AI
      </div>
      <input
        type="password"
        value={key}
        onChange={e => setKey(e.target.value)}
        placeholder="sk-ant-..."
        aria-label="Anthropic API Key"
        className="w-full px-3 py-2 rounded-lg text-sm text-text outline-none"
        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-strong)' }}
        onKeyDown={e => e.key === 'Enter' && key && onSave(key)}
      />
      <button
        onClick={() => key && onSave(key)}
        disabled={!key}
        className="w-full py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
        style={{ background: 'var(--color-f1)', color: 'white' }}
      >
        Salvar e usar
      </button>
      <p className="text-[10px] text-text-mute text-center">
        A chave fica salva só no seu navegador (localStorage)
      </p>
    </div>
  )
}

const SUGGESTIONS = [
  'Quem lidera o campeonato?',
  'Qual a próxima corrida?',
  'Quem tem mais vitórias em Mônaco?',
  'Compare Hamilton vs Verstappen',
]

// Sugestões específicas quando há sessão ao vivo — exploram o contexto rico.
const LIVE_SUGGESTIONS = [
  'Quem é mais rápido no setor 2?',
  'Quem está na janela de undercut?',
  'Quem tem o pneu mais novo?',
  'Resuma a sessão agora',
]

export function ChatPanel() {
  const [open, setOpen]         = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [needsKey, setNeedsKey] = useState(!hasApiKey())
  const bottomRef = useRef(null)

  const { data: standings } = useDriverStandings('current', { enabled: open })
  const { data: races } = useQuery({
    queryKey: ['calendar', 'current'],   // fixed: was hardcoded '2025'
    queryFn: () => getCalendar('current'),
    staleTime: 3_600_000,
    enabled: open,
  })
  // Sessão ao vivo via /api/live (feed oficial) — query compartilhada com o
  // Header, sem custo extra de rede. Dá ao assistente o contexto ao vivo real.
  const { data: live } = useLiveTiming()

  const isLive = !!(live?.live && live.data?.drivers?.length)
  const context = {
    standings,
    session: live?.data?.session ?? null,
    nextRace: races ? getNextRace(races) : null,
    // Contexto AO VIVO real (cronometragem completa) quando há sessão.
    live: isLive ? live.data : null,
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text) {
    const userMsg = text ?? input.trim()
    if (!userMsg || loading) return
    setInput('')
    setError(null)

    const newMessages = [...messages, { role: 'user', content: userMsg }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const reply = await askClaude(newMessages.map(m => ({ role: m.role, content: m.content })), context)
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (e) {
      if (e.message === 'NO_API_KEY') setNeedsKey(true)
      else setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-2xl glow-red"
        style={{ background: 'var(--color-f1)' }}
        aria-label={open ? 'Fechar PITWALL AI' : 'Abrir PITWALL AI'}
      >
        {open ? <X size={20} className="text-white" aria-hidden /> : <Bot size={20} className="text-white" aria-hidden />}
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-20 right-6 z-50 w-80 rounded-2xl overflow-hidden shadow-2xl"
            style={{ border: '1px solid var(--color-border-strong)', background: 'var(--color-surface)' }}
            role="dialog"
            aria-label="PITWALL AI"
          >
            {/* Header */}
            <div
              className="flex items-center gap-2 px-4 py-3 border-b"
              style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)' }}
            >
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--color-f1)' }}>
                <Bot size={13} className="text-white" aria-hidden />
              </div>
              <div>
                <div className="font-display font-bold text-sm text-text tracking-wider">PITWALL AI</div>
                <div className="text-[9px] text-text-mute">Powered by Claude</div>
              </div>
            </div>

            {needsKey ? (
              <ApiKeyInput onSave={k => { setApiKey(k); setNeedsKey(false) }} />
            ) : (
              <>
                {/* Messages */}
                <div className="h-72 overflow-y-auto p-3 space-y-3" aria-live="polite" aria-label="Mensagens">
                  {messages.length === 0 && (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: 'rgba(225,6,0,0.12)', border: '1px solid rgba(225,6,0,0.3)' }}
                          aria-hidden
                        >
                          <Bot size={12} className="text-red-500" />
                        </div>
                        <div
                          className="text-xs text-text-dim rounded-xl rounded-tl-sm p-3"
                          style={{ background: 'var(--color-surface-2)' }}
                        >
                          {isLive
                            ? 'Sessão AO VIVO no ar! Posso analisar setores, pneus, gaps e janelas de pit em tempo real.'
                            : 'Olá! Sou o PITWALL AI. Pergunte sobre pilotos, corridas, histórico ou o campeonato atual.'}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {(isLive ? LIVE_SUGGESTIONS : SUGGESTIONS).map(s => (
                          <button
                            key={s}
                            onClick={() => send(s)}
                            className="text-[10px] px-2 py-1 rounded-lg transition-colors hover:text-text"
                            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-mute)', border: '1px solid var(--color-border-strong)' }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((msg, i) => <Message key={i} msg={msg} />)}

                  {loading && (
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(225,6,0,0.12)' }}>
                        <Loader size={12} className="text-red-500 animate-spin" aria-hidden />
                      </div>
                      <div className="text-xs text-text-mute px-3 py-2 rounded-xl"
                        style={{ background: 'var(--color-surface-2)' }}>
                        Analisando…
                      </div>
                    </div>
                  )}

                  {error && <div className="text-[10px] text-red-400 px-2">{error}</div>}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="flex gap-2 p-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                    placeholder="Pergunte sobre F1…"
                    aria-label="Mensagem para o PITWALL AI"
                    className="flex-1 px-3 py-2 rounded-xl text-xs text-text outline-none"
                    style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-strong)' }}
                    disabled={loading}
                  />
                  <button
                    onClick={() => send()}
                    disabled={!input.trim() || loading}
                    aria-label="Enviar mensagem"
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
                    style={{ background: 'var(--color-f1)' }}
                  >
                    <Send size={13} className="text-white" aria-hidden />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

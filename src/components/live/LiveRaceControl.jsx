const FLAG_COLOR = {
  GREEN: '#22c55e', YELLOW: '#eab308', 'DOUBLE YELLOW': '#eab308',
  RED: '#ef4444', BLUE: '#3b82f6', CLEAR: '#22c55e', CHEQUERED: '#e8e8e8',
  BLACK: '#111', 'BLACK AND WHITE': '#aaa',
}
const CAT_DOT = { Flag: null, SafetyCar: '#f97316', Drs: '#22d3ee', Other: '#888', CarEvent: '#888' }

function hhmm(utc) {
  if (!utc) return ''
  const d = new Date(utc)
  return isNaN(d) ? '' : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function LiveRaceControl({ messages }) {
  if (!messages?.length) return <div className="text-text-mute text-sm">Sem mensagens.</div>
  return (
    <ul className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
      {messages.slice(0, 30).map((m, i) => {
        const dot = m.flag ? (FLAG_COLOR[m.flag] || '#888') : (CAT_DOT[m.category] ?? '#888')
        return (
          <li key={i} className="flex gap-2 text-xs leading-snug">
            <span className="num text-text-mute shrink-0 tabular-nums">{hhmm(m.utc)}</span>
            <span className="mt-1 shrink-0 w-2 h-2 rounded-full" style={{ background: dot }} aria-hidden />
            <span className="text-text">{m.message}</span>
          </li>
        )
      })}
    </ul>
  )
}

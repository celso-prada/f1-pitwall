import { extractPenalties } from '../../utils/live'
import { Gavel } from 'lucide-react'

// Decisões dos comissários (ROADMAP 3.2). Lê o race control já normalizado e
// destaca punições/investigações/advertências numa lista própria — durante a
// corrida é o que muda posição na marra, então merece um painel separado do
// fluxo geral de mensagens. `drivers` (opcional) resolve o nº do carro no TLA.
const TONE = {
  red:   { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)' },
  amber: { color: '#eab308', bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.22)' },
  green: { color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.22)' },
}

function hhmm(when) {
  if (!when) return ''
  const d = new Date(when)
  return isNaN(d) ? '' : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function StewardDecisions({ messages, drivers }) {
  const items = extractPenalties(messages)
  if (!items.length) {
    return <div className="text-text-mute text-sm py-2">Nenhuma decisão dos comissários até agora.</div>
  }

  const tlaByNum = {}
  for (const d of drivers ?? []) tlaByNum[String(d.num)] = { tla: d.tla, color: d.color }

  return (
    <ul className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
      {items.slice(0, 25).map((p, i) => {
        const tone = TONE[p.tone] ?? TONE.amber
        const driver = p.car ? tlaByNum[p.car] : null
        return (
          <li
            key={i}
            className="flex gap-2 px-2 py-1.5 rounded-lg text-xs leading-snug"
            style={{ background: tone.bg, border: `1px solid ${tone.border}` }}
          >
            <span className="num text-text-mute shrink-0 tabular-nums pt-0.5">{hhmm(p.when)}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className="num text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: tone.color + '22', color: tone.color }}
                >
                  {p.type}
                </span>
                {driver && (
                  <span className="font-display font-bold text-[11px] shrink-0" style={{ color: driver.color }}>
                    {driver.tla}
                  </span>
                )}
                {p.lap != null && <span className="num text-[9px] text-text-mute shrink-0">V{p.lap}</span>}
              </div>
              <span className="text-text-dim">{p.message}</span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

StewardDecisions.icon = Gavel

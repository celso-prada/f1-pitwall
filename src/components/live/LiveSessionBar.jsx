import { useEffect, useState } from 'react'
import { LiveBadge } from '../ui/LiveBadge'

function parseHMS(s) {
  if (!s) return 0
  const [h = 0, m = 0, sec = 0] = s.split(':').map(Number)
  return ((h * 60 + m) * 60 + sec) * 1000
}
function fmtHMS(ms) {
  if (ms <= 0) return '00:00'
  const t = Math.floor(ms / 1000)
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60
  const pad = n => String(n).padStart(2, '0')
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

// Relógio regressivo da sessão. O feed manda Remaining + Utc + Extrapolating;
// entre polls, extrapolamos localmente a cada segundo.
function useSessionClock(session) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!session?.extrapolating) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [session?.extrapolating, session?.clockUtc, session?.remaining])

  if (!session?.remaining) return null
  if (!session.extrapolating || !session.clockUtc) return fmtHMS(parseHMS(session.remaining))
  const elapsed = now - new Date(session.clockUtc).getTime()
  return fmtHMS(parseHMS(session.remaining) - elapsed)
}

export function LiveSessionBar({ session }) {
  const clock = useSessionClock(session)
  const flag = session.track

  return (
    <div
      className="card flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3"
      style={{ borderLeft: `4px solid ${flag.color}` }}
    >
      <LiveBadge />

      <div className="min-w-0">
        <div className="font-display font-bold text-lg text-text uppercase tracking-wide leading-none truncate">
          {session.gp}
        </div>
        <div className="text-xs text-text-mute uppercase tracking-widest mt-0.5">
          {session.name}{session.location ? ` · ${session.location}` : ''}
        </div>
      </div>

      {/* Bandeira / status de pista */}
      <span
        className="num text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded"
        style={{ background: `${flag.color}1f`, color: flag.color, border: `1px solid ${flag.color}40` }}
      >
        ● {flag.label}
      </span>

      {/* Fase da quali ou contador de voltas da corrida */}
      {session.partLabel && (
        <span className="num text-sm font-bold text-text px-2 py-1 rounded bg-surface-2/60">{session.partLabel}</span>
      )}
      {session.lap != null && session.totalLaps != null && (
        <span className="num text-sm font-bold text-text">VOLTA {session.lap}<span className="text-text-mute">/{session.totalLaps}</span></span>
      )}

      {/* Relógio regressivo */}
      {clock && (
        <span className="num text-2xl font-bold text-text ml-auto tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {clock}
        </span>
      )}
    </div>
  )
}

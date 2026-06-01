import { motion } from 'framer-motion'
import { Flag as FlagIcon, ShieldAlert, AlertTriangle, Octagon, Gauge } from 'lucide-react'

// Maps a derived track-status code to an icon + whether it should pulse.
function statusVisual(code) {
  switch (code) {
    case 'SC':        return { Icon: ShieldAlert, pulse: true,  tag: 'SC' }
    case 'VSC':       return { Icon: Gauge,       pulse: true,  tag: 'VSC' }
    case 'RED':       return { Icon: Octagon,     pulse: true,  tag: 'RED' }
    case 'YELLOW':    return { Icon: AlertTriangle, pulse: true, tag: 'YEL' }
    case 'CHEQUERED': return { Icon: FlagIcon,    pulse: false, tag: 'END' }
    case 'GREEN':     return { Icon: FlagIcon,    pulse: false, tag: 'GRN' }
    default:          return { Icon: FlagIcon,    pulse: false, tag: '—' }
  }
}

export function TrackStatusBanner({ status, sessionName, gp, lap, isLive }) {
  const { Icon, pulse } = statusVisual(status.code)
  const color = status.color

  return (
    <div
      className="relative flex items-center gap-3 rounded-xl px-4 py-2.5 overflow-hidden"
      style={{ background: `linear-gradient(90deg, ${color}22, var(--color-surface) 60%)`, border: `1px solid ${color}55` }}
    >
      {/* left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: color }} />

      <motion.div
        animate={pulse ? { opacity: [1, 0.35, 1] } : { opacity: 1 }}
        transition={pulse ? { duration: 1.1, repeat: Infinity } : {}}
        className="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0"
        style={{ background: color + '22', color, border: `1px solid ${color}55` }}
      >
        <Icon size={18} aria-hidden />
      </motion.div>

      <div className="flex-1 min-w-0">
        <div className="font-display font-bold uppercase tracking-wide leading-none text-sm" style={{ color }}>
          {status.label}
        </div>
        <div className="text-[10px] text-text-mute truncate mt-0.5">
          {gp} · {sessionName}
        </div>
      </div>

      {lap != null && (
        <div className="text-right flex-shrink-0">
          <div className="num font-black text-lg text-text leading-none">{lap}</div>
          <div className="text-[8px] text-text-mute uppercase tracking-widest">Volta</div>
        </div>
      )}

      {isLive && (
        <span className="flex items-center gap-1.5 flex-shrink-0 ml-1">
          <span className="w-2 h-2 rounded-full bg-f1 animate-pulse" style={{ background: '#e10600' }} />
          <span className="text-[9px] font-bold uppercase tracking-widest text-f1" style={{ color: '#e10600' }}>Ao vivo</span>
        </span>
      )}
    </div>
  )
}

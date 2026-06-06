import { motion, AnimatePresence } from 'framer-motion'
import { tyreOf, LAP_TONE_COLOR } from '../../utils/live'
import { MiniSectors } from './MiniSectors'

// Pneu compacto: círculo com a cor do composto + idade em voltas.
function Tyre({ compound, age, isNew }) {
  if (!compound) return <span className="text-text-mute text-xs">—</span>
  const t = tyreOf(compound)
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="num inline-flex items-center justify-center rounded-full text-[10px] font-bold"
        style={{ width: 18, height: 18, border: `2px solid ${t.color}`, color: t.color }}
      >{t.label}</span>
      {age != null && <span className="num text-[11px] text-text-mute">{age}{isNew ? '' : ''}v</span>}
    </span>
  )
}

function lastLapColor(ll) {
  if (ll.overallBest) return LAP_TONE_COLOR.overall
  if (ll.personalBest) return LAP_TONE_COLOR.personal
  return 'var(--color-text)'
}

function Row({ d, onSelect }) {
  const dim = d.knockedOut || d.retired || d.stopped
  return (
    <motion.button
      layout
      onClick={() => onSelect?.(d)}
      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
      className="w-full grid items-center gap-2 px-2 py-1.5 rounded-md text-left hover:bg-surface-2/60 transition-colors"
      style={{
        gridTemplateColumns: 'minmax(0,1.6fr) 44px 56px 60px minmax(0,1.1fr) minmax(0,1fr) auto 46px',
        opacity: dim ? 0.45 : 1,
        borderLeft: `3px solid ${d.color}`,
      }}
    >
      {/* Pos + piloto */}
      <span className="flex items-center gap-2 min-w-0">
        <span className="num text-sm font-bold text-text-mute w-5 text-right">{d.pos === 999 ? '–' : d.pos}</span>
        <span className="font-display font-bold text-sm text-text truncate">{d.tla}</span>
        {d.inPit && <span className="num text-[9px] px-1 rounded bg-amber-500/20 text-amber-400 font-bold">BOX</span>}
        {d.pitOut && <span className="num text-[9px] px-1 rounded bg-sky-500/20 text-sky-400 font-bold">OUT</span>}
        {d.cutoff && !d.knockedOut && <span className="num text-[9px] px-1 rounded bg-red-500/20 text-red-400 font-bold">CORTE</span>}
      </span>

      {/* Pneu */}
      <span className="flex justify-center"><Tyre compound={d.tyre} age={d.tyreAge} isNew={d.tyreNew} /></span>

      {/* Intervalo (carro à frente) */}
      <span className="num text-xs text-text-mute text-right tabular-nums">{d.gapToAhead || '—'}</span>

      {/* Gap ao líder */}
      <span className="num text-xs text-right tabular-nums" style={{ color: d.gapToLeader ? 'var(--color-text)' : 'var(--color-text-mute)' }}>
        {d.gapToLeader || '—'}
      </span>

      {/* Última volta */}
      <span className="num text-sm text-right tabular-nums font-semibold" style={{ color: lastLapColor(d.lastLap) }}>
        {d.lastLap.value || '—'}
      </span>

      {/* Melhor volta */}
      <span className="num text-xs text-right tabular-nums text-text-mute">{d.bestLap || '—'}</span>

      {/* Minisetores */}
      <span className="flex justify-center px-1"><MiniSectors sectors={d.sectors} /></span>

      {/* Speed trap */}
      <span className="num text-[11px] text-right tabular-nums" style={{ color: d.speedTrapBest ? LAP_TONE_COLOR.overall : 'var(--color-text-mute)' }}>
        {d.speedTrap ? `${d.speedTrap}` : '—'}
      </span>
    </motion.button>
  )
}

export function OfficialTower({ drivers, onSelect }) {
  if (!drivers?.length) return <div className="text-text-mute text-sm py-6 text-center">Sem dados de cronometragem.</div>
  return (
    <div>
      {/* Cabeçalho de colunas */}
      <div
        className="grid items-center gap-2 px-2 pb-1.5 mb-1 border-b border-white/5 text-[9px] uppercase tracking-widest text-text-mute font-semibold"
        style={{ gridTemplateColumns: 'minmax(0,1.6fr) 44px 56px 60px minmax(0,1.1fr) minmax(0,1fr) auto 46px' }}
      >
        <span>Piloto</span>
        <span className="text-center">Pneu</span>
        <span className="text-right">Int</span>
        <span className="text-right">Líder</span>
        <span className="text-right">Última</span>
        <span className="text-right">Melhor</span>
        <span className="text-center">Setores</span>
        <span className="text-right">Vmáx</span>
      </div>
      <AnimatePresence initial={false}>
        {drivers.map(d => <Row key={d.num} d={d} onSelect={onSelect} />)}
      </AnimatePresence>
    </div>
  )
}

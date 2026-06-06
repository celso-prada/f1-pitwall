import { motion, AnimatePresence } from 'framer-motion'
import { tyreOf, LAP_TONE_COLOR } from '../../utils/live'
import { MiniSectors } from './MiniSectors'

// Todas as colunas ficam sempre visíveis; em telas estreitas o usuário rola na
// horizontal (toque no celular, barra no PC). O grid usa larguras fixas + uma
// largura mínima no container interno, e o wrapper externo faz overflow-x-auto.
const GRID =
  'grid items-center gap-2 ' +
  'grid-cols-[150px_50px_60px_64px_86px_82px_minmax(180px,1fr)_54px]'

function Tyre({ compound, age }) {
  if (!compound) return <span className="text-text-mute text-xs">—</span>
  const t = tyreOf(compound)
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="num inline-flex items-center justify-center rounded-full text-[10px] font-bold shrink-0"
        style={{ width: 18, height: 18, border: `2px solid ${t.color}`, color: t.color }}
      >{t.label}</span>
      {age != null && <span className="num text-[10px] text-text-mute">{age}v</span>}
    </span>
  )
}

function lastLapColor(ll) {
  if (ll.overallBest) return LAP_TONE_COLOR.overall
  if (ll.personalBest) return LAP_TONE_COLOR.personal
  return 'var(--color-text)'
}

function Row({ d, onSelect, dropZone }) {
  const dim = d.knockedOut || d.retired || d.stopped
  return (
    <motion.button
      layout
      onClick={() => onSelect?.(d)}
      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
      className={`w-full ${GRID} px-2 py-1.5 rounded-md text-left hover:bg-surface-2/60 transition-colors`}
      style={{
        opacity: dim ? 0.45 : 1,
        borderLeft: `3px solid ${d.color}`,
        background: dropZone && !d.knockedOut ? 'rgba(239,68,68,0.07)' : undefined,
      }}
    >
      {/* Pos + piloto */}
      <span className="flex items-center gap-2 min-w-0">
        <span className="num text-sm font-bold text-text-mute w-5 text-right shrink-0">{d.pos === 999 ? '–' : d.pos}</span>
        <span className="font-display font-bold text-sm text-text truncate">{d.tla}</span>
        {d.inPit && <span className="num text-[9px] px-1 rounded bg-amber-500/20 text-amber-400 font-bold shrink-0">BOX</span>}
        {d.pitOut && <span className="num text-[9px] px-1 rounded bg-sky-500/20 text-sky-400 font-bold shrink-0">OUT</span>}
      </span>

      {/* Pneu */}
      <span className="flex justify-center"><Tyre compound={d.tyre} age={d.tyreAge} /></span>

      {/* Intervalo */}
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
        {d.speedTrap || '—'}
      </span>
    </motion.button>
  )
}

// Linha de corte da quali: Q1 elimina abaixo de P15, Q2 abaixo de P10.
function cutAfterFor(part) {
  if (part === 1) return 15
  if (part === 2) return 10
  return null
}

export function OfficialTower({ drivers, part, partLabel, onSelect }) {
  if (!drivers?.length) return <div className="text-text-mute text-sm py-6 text-center">Sem dados de cronometragem.</div>
  const cutAfter = cutAfterFor(part)

  return (
    // Rolagem horizontal: toque no celular, barra no PC.
    <div className="overflow-x-auto overscroll-x-contain">
      <div className="min-w-[780px]">
        {/* Cabeçalho de colunas */}
        <div className={`${GRID} px-2 pb-1.5 mb-1 border-b border-white/5 text-[9px] uppercase tracking-widest text-text-mute font-semibold`}>
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
          {drivers.map(d => (
            <div key={d.num}>
              <Row d={d} onSelect={onSelect} dropZone={cutAfter != null && d.pos > cutAfter} />
              {cutAfter != null && d.pos === cutAfter && (
                <div className="flex items-center gap-2 my-1 px-2 select-none">
                  <span className="h-px flex-1 bg-red-500/40" />
                  <span className="num text-[9px] uppercase tracking-widest text-red-400 font-bold">▼ Eliminação {partLabel}</span>
                  <span className="h-px flex-1 bg-red-500/40" />
                </div>
              )}
            </div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

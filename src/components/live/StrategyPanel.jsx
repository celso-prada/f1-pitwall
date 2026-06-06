import { analyzeStrategy, pitWindow, tyreOf } from '../../utils/live'
import { Swords, Timer } from 'lucide-react'

// Estratégia ao vivo (ROADMAP 5.2): disputas próximas (undercut/overcut) +
// janela de pit estimada. Tudo derivado da torre (pneu/idade/gap) — rotulado
// como estimativa, sem inventar dados.

function TyreBadge({ compound, age }) {
  if (!compound) return <span className="text-text-mute text-[10px]">—</span>
  const t = tyreOf(compound)
  return (
    <span className="inline-flex items-center gap-1">
      <span className="num inline-flex items-center justify-center rounded-full text-[9px] font-bold"
        style={{ width: 16, height: 16, border: `2px solid ${t.color}`, color: t.color }}>{t.label}</span>
      {age != null && <span className="num text-[10px] text-text-mute">{age}v</span>}
    </span>
  )
}

function Battle({ b }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: '#111' }}>
      <span className="num text-[10px] text-text-mute w-5 text-right shrink-0">P{b.pos}</span>
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <span className="font-display font-bold text-xs shrink-0" style={{ color: b.behind.color }}>{b.behind.tla}</span>
        <TyreBadge compound={b.behind.tyre} age={b.behind.age} />
        <span className="num text-[11px] tabular-nums text-text mx-1">+{b.gap.toFixed(1)}s</span>
        <span className="text-text-mute text-[10px]">→</span>
        <span className="font-display font-bold text-xs shrink-0" style={{ color: b.ahead.color }}>{b.ahead.tla}</span>
        <TyreBadge compound={b.ahead.tyre} age={b.ahead.age} />
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {b.drs && <span className="num text-[8px] font-bold px-1 rounded" style={{ background: 'rgba(34,211,238,0.15)', color: '#22d3ee' }}>DRS</span>}
        {b.canUndercut && <span className="num text-[8px] font-bold px-1 rounded" style={{ background: 'rgba(225,6,0,0.15)', color: 'var(--color-f1)' }}>UNDERCUT</span>}
      </div>
    </div>
  )
}

const WINDOW_TONE = {
  over:   { color: '#ef4444', label: 'além do ideal' },
  window: { color: '#eab308', label: 'na janela' },
}

export function StrategyPanel({ drivers }) {
  const battles = analyzeStrategy(drivers)
  const windows = (drivers ?? [])
    .map(d => ({ d, w: pitWindow(d) }))
    .filter(x => x.w && x.w.state !== 'fresh' && !x.d.retired && !x.d.knockedOut)
    .sort((a, b) => a.w.remaining - b.w.remaining)
    .slice(0, 8)

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-text-mute mb-1.5">
          <Swords size={11} aria-hidden /> Disputas na pista (≤2,5s)
        </div>
        {battles.length ? (
          <div className="space-y-1">{battles.slice(0, 8).map((b, i) => <Battle key={i} b={b} />)}</div>
        ) : (
          <div className="text-text-mute text-xs py-1">Sem disputas próximas no momento.</div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-text-mute mb-1.5">
          <Timer size={11} aria-hidden /> Janela de pit (estimativa)
        </div>
        {windows.length ? (
          <div className="flex flex-wrap gap-1.5">
            {windows.map(({ d, w }) => {
              const tone = WINDOW_TONE[w.state] ?? WINDOW_TONE.window
              return (
                <span key={d.num} className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px]"
                  style={{ background: tone.color + '14', border: `1px solid ${tone.color}33` }}>
                  <span className="font-display font-bold" style={{ color: d.color }}>{d.tla}</span>
                  <TyreBadge compound={d.tyre} age={d.tyreAge} />
                  <span style={{ color: tone.color }}>{tone.label}</span>
                </span>
              )
            })}
          </div>
        ) : (
          <div className="text-text-mute text-xs py-1">Ninguém na janela ainda.</div>
        )}
        <p className="text-[9px] text-text-mute mt-1.5">
          Vidas-base: macio ~18v · médio ~28v · duro ~40v. Só sinalização — pista e clima mudam tudo.
        </p>
      </div>
    </div>
  )
}

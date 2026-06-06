import { computeSessionBests, buildIdealComparison } from '../../api/livetiming'
import { LAP_TONE_COLOR } from '../../utils/live'

function SectorCard({ idx, owner }) {
  return (
    <div className="rounded-lg bg-surface-2/40 px-3 py-2 flex-1 min-w-0">
      <div className="text-[9px] uppercase tracking-widest text-text-mute">Setor {idx + 1}</div>
      {owner ? (
        <div className="flex items-baseline gap-2 mt-0.5">
          <span className="font-display font-bold text-sm shrink-0" style={{ color: owner.color }}>{owner.tla}</span>
          <span className="num text-sm tabular-nums" style={{ color: LAP_TONE_COLOR.overall }}>{owner.value}</span>
        </div>
      ) : <div className="text-text-mute text-sm mt-0.5">—</div>}
    </div>
  )
}

// Tabela detalhada (ROADMAP 4.2): por piloto, os 3 melhores setores pessoais, a
// volta ideal (soma) vs. a melhor volta real, e o Δ (tempo deixado na pista).
// Setor que é o melhor da SESSÃO fica roxo; o menor Δ (mais "redondo") em verde.
function IdealTable({ drivers, sectorOwners }) {
  const rows = buildIdealComparison(drivers)
  if (!rows.length) return null

  const ownerTla = sectorOwners.map(o => o?.tla ?? null)
  const minDelta = Math.min(...rows.filter(r => r.delta != null).map(r => r.delta), Infinity)

  const COL = 'grid items-center gap-2 grid-cols-[44px_repeat(3,1fr)_72px_72px_64px]'

  return (
    <div className="pt-1">
      <div className="text-[9px] uppercase tracking-widest text-text-mute mb-1.5">
        Volta ideal por piloto · Δ = tempo deixado na pista
      </div>
      <div className="overflow-x-auto overscroll-x-contain">
        <div className="min-w-[420px]">
          <div className={`${COL} px-1 pb-1 text-[9px] uppercase tracking-widest text-text-mute font-semibold`}>
            <span>Pil.</span>
            <span className="text-right">S1</span>
            <span className="text-right">S2</span>
            <span className="text-right">S3</span>
            <span className="text-right">Ideal</span>
            <span className="text-right">Melhor</span>
            <span className="text-right">Δ</span>
          </div>
          {rows.map(r => (
            <div key={r.num} className={`${COL} px-1 py-1 rounded hover:bg-surface-2/40`} style={{ borderLeft: `3px solid ${r.color}` }}>
              <span className="font-display font-bold text-xs" style={{ color: r.color }}>{r.tla}</span>
              {r.sectorStrs.map((s, i) => (
                <span
                  key={i}
                  className="num text-xs text-right tabular-nums"
                  style={{ color: ownerTla[i] === r.tla ? LAP_TONE_COLOR.overall : 'var(--color-text-dim)' }}
                >
                  {s}
                </span>
              ))}
              <span className="num text-xs text-right tabular-nums" style={{ color: LAP_TONE_COLOR.overall }}>{r.idealStr}</span>
              <span className="num text-xs text-right tabular-nums text-text">{r.bestStr}</span>
              <span
                className="num text-xs text-right tabular-nums font-semibold"
                style={{ color: r.delta != null && r.delta === minDelta ? LAP_TONE_COLOR.personal : 'var(--color-text-mute)' }}
              >
                {r.deltaStr}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function BestSectorsPanel({ drivers }) {
  const { sectorOwners, ideal, speedTrap } = computeSessionBests(drivers)

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        {sectorOwners.map((o, i) => <SectorCard key={i} idx={i} owner={o} />)}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[9px] uppercase tracking-widest text-text-mute">Volta Ideal (sessão)</div>
          <div className="num text-2xl font-bold tabular-nums" style={{ color: LAP_TONE_COLOR.overall }}>{ideal || '—'}</div>
        </div>

        {speedTrap.length > 0 && (
          <div className="min-w-0">
            <div className="text-[9px] uppercase tracking-widest text-text-mute mb-1">Speed Trap</div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {speedTrap.map((s, i) => (
                <span key={i} className="num text-xs tabular-nums flex items-center gap-1">
                  <span className="font-display font-bold" style={{ color: s.color }}>{s.tla}</span>
                  <span className="text-text">{s.v}</span>
                  <span className="text-text-mute text-[10px]">km/h</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <IdealTable drivers={drivers} sectorOwners={sectorOwners} />
    </div>
  )
}

import { computeSessionBests } from '../../api/livetiming'
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

export function BestSectorsPanel({ drivers }) {
  const { sectorOwners, ideal, speedTrap } = computeSessionBests(drivers)

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        {sectorOwners.map((o, i) => <SectorCard key={i} idx={i} owner={o} />)}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[9px] uppercase tracking-widest text-text-mute">Volta Ideal</div>
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
    </div>
  )
}

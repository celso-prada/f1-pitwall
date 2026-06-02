import { fmtLap } from '../../utils/live'

function StatRow({ label, value, unit }) {
  return (
    <div className="flex items-baseline justify-between py-1.5 border-b" style={{ borderColor: 'var(--color-border)' }}>
      <span className="text-[10px] text-neutral-500 uppercase tracking-wide">{label}</span>
      <span className="num text-sm font-bold text-text">
        {value}<span className="text-[10px] text-neutral-500 ml-0.5">{unit}</span>
      </span>
    </div>
  )
}

// Per-driver fastest-lap summary derived from car telemetry (see lapStats()).
export function LapStatsCard({ driver }) {
  const { acronym, team_name, color, lapTime, stats, headshot } = driver

  return (
    <div className="card p-4" style={{ borderTop: `2px solid ${color}` }}>
      <div className="flex items-center gap-3 mb-3">
        {headshot && (
          <img
            src={headshot} alt={acronym}
            className="w-10 h-10 rounded-full object-cover"
            style={{ border: `2px solid ${color}60` }}
            onError={e => { e.target.style.display = 'none' }}
          />
        )}
        <div className="min-w-0">
          <div className="font-display font-bold text-text uppercase tracking-wide" style={{ color }}>{acronym}</div>
          <div className="text-[10px] text-neutral-500 truncate">{team_name}</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[9px] text-neutral-600 uppercase tracking-wider">Volta rápida</div>
          <div className="num text-lg font-bold text-text leading-none">{fmtLap(lapTime)}</div>
        </div>
      </div>

      {stats ? (
        <div>
          <StatRow label="Vel. máxima" value={Math.round(stats.vmax)} unit="km/h" />
          <StatRow label="Acelerador pleno" value={stats.fullThrottlePct} unit="%" />
          <StatRow label="Tempo em frenagem" value={stats.brakingPct} unit="%" />
          <StatRow label="Uso de DRS" value={stats.drsPct} unit="%" />
          <StatRow label="Marcha média" value={stats.avgGear} unit="" />
        </div>
      ) : (
        <div className="text-[11px] text-neutral-600 py-4 text-center">Sem telemetria de carro</div>
      )}
    </div>
  )
}

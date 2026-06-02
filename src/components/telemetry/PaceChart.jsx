import { useMemo } from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import { fmtLap } from '../../utils/live'

// Lap-time lines per driver across the session. Pit/out laps and obvious
// outliers (SC laps) are dropped so the lines read as pure race pace.
function buildPace(drivers) {
  const rows = new Map()
  let min = Infinity, max = 0
  for (const d of drivers) {
    for (const l of d.laps ?? []) {
      const dur = l.lap_duration
      if (!dur || dur <= 0 || l.is_pit_out_lap) continue
      const row = rows.get(l.lap_number) ?? { lap: l.lap_number }
      row[d.number] = dur
      rows.set(l.lap_number, row)
      if (dur < min) min = dur
      if (dur > max) max = dur
    }
  }
  // Clamp the ceiling so a single safety-car lap doesn't flatten the chart.
  const ceiling = Math.min(max, min + 8)
  return {
    data: [...rows.values()].sort((a, b) => a.lap - b.lap),
    domain: min === Infinity ? [0, 100] : [Math.floor(min - 0.5), Math.ceil(ceiling + 0.5)],
  }
}

function PaceTooltip({ active, payload, label, drivers }) {
  if (!active || !payload?.length) return null
  return (
    <div className="px-3 py-2 rounded-lg text-[11px]" style={{ background: '#0a0a0a', border: '1px solid var(--color-border-strong)' }}>
      <div className="text-neutral-500 mb-1">Volta {label}</div>
      {payload
        .slice()
        .sort((a, b) => a.value - b.value)
        .map(p => {
          const d = drivers.find(x => String(x.number) === String(p.dataKey))
          return (
            <div key={p.dataKey} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
              <span className="font-bold" style={{ color: p.color }}>{d?.acronym ?? p.dataKey}</span>
              <span className="num text-text ml-auto">{fmtLap(p.value)}</span>
            </div>
          )
        })}
    </div>
  )
}

export function PaceChart({ drivers }) {
  const { data, domain } = useMemo(() => buildPace(drivers), [drivers])
  const active = drivers.filter(d => d.laps?.length)

  if (!data.length) {
    return (
      <div className="flex items-center justify-center py-12 text-neutral-600 text-xs">
        Sem dados de volta para esta seleção
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
        <CartesianGrid stroke="#1a1a1a" vertical={false} />
        <XAxis
          dataKey="lap" type="number" domain={['dataMin', 'dataMax']}
          tick={{ fill: '#555', fontSize: 10 }} stroke="#222"
          tickFormatter={l => `V${l}`}
        />
        <YAxis
          domain={domain} tick={{ fill: '#555', fontSize: 10 }} stroke="#222"
          width={52} tickFormatter={fmtLap}
        />
        <Tooltip content={<PaceTooltip drivers={active} />} />
        {active.map(d => (
          <Line
            key={d.number}
            dataKey={d.number}
            stroke={d.color} strokeWidth={1.6} dot={{ r: 1.5, fill: d.color }}
            activeDot={{ r: 4 }} connectNulls isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

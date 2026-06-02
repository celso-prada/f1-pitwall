import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
} from 'recharts'
import { fmtLap } from '../../utils/live'

// Metrics the user can flip between — same trace, broadcast-style switcher.
const METRICS = [
  { key: 'speed',    label: 'Velocidade', unit: 'km/h', domain: [0, 'dataMax + 20'] },
  { key: 'throttle', label: 'Acelerador', unit: '%',    domain: [0, 105] },
  { key: 'brake',    label: 'Freio',      unit: '%',    domain: [0, 105] },
  { key: 'gear',     label: 'Marcha',     unit: '',     domain: [0, 9] },
  { key: 'rpm',      label: 'RPM',        unit: '',      domain: [0, 'dataMax + 1000'] },
]

// Merge each driver's samples into one array keyed by elapsed time (0.1s buckets)
// so Recharts can overlay them on a shared x-axis despite different sampling.
function useMerged(drivers) {
  return useMemo(() => {
    const buckets = new Map()
    for (const d of drivers) {
      for (const s of d.samples ?? []) {
        const t = Math.round(s.t * 10) / 10
        const row = buckets.get(t) ?? { t }
        for (const m of METRICS) row[`${m.key}_${d.number}`] = s[m.key]
        buckets.set(t, row)
      }
    }
    return [...buckets.values()].sort((a, b) => a.t - b.t)
  }, [drivers])
}

function MetricTab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wide transition-all"
      style={{
        background: active ? 'rgba(225,6,0,0.12)' : 'transparent',
        color: active ? 'var(--color-f1)' : 'var(--color-text-mute)',
        border: `1px solid ${active ? 'rgba(225,6,0,0.35)' : 'transparent'}`,
      }}
    >
      {children}
    </button>
  )
}

function ChartTooltip({ active, payload, label, drivers, metric }) {
  if (!active || !payload?.length) return null
  return (
    <div className="px-3 py-2 rounded-lg text-[11px]" style={{ background: '#0a0a0a', border: '1px solid var(--color-border-strong)' }}>
      <div className="text-neutral-500 num mb-1">{label?.toFixed(1)}s</div>
      {drivers.map(d => {
        const v = payload.find(p => p.dataKey === `${metric.key}_${d.number}`)?.value
        if (v == null) return null
        return (
          <div key={d.number} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
            <span className="font-bold" style={{ color: d.color }}>{d.acronym}</span>
            <span className="num text-text ml-auto">{Math.round(v)}{metric.unit && ` ${metric.unit}`}</span>
          </div>
        )
      })}
    </div>
  )
}

export function TelemetryChart({ drivers }) {
  const [metricKey, setMetricKey] = useState('speed')
  const merged = useMerged(drivers)
  const metric = METRICS.find(m => m.key === metricKey)
  const active = drivers.filter(d => d.samples?.length)

  if (!active.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-neutral-600 gap-2">
        <span className="text-xs">Sem telemetria de carro para esta seleção</span>
        <span className="text-[10px] text-neutral-700">A OpenF1 cobre dados de pista a partir de 2023</span>
      </div>
    )
  }

  return (
    <div>
      {/* Metric switcher + driver legend with fastest-lap time */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex flex-wrap gap-1">
          {METRICS.map(m => (
            <MetricTab key={m.key} active={m.key === metricKey} onClick={() => setMetricKey(m.key)}>
              {m.label}
            </MetricTab>
          ))}
        </div>
        <div className="flex items-center gap-4 ml-auto">
          {active.map(d => (
            <div key={d.number} className="flex items-center gap-2">
              <span className="w-3 h-0.5 rounded" style={{ background: d.color }} />
              <span className="text-[11px] font-bold" style={{ color: d.color }}>{d.acronym}</span>
              {d.lapTime != null && (
                <span className="num text-[11px] text-neutral-400">{fmtLap(d.lapTime)}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={merged} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <CartesianGrid stroke="#1a1a1a" vertical={false} />
          <XAxis
            dataKey="t" type="number" domain={[0, 'dataMax']}
            tick={{ fill: '#555', fontSize: 10 }} stroke="#222"
            tickFormatter={t => `${Math.round(t)}s`}
          />
          <YAxis
            domain={metric.domain} tick={{ fill: '#555', fontSize: 10 }} stroke="#222"
            width={44} allowDecimals={false}
          />
          <Tooltip content={<ChartTooltip drivers={active} metric={metric} />} />
          {metric.key === 'gear' && [1,2,3,4,5,6,7,8].map(g => (
            <ReferenceLine key={g} y={g} stroke="#161616" />
          ))}
          {active.map(d => (
            <Line
              key={d.number}
              type={metric.key === 'gear' ? 'stepAfter' : 'monotone'}
              dataKey={`${metric.key}_${d.number}`}
              stroke={d.color} strokeWidth={1.8} dot={false}
              connectNulls isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <p className="text-[10px] text-neutral-600 mt-2 text-center">
        Telemetria da volta mais rápida de cada piloto · eixo X = tempo decorrido na volta
      </p>
    </div>
  )
}

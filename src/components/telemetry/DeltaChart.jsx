import { useMemo } from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
} from 'recharts'
import { lapDeltaSeries, stintDegradation } from '../../api/telemetry'

// Delta volta-a-volta entre os 2 pilotos comparados (ROADMAP 4.3). Acima de 0 =
// o piloto B foi ganhando tempo no acumulado; abaixo = o A. Linha cruzando 0 =
// troca de quem está mais rápido na média.
export function DeltaChart({ a, b }) {
  const data = useMemo(() => (a && b ? lapDeltaSeries(a.laps, b.laps) : []), [a, b])

  if (!a || !b) {
    return <div className="flex items-center justify-center py-10 text-neutral-600 text-xs">Selecione 2 pilotos (1 e 2) para o delta.</div>
  }
  if (data.length < 2) {
    return <div className="flex items-center justify-center py-10 text-neutral-600 text-xs">Sem voltas em comum suficientes.</div>
  }

  const vals = data.map(d => d.delta)
  const bound = Math.max(Math.abs(Math.min(...vals)), Math.abs(Math.max(...vals))) || 1

  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-2">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: a.color }} />
          <span className="font-display font-bold" style={{ color: a.color }}>{a.acronym}</span> abaixo</span>
        <span className="flex items-center gap-1.5"><span className="font-display font-bold" style={{ color: b.color }}>{b.acronym}</span> acima
          <span className="w-2 h-2 rounded-full" style={{ background: b.color }} /></span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          <CartesianGrid stroke="#1a1a1a" vertical={false} />
          <XAxis dataKey="lap" type="number" domain={['dataMin', 'dataMax']}
            tick={{ fill: '#555', fontSize: 10 }} stroke="#222" tickFormatter={l => `V${l}`} />
          <YAxis domain={[-bound, bound]} tick={{ fill: '#555', fontSize: 10 }} stroke="#222" width={48}
            tickFormatter={v => `${v > 0 ? '+' : ''}${v.toFixed(0)}s`} />
          <ReferenceLine y={0} stroke="#444" strokeDasharray="3 3" />
          <Tooltip
            contentStyle={{ background: '#0a0a0a', border: '1px solid var(--color-border-strong)', borderRadius: 8, fontSize: 12 }}
            labelFormatter={l => `Volta ${l}`}
            formatter={v => [`${v > 0 ? '+' : ''}${v.toFixed(3)}s`, `${a.acronym}−${b.acronym}`]}
          />
          <Line dataKey="delta" stroke="var(--color-f1)" strokeWidth={1.8} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// Degradação por stint (ROADMAP 4.3): inclinação do tempo de volta dentro de
// cada stint. Verde ~ estável, vermelho = degradando mais rápido.
function degTone(deg) {
  if (deg <= 0.05) return '#22c55e'
  if (deg <= 0.15) return '#eab308'
  return '#ef4444'
}

export function DegradationList({ drivers }) {
  const rows = drivers
    .map(d => ({ d, stints: stintDegradation(d.laps) }))
    .filter(x => x.stints.length)

  if (!rows.length) {
    return <div className="text-neutral-600 text-xs py-2">Sem stints longos o suficiente para medir degradação.</div>
  }

  return (
    <div className="space-y-2">
      {rows.map(({ d, stints }) => (
        <div key={d.number} className="flex items-center gap-2 flex-wrap">
          <span className="font-display font-bold text-xs w-10 shrink-0" style={{ color: d.color }}>{d.acronym}</span>
          {stints.map(s => (
            <span key={s.stint} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px]"
              style={{ background: '#111', border: '1px solid var(--color-border)' }}>
              <span className="text-text-mute">V{s.startLap}–{s.endLap}</span>
              <span className="num font-bold" style={{ color: degTone(s.degPerLap) }}>
                {s.degPerLap > 0 ? '+' : ''}{s.degPerLap.toFixed(2)}s/v
              </span>
            </span>
          ))}
        </div>
      ))}
      <p className="text-[9px] text-text-mute">Inclinação do tempo de volta no stint (descartando voltas de SC/tráfego).</p>
    </div>
  )
}

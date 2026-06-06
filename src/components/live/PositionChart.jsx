import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

// Evolução volta-a-volta da posição (estilo "spaghetti" de transmissão).
// Só faz sentido na corrida (LapSeries com histórico + LapCount presente).
export function PositionChart({ lapSeries, drivers }) {
  const nums = Object.keys(lapSeries || {})
  if (nums.length < 2) return <div className="text-text-mute text-sm">Sem histórico de posições ainda.</div>

  const byNum = Object.fromEntries(drivers.map(d => [d.num, d]))
  const maxLaps = Math.max(...nums.map(n => lapSeries[n].length))
  const data = []
  for (let i = 0; i < maxLaps; i++) {
    const row = { lap: i + 1 }
    for (const n of nums) row[n] = lapSeries[n][i] ?? null
    data.push(row)
  }

  return (
    <div style={{ width: '100%', height: 360 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 6, right: 28, bottom: 6, left: 0 }}>
          <XAxis dataKey="lap" stroke="var(--color-text-mute)" tick={{ fontSize: 10 }} tickLine={false} />
          <YAxis
            reversed domain={[1, nums.length]} allowDecimals={false}
            stroke="var(--color-text-mute)" tick={{ fontSize: 10 }} tickLine={false} width={28}
          />
          <Tooltip
            contentStyle={{ background: 'var(--color-surface, #161616)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
            labelFormatter={l => `Volta ${l}`}
            formatter={(v, n) => [`P${v}`, byNum[n]?.tla || n]}
          />
          {nums.map(n => (
            <Line
              key={n} type="monotone" dataKey={n}
              stroke={byNum[n]?.color || '#888'} strokeWidth={2}
              dot={false} isAnimationActive={false} connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

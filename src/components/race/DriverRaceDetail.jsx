import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

function StatPill({ label, value, color = '#999' }) {
  return (
    <div className="flex flex-col items-center px-3 py-2 rounded-lg" style={{ background: '#141414' }}>
      <span className="text-xs font-black" style={{ color }}>{value ?? '—'}</span>
      <span className="text-[9px] text-neutral-600 uppercase tracking-wider mt-0.5">{label}</span>
    </div>
  )
}

export function DriverRaceDetail({ result, race, laps, color }) {
  const driverNumber = result.Driver.driverId
  // Filter laps for this driver
  const driverLaps = laps?.filter(lap =>
    lap.Timings?.some(t => t.driverId === driverNumber)
  ) ?? []

  const lapData = driverLaps.map(lap => {
    const timing = lap.Timings?.find(t => t.driverId === driverNumber)
    const timeStr = timing?.time
    // parse "1:23.456" → ms
    let ms = null
    if (timeStr) {
      const parts = timeStr.split(':')
      if (parts.length === 2) {
        ms = parseFloat(parts[0]) * 60000 + parseFloat(parts[1]) * 1000
      }
    }
    return { lap: parseInt(lap.number), time: ms, pos: parseInt(timing?.position ?? 0) }
  }).filter(d => d.time && d.time < 200000) // filter outliers (pit laps, SC)

  const fl = result.FastestLap
  const teammate = race.Results?.find(r =>
    r.Constructor.constructorId === result.Constructor.constructorId &&
    r.Driver.driverId !== result.Driver.driverId
  )

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="space-y-3"
    >
      {/* Quick stats */}
      <div className="flex flex-wrap gap-2">
        <StatPill label="Grid" value={`P${result.grid}`} color={color} />
        <StatPill label="Chegada" value={`P${result.position}`} color={color} />
        <StatPill label="Pontos" value={result.points} color="#FFD700" />
        <StatPill label="Voltas" value={result.laps} />
        {fl && <StatPill label="Volta rápida" value={fl.Time?.time} color="#a78bfa" />}
        {fl && <StatPill label="Volta FL" value={fl.lap} color="#a78bfa" />}
        {teammate && (
          <StatPill
            label={`vs ${teammate.Driver.code}`}
            value={`P${teammate.position}`}
            color="#666"
          />
        )}
      </div>

      {/* Lap time chart */}
      {lapData.length > 2 && (
        <div>
          <div className="text-[10px] text-neutral-600 uppercase tracking-wider mb-2">
            Tempos de volta
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={lapData}>
              <CartesianGrid strokeDasharray="2 2" stroke="#1a1a1a" />
              <XAxis dataKey="lap" tick={{ fill: '#444', fontSize: 8 }} />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fill: '#444', fontSize: 8 }}
                tickFormatter={v => `${(v / 1000).toFixed(0)}s`}
              />
              <Tooltip
                contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, fontSize: 10 }}
                labelFormatter={l => `Volta ${l}`}
                formatter={v => [`${(v / 1000).toFixed(3)}s`, 'Tempo']}
              />
              <Line
                type="monotone"
                dataKey="time"
                stroke={color}
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* No lap data message */}
      {lapData.length <= 2 && (
        <p className="text-[10px] text-neutral-700">
          Dados de volta a volta não disponíveis para esta corrida.
        </p>
      )}
    </motion.div>
  )
}

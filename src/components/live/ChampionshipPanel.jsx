// Previsão de campeonato ao fim da corrida (ChampionshipPrediction do feed).
// Só corrida; renderiza apenas se o feed mandar os dados (durante quali/treino
// fica nulo e o painel nem aparece).
export function ChampionshipPanel({ championship, drivers }) {
  if (!championship?.length) return null
  const byNum = Object.fromEntries(drivers.map(d => [d.num, d]))

  return (
    <ul className="space-y-1">
      {championship.slice(0, 10).map((r) => {
        const d = byNum[r.num] || {}
        const delta = r.currentPos != null && r.predictedPos != null ? r.currentPos - r.predictedPos : 0
        return (
          <li key={r.num} className="flex items-center gap-2 text-sm">
            <span className="num text-text-mute w-5 text-right">{r.predictedPos ?? '–'}</span>
            <span className="font-display font-bold w-10" style={{ color: d.color || 'var(--color-text)' }}>{d.tla || `#${r.num}`}</span>
            <span className="num tabular-nums text-text ml-auto">{r.predictedPoints} pts</span>
            {delta !== 0 && (
              <span className={`num text-[10px] tabular-nums w-8 text-right ${delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {delta > 0 ? `▲${delta}` : `▼${Math.abs(delta)}`}
              </span>
            )}
            {delta === 0 && <span className="w-8" />}
          </li>
        )
      })}
    </ul>
  )
}

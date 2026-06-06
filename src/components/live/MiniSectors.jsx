// Barras de minisetor estilo F1 TV: cada setor é uma fileira de segmentos
// coloridos (roxo=melhor geral, verde=melhor pessoal, amarelo=percorrido,
// cinza=ainda não atingido).
const TONE = {
  purple: '#b14be8',
  green: '#22c55e',
  yellow: '#eab308',
  none: 'var(--color-surface-2, #2a2a2a)',
}

export function MiniSectors({ sectors }) {
  if (!sectors?.length) return <span className="text-text-mute text-xs">—</span>
  return (
    <div className="flex items-center gap-1.5">
      {sectors.map((s, i) => (
        <div key={i} className="flex items-center gap-[2px]" title={s.value || ''}>
          {(s.segments.length ? s.segments : [s.overallBest ? 'purple' : s.personalBest ? 'green' : 'none']).map((tone, j) => (
            <span
              key={j}
              className="inline-block rounded-[1px]"
              style={{ width: 5, height: 8, background: TONE[tone] || TONE.none }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Swords, ChevronDown } from 'lucide-react'
import { getDriverStandings, getDriverResults } from '../api/jolpica'
import { getTeamColor } from '../utils/teamColors'
import { summarizeSeason, headToHead } from '../utils/h2h'
import { PageShell } from '../components/ui/PageShell'
import { Skeleton } from '../components/ui/Skeleton'

function driverColor(s) {
  return getTeamColor(s?.Constructors?.[0]?.name)
}
function driverName(s) {
  return s?.Driver ? `${s.Driver.givenName} ${s.Driver.familyName}` : ''
}

function DriverSelect({ standings, value, onChange, exclude, align = 'left' }) {
  return (
    <div className="relative w-full">
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        className={`appearance-none w-full num text-sm font-semibold text-text pl-3 pr-9 py-2.5 rounded-lg cursor-pointer focus:outline-none ${align === 'right' ? 'text-right pr-3 pl-9' : ''}`}
        style={{ background: '#0d0d0d', border: '1px solid var(--color-border-strong)' }}
      >
        <option value="" style={{ background: '#0d0d0d' }}>Selecione…</option>
        {standings.map(s => (
          <option key={s.Driver.driverId} value={s.Driver.driverId} disabled={s.Driver.driverId === exclude} style={{ background: '#0d0d0d' }}>
            {driverName(s)}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className={`absolute top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500 ${align === 'right' ? 'left-3' : 'right-3'}`} />
    </div>
  )
}

// Linha de comparação: destaca o lado melhor. Para chegada média / melhor
// resultado, MENOR é melhor; para o resto, MAIOR.
function StatRow({ label, a, b, lowerBetter = false, fmt = (v) => v }) {
  const na = a == null ? null : Number(a)
  const nb = b == null ? null : Number(b)
  let aWins = false, bWins = false
  if (na != null && nb != null && na !== nb) {
    const aBetter = lowerBetter ? na < nb : na > nb
    aWins = aBetter; bWins = !aBetter
  }
  const cell = (win) => ({
    color: win ? 'var(--color-text)' : 'var(--color-text-mute)',
    fontWeight: win ? 800 : 500,
  })
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2 border-b border-white/5">
      <div className="num text-lg tabular-nums text-left" style={cell(aWins)}>{a == null ? '—' : fmt(a)}</div>
      <div className="text-[10px] uppercase tracking-widest text-text-mute text-center px-2">{label}</div>
      <div className="num text-lg tabular-nums text-right" style={cell(bWins)}>{b == null ? '—' : fmt(b)}</div>
    </div>
  )
}

function H2HBadge({ label, a, b, colorA, colorB }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] uppercase tracking-widest text-text-mute">{label}</span>
      <div className="num text-2xl font-bold tabular-nums flex items-center gap-2">
        <span style={{ color: a >= b ? colorA : 'var(--color-text-mute)' }}>{a}</span>
        <span className="text-text-mute text-base">×</span>
        <span style={{ color: b >= a ? colorB : 'var(--color-text-mute)' }}>{b}</span>
      </div>
    </div>
  )
}

function useSeason(driverId) {
  return useQuery({
    queryKey: ['driverResults', driverId, 'current'],
    queryFn: () => getDriverResults(driverId, 'current'),
    enabled: !!driverId,
    staleTime: 300_000,
  })
}

export function ComparePage() {
  const { data: standings } = useQuery({
    queryKey: ['driverStandings', 'current'],
    queryFn: () => getDriverStandings('current'),
    staleTime: 300_000,
  })
  const list = standings ?? []

  const [idA, setIdA] = useState(null)
  const [idB, setIdB] = useState(null)
  // Default aos 2 primeiros do campeonato (derivado, sem efeito).
  const a = idA ?? list[0]?.Driver?.driverId ?? null
  const b = idB ?? list[1]?.Driver?.driverId ?? null

  const sA = list.find(s => s.Driver.driverId === a)
  const sB = list.find(s => s.Driver.driverId === b)
  const colorA = driverColor(sA)
  const colorB = driverColor(sB)

  const resA = useSeason(a)
  const resB = useSeason(b)
  const loading = resA.isLoading || resB.isLoading

  const sumA = summarizeSeason(resA.data)
  const sumB = summarizeSeason(resB.data)
  const h2h = headToHead(resA.data, resB.data)

  return (
    <PageShell
      title="Head to Head"
      subtitle="Comparação direta de pilotos na temporada atual"
      actions={<Swords size={20} style={{ color: 'var(--color-f1)' }} />}
    >
      {!list.length ? (
        <Skeleton height={320} rounded={12} />
      ) : (
        <div className="card p-4 sm:p-6 space-y-5">
          {/* Seletores + cabeçalho dos dois pilotos */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="space-y-2">
              <DriverSelect standings={list} value={a} onChange={setIdA} exclude={b} />
              <div className="text-left">
                <div className="font-display font-bold uppercase tracking-wide leading-tight" style={{ color: colorA }}>{driverName(sA)}</div>
                <div className="text-xs text-text-mute">{sA?.Constructors?.[0]?.name}</div>
              </div>
            </div>
            <div className="font-display font-black text-text-mute text-lg">VS</div>
            <div className="space-y-2">
              <DriverSelect standings={list} value={b} onChange={setIdB} exclude={a} align="right" />
              <div className="text-right">
                <div className="font-display font-bold uppercase tracking-wide leading-tight" style={{ color: colorB }}>{driverName(sB)}</div>
                <div className="text-xs text-text-mute">{sB?.Constructors?.[0]?.name}</div>
              </div>
            </div>
          </div>

          {loading ? (
            <Skeleton height={260} rounded={8} />
          ) : (
            <>
              {/* Confronto direto */}
              <div className="flex items-center justify-around gap-4 py-3 rounded-lg" style={{ background: 'var(--color-surface-2)' }}>
                <H2HBadge label={`Corrida (${h2h.shared} GPs)`} a={h2h.race.a} b={h2h.race.b} colorA={colorA} colorB={colorB} />
                <div className="w-px h-10 bg-white/10" />
                <H2HBadge label="Classificação" a={h2h.quali.a} b={h2h.quali.b} colorA={colorA} colorB={colorB} />
              </div>

              {/* Estatísticas lado a lado */}
              <div>
                <StatRow label="Pontos" a={sumA.points} b={sumB.points} />
                <StatRow label="Vitórias" a={sumA.wins} b={sumB.wins} />
                <StatRow label="Pódios" a={sumA.podiums} b={sumB.podiums} />
                <StatRow label="Poles" a={sumA.poles} b={sumB.poles} />
                <StatRow label="Melhor result." a={sumA.bestFinish} b={sumB.bestFinish} lowerBetter fmt={v => `P${v}`} />
                <StatRow label="Chegada média" a={sumA.avgFinish} b={sumB.avgFinish} lowerBetter />
                <StatRow label="Abandonos" a={sumA.dnfs} b={sumB.dnfs} lowerBetter />
              </div>
            </>
          )}
        </div>
      )}
    </PageShell>
  )
}

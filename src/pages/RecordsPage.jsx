import { useQuery, useQueries } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'
import { Trophy, TrendingUp, Crown, Flag, Users } from 'lucide-react'
import { getDriverStandings, getDriverResults } from '../api/jolpica'
import { getTeamColor } from '../utils/teamColors'
import { buildProgression, seasonHighlights } from '../utils/season'
import { PageShell } from '../components/ui/PageShell'
import { Skeleton } from '../components/ui/Skeleton'
import { Panel } from '../components/ui/Panel'

const TOP_N = 6 // pilotos no gráfico de progressão

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: (color ?? '#888') + '1f' }}>
        <Icon size={18} style={{ color: color ?? 'var(--color-text-dim)' }} />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-text-mute">{label}</div>
        <div className="font-display font-bold text-text truncate">{value}</div>
        {sub && <div className="text-xs text-text-mute truncate">{sub}</div>}
      </div>
    </div>
  )
}

function ProgressionChart({ data, drivers }) {
  if (!data.length) return <Skeleton height={360} rounded={8} />
  return (
    <div style={{ width: '100%', height: 380 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 6, right: 24, bottom: 6, left: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="round" stroke="var(--color-text-mute)" tick={{ fontSize: 10 }} tickLine={false}
            tickFormatter={r => `R${r}`} />
          <YAxis stroke="var(--color-text-mute)" tick={{ fontSize: 10 }} tickLine={false} width={32} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: 'var(--color-surface, #161616)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
            labelFormatter={r => `Rodada ${r}`}
          />
          {drivers.map(d => (
            <Line key={d.key} type="monotone" dataKey={d.key} name={d.key}
              stroke={d.color} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 justify-center">
        {drivers.map(d => (
          <span key={d.key} className="flex items-center gap-1.5 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
            <span className="font-display font-bold" style={{ color: d.color }}>{d.key}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export function RecordsPage() {
  const { data: standings } = useQuery({
    queryKey: ['driverStandings', 'current'],
    queryFn: () => getDriverStandings('current'),
    staleTime: 300_000,
  })
  const list = standings ?? []
  const top = list.slice(0, TOP_N)

  // Resultados dos top-N em paralelo (cada um com fallback Jolpica→f1api).
  const results = useQueries({
    queries: top.map(s => ({
      queryKey: ['driverResults', s.Driver.driverId, 'current'],
      queryFn: () => getDriverResults(s.Driver.driverId, 'current'),
      staleTime: 300_000,
    })),
  })

  const loadingResults = results.some(r => r.isLoading)
  const progDrivers = top.map((s, i) => ({
    key: s.Driver.code || s.Driver.familyName?.slice(0, 3).toUpperCase() || s.Driver.driverId,
    color: getTeamColor(s.Constructors?.[0]?.name),
    races: results[i]?.data ?? [],
  }))
  const progression = loadingResults ? [] : buildProgression(progDrivers)

  const h = seasonHighlights(list)
  const leaderName = h?.leader?.Driver ? `${h.leader.Driver.givenName} ${h.leader.Driver.familyName}` : '—'
  const mostWinsName = h?.mostWins?.Driver ? `${h.mostWins.Driver.givenName} ${h.mostWins.Driver.familyName}` : '—'

  return (
    <PageShell title="Recordes & Progressão" subtitle="Estatísticas da temporada atual"
      actions={<Trophy size={20} style={{ color: 'var(--color-f1)' }} />}>
      {!list.length ? (
        <div className="space-y-4">
          <Skeleton height={88} rounded={12} />
          <Skeleton height={380} rounded={12} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <StatCard icon={Crown} label="Líder" value={leaderName}
              sub={`${h.leader.points} pts`} color={getTeamColor(h.leader.Constructors?.[0]?.name)} />
            <StatCard icon={TrendingUp} label="Vantagem p/ 2º"
              value={h.gapToSecond != null ? `${h.gapToSecond} pts` : '—'} />
            <StatCard icon={Flag} label="Mais vitórias" value={mostWinsName}
              sub={`${h.mostWins.wins} ${Number(h.mostWins.wins) === 1 ? 'vitória' : 'vitórias'}`}
              color={getTeamColor(h.mostWins.Constructors?.[0]?.name)} />
            <StatCard icon={Users} label="Pilotos pontuando" value={`${h.driversScored}`}
              sub={`${h.totalWins} vitórias no total`} />
          </div>

          <Panel title="Progressão do Campeonato" icon={<TrendingUp size={12} aria-hidden />} padding="p-4">
            <p className="text-[11px] text-neutral-500 -mt-1 mb-3">
              Pontos acumulados rodada a rodada — top {TOP_N} do campeonato. Linhas que se cruzam = troca de posição na tabela.
            </p>
            <ProgressionChart data={progression} drivers={progDrivers} />
          </Panel>
        </div>
      )}
    </PageShell>
  )
}

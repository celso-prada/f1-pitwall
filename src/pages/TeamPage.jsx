import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { getConstructorStandings, getConstructorRaces } from '../api/jolpica'
import { getWikipediaDriverData } from '../api/wikipedia'
import { getTeamColor } from '../utils/teamColors'
import { getCarImage, CARBON_BG } from '../utils/images'
import { formatDate } from '../utils/format'
import { Skeleton } from '../components/ui/Skeleton'
import { PageShell } from '../components/ui/PageShell'
import { Panel } from '../components/ui/Panel'
import { Stat } from '../components/ui/Stat'
import { ArrowLeft, Trophy, BookOpen, ExternalLink } from 'lucide-react'

export function TeamPage() {
  const { constructorId } = useParams()
  const navigate = useNavigate()

  const { data: allStandings, isLoading } = useQuery({
    queryKey: ['constructorStandings', 'current'],
    queryFn: () => getConstructorStandings('current'),
    staleTime: 300_000,
  })
  const { data: races } = useQuery({
    queryKey: ['constructorRaces', constructorId],
    queryFn: () => getConstructorRaces(constructorId),
    enabled: !!constructorId,
  })

  const standing    = allStandings?.find(s => s.Constructor.constructorId === constructorId)
  const constructor = standing?.Constructor
  const color       = getTeamColor(constructor?.name)
  const carImageUrl = getCarImage(constructorId)

  // Bio da equipe pela Wikipedia (ROADMAP 6.3) — mesma rota usada nos pilotos
  // (extract PT-BR + logo). constructor.url é o artigo EN da Ergast/Jolpica.
  const { data: wikiTeam } = useQuery({
    queryKey: ['wikiTeam', constructorId],
    queryFn: () => getWikipediaDriverData(constructor?.url),
    enabled: !!constructor?.url,
    staleTime: 86_400_000,
  })

  if (isLoading) {
    return (
      <PageShell>
        <Skeleton height={180} rounded={16} />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={90} rounded={12} />)}
        </div>
      </PageShell>
    )
  }

  if (!constructor) {
    return (
      <PageShell>
        <div className="text-center text-text-mute py-20">Equipe não encontrada</div>
      </PageShell>
    )
  }

  const recentRaces = [...(races ?? [])].reverse().slice(0, 8)

  return (
    <PageShell>
      <button
        onClick={() => navigate(-1)}
        aria-label="Voltar"
        className="flex items-center gap-1.5 text-text-mute hover:text-text text-sm transition-colors"
      >
        <ArrowLeft size={16} aria-hidden /> Voltar
      </button>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden p-8"
        style={{
          background: `linear-gradient(135deg, var(--color-surface) 0%, ${color}10 100%)`,
          border: `1px solid ${color}28`,
          minHeight: 160,
        }}
      >
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ background: `radial-gradient(ellipse at right, ${color}, transparent 60%)` }} />

        {/* Car image background */}
        {carImageUrl && (
          <div
            className="absolute right-0 top-0 bottom-0 w-3/5"
            style={{
              backgroundImage: `url(${carImageUrl})`,
              backgroundSize: 'contain',
              backgroundPosition: 'center right',
              backgroundRepeat: 'no-repeat',
              opacity: 0.22,
            }}
          />
        )}

        <div className="relative flex items-center justify-between">
          <div>
            <div className="text-[9px] text-text-mute uppercase tracking-wider mb-2">{constructor.nationality}</div>
            <h1 className="font-display font-bold text-4xl text-text uppercase mb-2">{constructor.name}</h1>
            <a
              href={constructor.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs hover:underline"
              style={{ color }}
            >
              Wikipedia →
            </a>
          </div>
          <div className="text-right hidden sm:block">
            <div className="font-display font-bold text-6xl uppercase" style={{ color }}>P{standing?.position}</div>
            <div className="text-[9px] text-text-mute mt-1 uppercase tracking-wide">Construtores</div>
          </div>
        </div>
      </motion.div>

      {/* Car image */}
      {carImageUrl && (
        <div
          className="relative rounded-2xl overflow-hidden flex items-center justify-center"
          style={{
            border: `1px solid ${color}22`,
            background: `var(--color-bg)`,
            backgroundImage: `url(${CARBON_BG})`,
            backgroundSize: 'cover',
            backgroundBlendMode: 'overlay',
          }}
        >
          <img
            src={carImageUrl}
            alt={`${constructor.name} F1 car`}
            className="w-full object-contain py-4"
            style={{ maxHeight: 280 }}
            onError={e => { e.target.parentElement.style.display = 'none' }}
          />
          <div className="absolute inset-0 pointer-events-none rounded-2xl"
            style={{ boxShadow: `inset 0 0 60px var(--color-bg)` }} />
          <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
            style={{ background: `linear-gradient(to top, ${color}12, transparent)` }} />
        </div>
      )}

      {/* Stats + recent results side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Stats column */}
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Pontos"  value={standing?.points}            color="var(--color-gold)" />
            <Stat label="Posição" value={`P${standing?.position}`}    color={color} />
            <Stat label="Corridas" value={races?.length}              color="var(--color-text)" />
          </div>
        </div>

        {/* Recent results */}
        {recentRaces.length > 0 && (
          <Panel title="Resultados Recentes" icon={<Trophy size={13} aria-hidden />}>
            <div className="space-y-1.5 mt-2">
              {recentRaces.map((race, i) => {
                const top = race.Results?.slice(0, 2) ?? []
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 py-1.5 px-2 rounded-lg cursor-pointer transition-colors hover:bg-[var(--color-surface-2)]"
                    onClick={() => navigate(`/race/${race.season}/${race.round}`)}
                  >
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-text">
                        {race.raceName?.replace(' Grand Prix', ' GP')}
                      </div>
                      <div className="num text-[9px] text-text-mute">{formatDate(race.date)}</div>
                    </div>
                    <div className="flex gap-3">
                      {top.map(r => (
                        <div key={r.Driver.driverId} className="text-right">
                          <div className="num text-xs font-bold" style={{ color }}>P{r.position}</div>
                          <div className="text-[9px] text-text-mute">{r.Driver.code}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </Panel>
        )}
      </div>

      {/* Bio da equipe (Wikipedia) */}
      {wikiTeam?.extract && (
        <Panel title="Sobre a Equipe" icon={<BookOpen size={13} aria-hidden />}>
          <div className="flex flex-col sm:flex-row gap-4 mt-2">
            {wikiTeam.photo && (
              <img
                src={wikiTeam.photo}
                alt={constructor.name}
                className="w-full sm:w-40 h-32 object-contain rounded-lg shrink-0 bg-white/5 p-2"
                onError={e => { e.target.style.display = 'none' }}
              />
            )}
            <div className="min-w-0">
              <p className="text-sm text-text-dim leading-relaxed">{wikiTeam.extract}</p>
              {constructor.url && (
                <a
                  href={constructor.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs mt-2 hover:underline"
                  style={{ color }}
                >
                  <ExternalLink size={10} aria-hidden /> Leia mais na Wikipedia
                </a>
              )}
            </div>
          </div>
        </Panel>
      )}
    </PageShell>
  )
}

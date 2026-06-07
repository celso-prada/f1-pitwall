import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { getQualifyingResults, getLapTimes, getCalendar } from '../api/jolpica'
import { useRaceResults } from '../hooks/useStandings'
import { getTeamColor } from '../utils/teamColors'
import { getCircuitImage } from '../utils/images'
import { formatDate, cleanRaceName } from '../utils/format'
import { RaceTable } from '../components/race/RaceTable'
import { PositionChangeChart } from '../components/race/LapChart'
import { CircuitWinners } from '../components/race/CircuitWinners'
import { Panel } from '../components/ui/Panel'
import { PageShell } from '../components/ui/PageShell'
import { Skeleton } from '../components/ui/Skeleton'
import { ArrowLeft, Trophy, BarChart2, List, MapPin, Clock } from 'lucide-react'

function PodiumBlock({ race, winnerColor }) {
  if (!race?.Results) return null
  const top3    = race.Results.slice(0, 3)
  const medals  = ['🥇', '🥈', '🥉']
  const heights = [100, 72, 58]
  const order   = [1, 0, 2]

  return (
    <div className="flex items-end justify-center gap-2 sm:gap-3 py-4 sm:py-6"
      style={{ borderTop: `1px solid ${winnerColor ?? 'var(--color-border)'}18` }}>
      {order.map(idx => {
        const r = top3[idx]
        if (!r) return null
        const color = getTeamColor(r.Constructor.name)
        return (
          <div key={idx} className="flex flex-col items-center gap-1.5 w-[30%] max-w-[7rem]">
            <div className="text-xl sm:text-2xl">{medals[idx]}</div>
            <div className="num text-xs sm:text-sm font-black text-text text-center">{r.Driver.code}</div>
            <div className="text-[9px] text-center leading-tight" style={{ color }}>{r.Constructor.name}</div>
            <div
              className="w-full rounded-t-xl flex flex-col items-center justify-end pb-3 relative overflow-hidden"
              style={{
                height:     heights[idx],
                background: `linear-gradient(to top, ${color}28, ${color}08)`,
                border:     `1px solid ${color}35`,
              }}
            >
              <span className="num text-text font-black text-xl">{idx + 1}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function QualifyingTable({ quali }) {
  if (!quali?.QualifyingResults?.length) return null
  const results = quali.QualifyingResults.slice(0, 10)

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-xs min-w-[340px]">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
            {['P', 'Piloto', 'Equipe', 'Q1', 'Q2', 'Q3'].map(h => (
              <th key={h} className="text-left py-1.5 px-2 section-title whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map(r => {
            const color = getTeamColor(r.Constructor.name)
            return (
              <tr key={r.Driver.driverId} style={{ borderBottom: '1px solid var(--color-border-mute)' }}>
                <td className="py-1.5 px-2 num font-bold text-text-mute">{r.position}</td>
                <td className="py-1.5 px-2 num font-semibold text-text">{r.Driver.code}</td>
                <td className="py-1.5 px-2 text-[10px]" style={{ color: color + 'cc' }}>{r.Constructor.name}</td>
                <td className="py-1.5 px-2 num text-text-mute whitespace-nowrap">{r.Q1 || '—'}</td>
                <td className="py-1.5 px-2 num text-text-mute whitespace-nowrap">{r.Q2 || '—'}</td>
                <td className="py-1.5 px-2 num text-text-dim whitespace-nowrap">{r.Q3 || '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function RacePage() {
  const { season, round } = useParams()
  const navigate = useNavigate()
  const [view, setView] = useState('results')

  const { data: race, isLoading: raceLoading } = useRaceResults(season, round)
  // Metadados do calendário — base para o modo degradado (quando o resultado
  // ainda não existe, mostramos circuito/data em vez de "não encontrada").
  const { data: calendar } = useQuery({
    queryKey: ['calendar', 'current'], queryFn: () => getCalendar('current'), staleTime: 3_600_000,
  })
  const { data: quali } = useQuery({
    queryKey: ['qualifying', season, round],
    queryFn: () => getQualifyingResults(season, round),
    staleTime: 3_600_000,
  })
  const { data: laps } = useQuery({
    queryKey: ['lapTimes', season, round],
    queryFn: () => getLapTimes(season, round),
    staleTime: 3_600_000,
    enabled: view === 'laps',
  })

  if (raceLoading) {
    return (
      <PageShell>
        <Skeleton height={260} rounded={16} />
        <Skeleton height={400} rounded={16} />
      </PageShell>
    )
  }

  if (!race) {
    // Modo degradado: sem resultado disponível (corrida futura ou todas as fontes
    // fora). Em vez de um vazio, mostramos o circuito (imagem já cadastrada) e os
    // dados básicos do calendário, com link para a página do circuito.
    const meta = (calendar ?? []).find(r => String(r.round) === String(round))
    const img = getCircuitImage(meta?.Circuit?.circuitId)
    return (
      <PageShell>
        <button
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          className="flex items-center gap-1.5 text-text-mute hover:text-text text-sm transition-colors"
        >
          <ArrowLeft size={16} aria-hidden /> Voltar
        </button>
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
          {img && (
            <div className="w-full flex items-center justify-center" style={{ background: 'var(--color-bg)', minHeight: 160 }}>
              <img src={img} alt="" aria-hidden className="max-h-52 w-full object-contain p-5"
                onError={e => { e.target.parentElement.style.display = 'none' }} />
            </div>
          )}
          <div className="p-5 text-center">
            <h1 className="font-display font-bold text-xl sm:text-2xl text-text uppercase">
              {cleanRaceName(meta?.raceName) ?? `Round ${round}`}
            </h1>
            {meta && (
              <p className="text-xs text-text-mute mt-1">
                {meta.Circuit?.Location?.locality}{meta.Circuit?.Location?.country ? `, ${meta.Circuit.Location.country}` : ''} · {formatDate(meta.date)}
              </p>
            )}
            <p className="text-sm text-text-mute mt-4">Resultado ainda não disponível.</p>
            {meta?.Circuit?.circuitId && (
              <button
                onClick={() => navigate(`/circuit/${meta.Circuit.circuitId}`)}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--color-f1)', color: 'white' }}
              >
                Ver o circuito
              </button>
            )}
          </div>
        </div>
      </PageShell>
    )
  }

  const circuit        = race.Circuit
  const winner         = race.Results?.[0]
  const winnerColor    = winner ? getTeamColor(winner.Constructor.name) : 'var(--color-f1)'
  const circuitImageUrl = getCircuitImage(circuit?.circuitId)

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
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: `linear-gradient(135deg, var(--color-surface) 0%, ${winnerColor}08 100%)`,
          border:     `1px solid ${winnerColor}18`,
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${winnerColor}, transparent)` }} />

        {/* Imagem do circuito — banner proeminente no TOPO (igual à página do
            circuito, para corridas já realizadas). */}
        {circuitImageUrl && (
          <div
            className="w-full flex items-center justify-center"
            style={{
              background: 'var(--color-bg)',
              borderBottom: '1px solid var(--color-border-mute)',
              minHeight: 160,
            }}
          >
            <img
              src={circuitImageUrl}
              alt={`${circuit?.circuitName} layout`}
              className="max-h-52 sm:max-h-60 w-full object-contain p-5 sm:p-6"
              onError={e => { e.target.parentElement.style.display = 'none' }}
            />
          </div>
        )}

        {/* Info da corrida + vencedor */}
        <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="num text-[9px] text-text-mute uppercase tracking-wider">
                {season} · Round {round}
              </span>
            </div>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-text uppercase leading-tight">
              {cleanRaceName(race.raceName)}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-text-mute">
              <div className="flex items-center gap-1">
                <MapPin size={11} aria-hidden />
                {circuit?.Location?.locality}, {circuit?.Location?.country}
              </div>
              <div className="flex items-center gap-1">
                <Clock size={11} aria-hidden />
                {formatDate(race.date)}
              </div>
            </div>
          </div>

          {winner && (
            <div className="sm:text-right flex-shrink-0">
              <div className="text-[9px] text-text-mute mb-1">Vencedor</div>
              <div className="font-display font-bold text-base sm:text-lg uppercase text-text leading-tight">
                {winner.Driver.givenName[0]}. {winner.Driver.familyName}
              </div>
              <div className="text-xs" style={{ color: winnerColor }}>{winner.Constructor.name}</div>
              {winner.Time && (
                <div className="num text-[9px] text-text-mute mt-1">{winner.Time.time}</div>
              )}
            </div>
          )}
        </div>

        {/* Podium */}
        <div className="px-3 sm:px-6 pb-2">
          <PodiumBlock race={race} winnerColor={winnerColor} />
        </div>
      </motion.div>

      {/* Tab navigation */}
      <div
        className="flex gap-1 p-1 rounded-xl w-full"
        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-strong)' }}
        role="tablist"
      >
        {[
          { id: 'results',    label: 'Resultados', icon: List },
          { id: 'positions',  label: 'Posições',   icon: BarChart2 },
          { id: 'qualifying', label: 'Qualifying', icon: Trophy },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={view === id}
            onClick={() => setView(id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all"
            style={{
              background: view === id ? 'var(--color-f1)' : 'transparent',
              color:      view === id ? 'white' : 'var(--color-text-mute)',
            }}
          >
            <Icon size={13} aria-hidden />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {view === 'results' && (
        <Panel title="Resultado da Corrida" icon={<List size={13} aria-hidden />}>
          <RaceTable race={race} laps={laps} />
        </Panel>
      )}
      {view === 'positions' && (
        <Panel title="Mudança de Posições" icon={<BarChart2 size={13} aria-hidden />}>
          <PositionChangeChart results={race.Results} />
        </Panel>
      )}
      {view === 'qualifying' && (
        <Panel title="Qualifying" icon={<Trophy size={13} aria-hidden />}>
          {quali ? (
            <QualifyingTable quali={quali} />
          ) : (
            <div className="text-center text-text-mute py-6 text-sm">Dados de qualifying não disponíveis</div>
          )}
        </Panel>
      )}

      {/* Relação histórica de vencedores deste circuito (igual à página do
          circuito), com link para cada piloto — abaixo do resultado da corrida. */}
      {circuit?.circuitId && <CircuitWinners circuitId={circuit.circuitId} />}
    </PageShell>
  )
}

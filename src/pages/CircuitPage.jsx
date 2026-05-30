import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { getCircuitResults } from '../api/jolpica'
import { getTeamColor } from '../utils/teamColors'
import { getCircuitImage } from '../utils/images'
import { DRIVER_NAT_CODE, CIRCUIT_COUNTRY } from '../utils/flags'
import { Skeleton } from '../components/ui/Skeleton'
import { Flag } from '../components/ui/Flag'
import { PageShell } from '../components/ui/PageShell'
import { Panel } from '../components/ui/Panel'
import { ArrowLeft, MapPin, Clock, Trophy } from 'lucide-react'

export function CircuitPage() {
  const { circuitId } = useParams()
  const navigate = useNavigate()

  const { data: races, isLoading } = useQuery({
    queryKey: ['circuitResults', circuitId],
    queryFn: () => getCircuitResults(circuitId),
    enabled: !!circuitId,
  })

  const lastRace       = races?.at(-1)
  const circuit        = lastRace?.Circuit
  const location       = circuit?.Location
  const circuitImageUrl = getCircuitImage(circuitId)
  const countryCode    = CIRCUIT_COUNTRY[circuitId]

  if (isLoading) {
    return (
      <PageShell>
        <Skeleton height={200} rounded={16} />
        <Skeleton height={300} rounded={16} />
      </PageShell>
    )
  }

  if (!circuit) {
    return (
      <PageShell>
        <div className="text-center text-text-mute py-20">Circuito não encontrado</div>
      </PageShell>
    )
  }

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
        style={{ background: 'linear-gradient(135deg, var(--color-surface) 0%, #180800 100%)', border: '1px solid rgba(225,6,0,0.15)' }}
      >
        <div className="absolute inset-0 opacity-10"
          style={{ background: 'radial-gradient(ellipse at right, var(--color-f1), transparent 60%)' }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            {countryCode && <Flag code={countryCode} size={20} />}
            <div className="flex items-center gap-1.5">
              <MapPin size={13} className="text-red-500" aria-hidden />
              <span className="text-[11px] text-text-mute uppercase tracking-wider">
                {location?.locality}, {location?.country}
              </span>
            </div>
          </div>
          <h1 className="font-display font-bold text-3xl text-text uppercase">{circuit?.circuitName}</h1>
          {races?.length && (
            <p className="num text-xs text-text-mute mt-2">{races.length} vencedores históricos</p>
          )}
        </div>
      </motion.div>

      {/* Layout: image + history side by side on large screens */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Circuit image */}
        <div
          className="relative rounded-2xl overflow-hidden flex items-center justify-center"
          style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', minHeight: circuitImageUrl ? 200 : 100 }}
        >
          {circuitImageUrl ? (
            <img
              src={circuitImageUrl}
              alt={`${circuit?.circuitName} layout`}
              className="max-h-72 w-full object-contain p-6"
              onError={e => { e.target.parentElement.style.minHeight = '80px'; e.target.style.display = 'none' }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-text-mute">
              <span className="text-4xl" aria-hidden>🏁</span>
              <span className="text-xs font-semibold">{circuit?.circuitName}</span>
              <span className="text-[10px] text-text-mute">Layout em breve</span>
            </div>
          )}
        </div>

        {/* Race history */}
        <Panel title="Vencedores Recentes" icon={<Trophy size={13} aria-hidden />}>
          <div className="space-y-1.5 mt-2">
            {[...(races ?? [])].reverse().map((race, i) => {
              const winner = race.Results?.[0]
              if (!winner) return null
              const color   = getTeamColor(winner.Constructor.name)
              const natCode = DRIVER_NAT_CODE[winner.Driver.nationality]
              return (
                <motion.div
                  key={race.season}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 py-2 px-3 rounded-xl cursor-pointer transition-colors hover:bg-[var(--color-surface-2)]"
                  onClick={() => navigate(`/driver/${winner.Driver.driverId}`)}
                >
                  <div className="num text-text-mute font-black text-sm w-10">{race.season}</div>
                  <Flag code={natCode} size={14} />
                  <div className="flex-1">
                    <span className="text-sm font-bold text-text">
                      {winner.Driver.givenName} {winner.Driver.familyName}
                    </span>
                  </div>
                  <div className="text-xs text-right" style={{ color }}>{winner.Constructor.name}</div>
                  <div className="flex items-center gap-1 num text-[9px] text-text-mute min-w-max">
                    <Clock size={9} aria-hidden />
                    {winner.Time?.time ?? winner.status}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </Panel>
      </div>
    </PageShell>
  )
}

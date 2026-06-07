import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getCircuitResults } from '../../api/jolpica'
import { getTeamColor } from '../../utils/teamColors'
import { DRIVER_NAT_CODE } from '../../utils/flags'
import { Flag } from '../ui/Flag'
import { Panel } from '../ui/Panel'
import { Trophy, Clock } from 'lucide-react'

// Lista de TODOS os vencedores históricos de um circuito, cada linha com link
// para a página do piloto. Compartilhada entre a CircuitPage (circuitos que ainda
// não correram) e a RacePage (corridas já realizadas — abaixo do resultado), para
// a relação aparecer nos dois contextos. A query usa a mesma chave da CircuitPage,
// então o react-query deduplica quando ambas montam.
export function CircuitWinners({ circuitId, title = 'Todos os Vencedores' }) {
  const navigate = useNavigate()
  const { data: races, isLoading } = useQuery({
    queryKey: ['circuitResults', circuitId],
    queryFn: () => getCircuitResults(circuitId),
    enabled: !!circuitId,
    staleTime: 3_600_000,
  })

  const sorted = [...(races ?? [])].sort((a, b) => parseInt(b.season) - parseInt(a.season))

  return (
    <Panel
      title={`${title}${sorted.length ? ` · ${sorted.length}` : ''}`}
      icon={<Trophy size={13} aria-hidden />}
    >
      <div className="mt-2 xl:overflow-y-auto xl:max-h-[480px]">
        {!sorted.length && (
          <div className="text-center text-text-mute py-10 text-sm">
            {isLoading ? 'Carregando vencedores…' : 'Histórico de vencedores indisponível'}
          </div>
        )}
        {sorted.map((race, i) => {
          const winner = race.Results?.[0]
          if (!winner) return null
          const color   = getTeamColor(winner.Constructor.name)
          const natCode = DRIVER_NAT_CODE[winner.Driver.nationality]
          return (
            <motion.div
              key={race.season}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.4) }}
              className="flex items-center gap-3 py-1.5 px-3 rounded-lg cursor-pointer transition-colors hover:bg-[var(--color-surface-2)]"
              style={{ borderBottom: '1px solid var(--color-border-mute)' }}
              onClick={() => navigate(`/driver/${winner.Driver.driverId}`)}
            >
              <div className="num font-black text-sm w-10 flex-shrink-0" style={{ color: i === 0 ? 'var(--color-gold)' : 'var(--color-text-mute)' }}>
                {race.season}
              </div>
              <Flag code={natCode} size={13} />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-text">
                  {winner.Driver.givenName} {winner.Driver.familyName}
                </span>
              </div>
              <div className="text-[10px] text-right flex-shrink-0 hidden xs:block" style={{ color }}>
                {winner.Constructor.name}
              </div>
              {winner.Time?.time && (
                <div className="items-center gap-1 num text-[9px] text-text-mute min-w-max hidden sm:flex">
                  <Clock size={9} aria-hidden />
                  {winner.Time.time}
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </Panel>
  )
}

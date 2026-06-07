import { useQuery } from '@tanstack/react-query'
import {
  getCalendar, getDriverStandings, getConstructorStandings, getLastRaceResults,
  bridgeDriverStandings, bridgeConstructorStandings, bridgeLastRace,
} from '../api/jolpica'
import { useLiveTiming } from './useLiveTiming'
import { latestCompletedRound } from '../utils/format'

// Detecta a DEFASAGEM dos endpoints agregados da Jolpica logo após uma corrida:
// o último round já concluído (calendário + bandeirada do feed) está à frente do
// que o agregado /current/last/results reflete. Quando isso acontece, os hooks
// abaixo reconstroem standings/pódio a partir dos endpoints por-piloto frescos.
function useSeasonFreshness() {
  const { data: races } = useQuery({
    queryKey: ['calendar', 'current'], queryFn: () => getCalendar('current'), staleTime: 3_600_000,
  })
  const { data: lastRace } = useQuery({
    queryKey: ['lastRace'], queryFn: getLastRaceResults, staleTime: 300_000,
  })
  const { data: live } = useLiveTiming()

  const raceFinished = !!live && live.live === false && live.recentEvent?.type === 'Race'
  const completed = latestCompletedRound(races ?? [], { liveRaceFinished: raceFinished })
  const aggRound = lastRace ? parseInt(lastRace.round, 10) : null

  // Só há defasagem se uma corrida concluída ainda não chegou ao agregado.
  const stale = completed && aggRound && completed.round > aggRound ? completed : null
  return { staleRound: stale ? stale.round : null, staleRace: stale }
}

// Enquanto o bridge ainda não conseguiu dado fresco (por-piloto não atualizou),
// repete a cada 60s; assim que pega o dado novo (imutável), para de repolir.
const untilFresh = q => (q.state.data ? false : 60_000)

// Classificação de pilotos com bridge pós-corrida (season !== 'current' não
// precisa — dados históricos são estáveis).
export function useDriverStandings(season = 'current', { enabled = true } = {}) {
  const base = useQuery({
    queryKey: ['driverStandings', season], queryFn: () => getDriverStandings(season), staleTime: 300_000, enabled,
  })
  const { staleRound } = useSeasonFreshness()
  const active = enabled && season === 'current' && !!staleRound && !!base.data?.length

  const bridge = useQuery({
    queryKey: ['driverStandings', season, 'bridge', staleRound],
    queryFn: () => bridgeDriverStandings(base.data),
    enabled: active,
    staleTime: 600_000,
    refetchInterval: untilFresh,
  })

  return { data: (active && bridge.data) || base.data, isLoading: base.isLoading }
}

export function useConstructorStandings(season = 'current') {
  const base = useQuery({
    queryKey: ['constructorStandings', season], queryFn: () => getConstructorStandings(season), staleTime: 300_000,
  })
  const { staleRound } = useSeasonFreshness()
  const active = season === 'current' && !!staleRound && !!base.data?.length

  const bridge = useQuery({
    queryKey: ['constructorStandings', season, 'bridge', staleRound],
    queryFn: () => bridgeConstructorStandings(base.data),
    enabled: active,
    staleTime: 600_000,
    refetchInterval: untilFresh,
  })

  return { data: (active && bridge.data) || base.data, isLoading: base.isLoading }
}

// Última corrida (pódio) com bridge: usa a lista de pilotos do agregado para
// montar o resultado do round recém-concluído via endpoints por-piloto.
export function useLastRace() {
  const base = useQuery({
    queryKey: ['lastRace'], queryFn: getLastRaceResults, staleTime: 300_000,
  })
  const { staleRound, staleRace } = useSeasonFreshness()
  const { data: drivers } = useQuery({
    queryKey: ['driverStandings', 'current'], queryFn: () => getDriverStandings('current'), staleTime: 300_000,
  })
  const driverIds = (drivers ?? []).map(s => s.Driver.driverId)
  const active = !!staleRound && driverIds.length > 0

  const bridge = useQuery({
    queryKey: ['lastRace', 'bridge', staleRound],
    queryFn: () => bridgeLastRace(staleRace, driverIds),
    enabled: active,
    staleTime: 600_000,
    refetchInterval: untilFresh,
  })

  return { data: (active && bridge.data) || base.data, isLoading: base.isLoading }
}

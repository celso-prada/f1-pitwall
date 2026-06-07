import { useQuery } from '@tanstack/react-query'
import {
  getCalendar, getDriverStandings, getConstructorStandings, getLastRaceResults,
  getRaceResults, bridgeDriverStandings, bridgeConstructorStandings, bridgeRaceResults,
} from '../api/jolpica'
import { useLiveTiming } from './useLiveTiming'
import { latestCompletedRound, raceStarted } from '../utils/format'

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
    queryFn: () => bridgeRaceResults(staleRace, driverIds),
    enabled: active,
    staleTime: 600_000,
    refetchInterval: untilFresh,
  })

  return { data: (active && bridge.data) || base.data, isLoading: base.isLoading }
}

// Resultado de UMA corrida (RacePage). Se o agregado /{round}/results ainda
// estiver vazio para uma corrida que já largou (lag pós-corrida), reconstrói do
// por-piloto — assim Mônaco (e qualquer corrida recém-finalizada) já mostra
// pódio/tabela na própria página em vez de "corrida não encontrada".
export function useRaceResults(season, round) {
  const base = useQuery({
    queryKey: ['raceResults', season, round],
    queryFn: () => getRaceResults(season, round),
    staleTime: 3_600_000,
  })
  const { data: calendar } = useQuery({
    queryKey: ['calendar', 'current'], queryFn: () => getCalendar('current'), staleTime: 3_600_000,
  })
  const { data: drivers } = useQuery({
    queryKey: ['driverStandings', 'current'], queryFn: () => getDriverStandings('current'), staleTime: 300_000,
  })

  const calRace = (calendar ?? []).find(
    r => String(r.round) === String(round) && String(r.season) === String(season),
  )
  const driverIds = (drivers ?? []).map(s => s.Driver.driverId)
  // Só faz bridge quando o agregado veio vazio para uma corrida (do calendário
  // atual) que já largou; senão é uma corrida histórica/normal e o agregado basta.
  const active = !base.data && !!calRace && raceStarted(calRace) && driverIds.length > 0

  const bridge = useQuery({
    queryKey: ['raceResults', season, round, 'bridge'],
    queryFn: () => bridgeRaceResults(calRace, driverIds),
    enabled: active,
    staleTime: 600_000,
    refetchInterval: untilFresh,
  })

  const data = base.data ?? (active ? bridge.data : null)
  const isLoading = base.isLoading || (active && !bridge.data && bridge.isFetching)
  return { data, isLoading }
}

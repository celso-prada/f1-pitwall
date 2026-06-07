import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import {
  getCalendar, getDriverStandings, getConstructorStandings, getLastRaceResults,
  getRaceResults, getLatestDataRound,
  bridgeDriverStandings, bridgeConstructorStandings, bridgeRaceResults,
} from '../api/jolpica'
import { useLiveTiming } from './useLiveTiming'

// Força revalidação dos dados derivados da Jolpica quando o STATUS AO VIVO muda
// (treino/corrida começou ou terminou, ou o feed entrou/saiu do ar). Montado uma
// vez no app (Header). Assim, a cada transição, standings/última corrida/sonda de
// round são re-buscados — mantendo a home fresca em torno das sessões ao vivo.
export function useLiveStatusRefresh() {
  const qc = useQueryClient()
  const { data: live } = useLiveTiming()
  const prev = useRef(undefined)
  const key = `${live?.live ? 1 : 0}|${live?.status ?? ''}`
  useEffect(() => {
    if (prev.current !== undefined && prev.current !== key) {
      for (const k of [
        ['driverStandings'], ['constructorStandings'], ['lastRace'],
        ['latestDataRound'], ['raceResults'], ['calendar'],
      ]) {
        qc.invalidateQueries({ queryKey: k })
      }
    }
    prev.current = key
  }, [key, qc])
}

// Detecta a DEFASAGEM dos endpoints agregados da Jolpica logo após uma corrida.
// IMPORTANTE: a detecção é POR DADO, não por relógio. Comparamos o maior round
// que já tem resultado por-piloto (getLatestDataRound — o que a Jolpica atualiza
// primeiro) com o round que o agregado /current/last/results reflete. Assim o
// bridge ativa sempre que a corrida "existe" nos dados, mesmo que o relógio do
// dispositivo ainda não tenha passado pelo horário agendado (dados fictícios
// costumam estar à frente do calendário). Quando há defasagem, os hooks abaixo
// reconstroem standings/pódio a partir dos endpoints por-piloto frescos.
// Agregados da temporada atual mudam só nos fins de semana de corrida, mas, uma
// vez que o cache local fica desatualizado (localStorage de uma sessão antiga,
// snapshot do build, ou edge servindo stale), o usuário podia ficar PRESO no
// dado antigo até o staleTime vencer — foi o que prendeu a classificação de
// equipes sem os pontos de Mônaco. `refetchOnMount: 'always'` garante o padrão
// que queremos: pinta na hora pelo cache E dispara a busca do dado vivo na mesma
// montagem, refrescando a tela se algo mudou. O staleTime continua valendo para
// não repetir durante a mesma navegação.
const REVALIDATE = { refetchOnMount: 'always' }

function useSeasonFreshness() {
  const { data: races } = useQuery({
    queryKey: ['calendar', 'current'], queryFn: () => getCalendar('current'), staleTime: 3_600_000, ...REVALIDATE,
  })
  const { data: lastRace } = useQuery({
    queryKey: ['lastRace'], queryFn: getLastRaceResults, staleTime: 300_000, ...REVALIDATE,
  })
  const { data: drivers } = useQuery({
    queryKey: ['driverStandings', 'current'], queryFn: () => getDriverStandings('current'), staleTime: 300_000, ...REVALIDATE,
  })

  const probeIds = (drivers ?? []).slice(0, 3).map(s => s.Driver.driverId)
  const { data: latestDataRound } = useQuery({
    queryKey: ['latestDataRound', probeIds.join(',')],
    queryFn: () => getLatestDataRound(probeIds),
    enabled: probeIds.length > 0,
    staleTime: 120_000,
    refetchInterval: 120_000, // re-checa periodicamente para pegar corrida nova
  })

  const aggRound = lastRace ? parseInt(lastRace.round, 10) : null
  const staleRound = latestDataRound && aggRound && latestDataRound > aggRound ? latestDataRound : null
  const staleRace = staleRound ? (races ?? []).find(r => parseInt(r.round, 10) === staleRound) : null
  return { staleRound, staleRace, latestDataRound: latestDataRound ?? null }
}

// Enquanto o bridge ainda não conseguiu dado fresco (por-piloto não atualizou),
// repete a cada 60s; assim que pega o dado novo (imutável), para de repolir.
const untilFresh = q => (q.state.data ? false : 60_000)

// Classificação de pilotos com bridge pós-corrida (season !== 'current' não
// precisa — dados históricos são estáveis).
export function useDriverStandings(season = 'current', { enabled = true } = {}) {
  const base = useQuery({
    queryKey: ['driverStandings', season], queryFn: () => getDriverStandings(season), staleTime: 300_000, enabled,
    // Só a temporada atual revalida sempre; históricas são imutáveis.
    refetchOnMount: season === 'current' ? 'always' : false,
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
    refetchOnMount: season === 'current' ? 'always' : false,
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
    queryKey: ['lastRace'], queryFn: getLastRaceResults, staleTime: 300_000, ...REVALIDATE,
  })
  const { staleRound, staleRace } = useSeasonFreshness()
  const { data: drivers } = useQuery({
    queryKey: ['driverStandings', 'current'], queryFn: () => getDriverStandings('current'), staleTime: 300_000, ...REVALIDATE,
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
  const { latestDataRound } = useSeasonFreshness()

  const calRace = (calendar ?? []).find(
    r => String(r.round) === String(round) && String(r.season) === String(season),
  )
  const driverIds = (drivers ?? []).map(s => s.Driver.driverId)
  // Faz bridge quando o agregado veio vazio para uma corrida (do calendário
  // atual) cujo resultado JÁ EXISTE nos dados por-piloto (round <= latestDataRound)
  // — detecção por dado, não por relógio. Corrida histórica/futura usa o agregado.
  const active = !base.data && !!calRace && driverIds.length > 0
    && !!latestDataRound && Number(round) <= latestDataRound

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

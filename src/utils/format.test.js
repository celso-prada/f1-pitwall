import { describe, it, expect } from 'vitest'
import {
  formatGap,
  formatInterval,
  formatLapTime,
  formatWindDir,
  countdownUnits,
  getNextRace,
  isToday,
  positionSuffix,
  raceISO,
  raceEndMs,
  isRaceOver,
  RACE_BROADCAST_MS,
} from './format'

describe('formatGap', () => {
  it('marca o líder', () => {
    expect(formatGap(0)).toBe('LÍDER')
    expect(formatGap('0')).toBe('LÍDER')
  })
  it('traço para nulo/indefinido', () => {
    expect(formatGap(null)).toBe('—')
    expect(formatGap(undefined)).toBe('—')
  })
  it('número vira +Xs com 3 casas', () => {
    expect(formatGap(1.5)).toBe('+1.500s')
  })
  it('string passa direto (ex.: "+1 LAP")', () => {
    expect(formatGap('+1 LAP')).toBe('+1 LAP')
  })
})

describe('formatInterval', () => {
  it('mantém marcações de volta', () => {
    expect(formatInterval('1 LAP')).toBe('1 LAP')
  })
  it('string numérica vira +Xs', () => {
    expect(formatInterval('0.321')).toBe('+0.321s')
  })
  it('número vira +Xs', () => {
    expect(formatInterval(2)).toBe('+2.000s')
  })
})

describe('formatLapTime', () => {
  it('converte ms em m:ss.mmm', () => {
    expect(formatLapTime(83456)).toBe('1:23.456')
  })
  it('traço para zero/nulo', () => {
    expect(formatLapTime(0)).toBe('—')
    expect(formatLapTime(null)).toBe('—')
  })
})

describe('formatWindDir', () => {
  it('mapeia graus para pontos cardeais', () => {
    expect(formatWindDir(0)).toBe('N')
    expect(formatWindDir(90)).toBe('E')
    expect(formatWindDir(180)).toBe('S')
    expect(formatWindDir(270)).toBe('W')
    expect(formatWindDir(360)).toBe('N')
  })
})

describe('countdownUnits', () => {
  it('lista vazia quando não há countdown', () => {
    expect(countdownUnits(null)).toEqual([])
  })
  it('descarta unidades-zero do topo, mantendo o resto', () => {
    const out = countdownUnits({ d: 0, h: 0, m: 5, s: 9 })
    expect(out.map(u => u.short)).toEqual(['m', 's'])
  })
  it('mostra sempre ao menos os segundos', () => {
    const out = countdownUnits({ d: 0, h: 0, m: 0, s: 0 })
    expect(out.map(u => u.short)).toEqual(['s'])
  })
  it('mantém tudo quando há dias', () => {
    const out = countdownUnits({ d: 2, h: 3, m: 4, s: 5 })
    expect(out.map(u => u.short)).toEqual(['d', 'h', 'm', 's'])
  })
})

describe('raceISO', () => {
  it('mantém o Z quando já tem fuso', () => {
    expect(raceISO('2026-06-08', '13:00:00Z')).toBe('2026-06-08T13:00:00Z')
  })
  it('acrescenta Z quando falta (trata como UTC)', () => {
    expect(raceISO('2026-06-08', '13:00:00')).toBe('2026-06-08T13:00:00Z')
    // sem Z seria interpretado como horário local; com Z é o mesmo instante em qualquer aparelho
    expect(new Date(raceISO('2026-06-08', '13:00:00')).getTime())
      .toBe(Date.UTC(2026, 5, 8, 13, 0, 0))
  })
  it('respeita offsets explícitos', () => {
    expect(raceISO('2026-06-08', '10:00:00-03:00')).toBe('2026-06-08T10:00:00-03:00')
  })
  it('usa o fallback e null sem data', () => {
    expect(raceISO('2026-06-08', null, '23:59:59')).toBe('2026-06-08T23:59:59Z')
    expect(raceISO(null, '13:00:00')).toBe(null)
  })
})

describe('isRaceOver / raceEndMs', () => {
  const race = { date: '2026-06-08', time: '13:00:00Z' }
  it('fim = largada + janela de transmissão', () => {
    expect(raceEndMs(race)).toBe(Date.UTC(2026, 5, 8, 13) + RACE_BROADCAST_MS)
  })
  it('durante a transmissão (logo após a largada) ainda NÃO acabou', () => {
    const justStarted = Date.UTC(2026, 5, 8, 13, 30) // 30min após largada
    expect(isRaceOver(race, justStarted)).toBe(false)
  })
  it('depois da janela, acabou', () => {
    const later = Date.UTC(2026, 5, 8, 13) + RACE_BROADCAST_MS + 1000
    expect(isRaceOver(race, later)).toBe(true)
  })
})

describe('getNextRace', () => {
  const races = [
    { date: '2020-01-01', time: '12:00:00Z', raceName: 'Passada' },
    { date: '2999-01-01', time: '12:00:00Z', raceName: 'Futura A' },
    { date: '2999-02-01', time: '12:00:00Z', raceName: 'Futura B' },
  ]
  it('retorna a primeira corrida ainda por vir', () => {
    expect(getNextRace(races).raceName).toBe('Futura A')
  })
  it('mantém a corrida ATUAL durante a transmissão (não pula para a próxima)', () => {
    const start = Date.UTC(2030, 0, 1, 12)
    const racesNow = [
      { date: '2030-01-01', time: '12:00:00Z', raceName: 'Atual' },
      { date: '2030-01-08', time: '12:00:00Z', raceName: 'Próxima' },
    ]
    // 1h após a largada: ainda é "Atual"
    const realNow = Date.now
    Date.now = () => start + 60 * 60 * 1000
    try { expect(getNextRace(racesNow).raceName).toBe('Atual') } finally { Date.now = realNow }
  })
  it('com bandeirada do feed, pula para a próxima logo após o fim (sem esperar 4h)', () => {
    const start = Date.UTC(2030, 0, 1, 12)
    const racesNow = [
      { date: '2030-01-01', time: '12:00:00Z', raceName: 'Atual' },
      { date: '2030-01-08', time: '12:00:00Z', raceName: 'Próxima' },
    ]
    // 1h após a largada (dentro da janela de 4h), mas o feed confirmou o fim:
    const now = start + 60 * 60 * 1000
    expect(getNextRace(racesNow, { now, liveRaceFinished: true }).raceName).toBe('Próxima')
  })
  it('bandeirada NÃO afeta corrida que ainda não largou', () => {
    const now = Date.UTC(2030, 0, 1, 12)
    const racesNow = [{ date: '2030-06-01', time: '12:00:00Z', raceName: 'Futura' }]
    expect(getNextRace(racesNow, { now, liveRaceFinished: true }).raceName).toBe('Futura')
  })
  it('cai na última quando todas já passaram', () => {
    const past = [
      { date: '2019-01-01', time: '12:00:00Z', raceName: 'X' },
      { date: '2020-01-01', time: '12:00:00Z', raceName: 'Y' },
    ]
    expect(getNextRace(past).raceName).toBe('Y')
  })
})

describe('isToday', () => {
  it('true para a data de hoje', () => {
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    expect(isToday(today)).toBe(true)
  })
  it('false para outra data', () => {
    expect(isToday('1999-12-31')).toBe(false)
  })
})

describe('positionSuffix', () => {
  it('aplica sufixos ordinais em inglês', () => {
    expect(positionSuffix(1)).toBe('1st')
    expect(positionSuffix(2)).toBe('2nd')
    expect(positionSuffix(3)).toBe('3rd')
    expect(positionSuffix(4)).toBe('4th')
    expect(positionSuffix(11)).toBe('11th')
    expect(positionSuffix(21)).toBe('21st')
  })
})

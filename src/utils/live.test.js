import { describe, it, expect } from 'vitest'
import {
  deriveTrackStatus,
  buildLapInfo,
  lapTone,
  fmtLap,
  currentLap,
  buildClassification,
  tyreOf,
  classifyPenalty,
  extractPenalties,
  parseGapSeconds,
  pitWindow,
  analyzeStrategy,
  TRACK_STATUS,
} from './live'

describe('deriveTrackStatus', () => {
  it('desconhecido sem mensagens', () => {
    expect(deriveTrackStatus([])).toBe(TRACK_STATUS.UNKNOWN)
    expect(deriveTrackStatus(null)).toBe(TRACK_STATUS.UNKNOWN)
  })
  it('verde no caso base', () => {
    const msgs = [{ date: '2020-01-01T00:00:00Z', flag: 'GREEN' }]
    expect(deriveTrackStatus(msgs)).toBe(TRACK_STATUS.GREEN)
  })
  it('bandeira vermelha vence amarela', () => {
    const msgs = [
      { date: '2020-01-01T00:00:01Z', flag: 'YELLOW' },
      { date: '2020-01-01T00:00:02Z', flag: 'RED' },
    ]
    expect(deriveTrackStatus(msgs)).toBe(TRACK_STATUS.RED)
  })
  it('safety car deployed → SC; depois IN → some', () => {
    const deployed = [{ date: '2020-01-01T00:00:01Z', category: 'SafetyCar', message: 'SAFETY CAR DEPLOYED' }]
    expect(deriveTrackStatus(deployed)).toBe(TRACK_STATUS.SC)
    const ended = [
      ...deployed,
      { date: '2020-01-01T00:00:05Z', category: 'SafetyCar', message: 'SAFETY CAR IN THIS LAP' },
    ]
    expect(deriveTrackStatus(ended)).toBe(TRACK_STATUS.GREEN)
  })
  it('VSC quando a mensagem é virtual', () => {
    const msgs = [{ date: '2020-01-01T00:00:01Z', category: 'SafetyCar', message: 'VIRTUAL SAFETY CAR DEPLOYED' }]
    expect(deriveTrackStatus(msgs)).toBe(TRACK_STATUS.VSC)
  })
  it('bandeirada vence tudo', () => {
    const msgs = [
      { date: '2020-01-01T00:00:01Z', flag: 'RED' },
      { date: '2020-01-01T00:00:02Z', flag: 'CHEQUERED' },
    ]
    expect(deriveTrackStatus(msgs)).toBe(TRACK_STATUS.CHEQUERED)
  })
  it('amarela setorizada abre e fecha com clear', () => {
    const open = [{ date: '2020-01-01T00:00:01Z', flag: 'YELLOW' }]
    expect(deriveTrackStatus(open)).toBe(TRACK_STATUS.YELLOW)
    const closed = [...open, { date: '2020-01-01T00:00:02Z', flag: 'CLEAR' }]
    expect(deriveTrackStatus(closed)).toBe(TRACK_STATUS.GREEN)
  })
})

describe('buildLapInfo', () => {
  it('vazio sem voltas', () => {
    expect(buildLapInfo([])).toEqual({ byDriver: {}, sessionBest: null, personalBest: {} })
  })
  it('rastreia última volta, melhor pessoal e melhor da sessão', () => {
    const laps = [
      { driver_number: 1, lap_number: 1, lap_duration: 90.5 },
      { driver_number: 1, lap_number: 2, lap_duration: 89.9 },
      { driver_number: 44, lap_number: 1, lap_duration: 88.1 },
    ]
    const info = buildLapInfo(laps)
    expect(info.byDriver[1].lap_number).toBe(2)
    expect(info.personalBest[1]).toBe(89.9)
    expect(info.personalBest[44]).toBe(88.1)
    expect(info.sessionBest).toBe(88.1)
  })
  it('ignora durações inválidas no cálculo de melhor', () => {
    const laps = [
      { driver_number: 1, lap_number: 1, lap_duration: 0 },
      { driver_number: 1, lap_number: 2, lap_duration: null },
    ]
    const info = buildLapInfo(laps)
    expect(info.sessionBest).toBe(null)
    expect(info.personalBest[1]).toBeUndefined()
  })
})

describe('lapTone', () => {
  const info = { sessionBest: 88.1, personalBest: { 1: 89.9, 44: 88.1 } }
  it('roxo para melhor geral', () => {
    expect(lapTone(88.1, 44, info)).toBe('overall')
  })
  it('verde para melhor pessoal', () => {
    expect(lapTone(89.9, 1, info)).toBe('personal')
  })
  it('normal caso contrário', () => {
    expect(lapTone(91.2, 1, info)).toBe('normal')
    expect(lapTone(0, 1, info)).toBe('normal')
  })
})

describe('fmtLap', () => {
  it('formata com minutos', () => {
    expect(fmtLap(83.456)).toBe('1:23.456')
  })
  it('sem minutos quando < 60s', () => {
    expect(fmtLap(8.2)).toBe('08.200')
  })
  it('traço para zero/nulo', () => {
    expect(fmtLap(0)).toBe('—')
    expect(fmtLap(null)).toBe('—')
  })
})

describe('currentLap', () => {
  it('retorna a maior volta do grid', () => {
    expect(currentLap([{ lap_number: 3 }, { lap_number: 7 }, { lap_number: 5 }])).toBe(7)
  })
  it('null sem voltas', () => {
    expect(currentLap([])).toBe(null)
  })
})

describe('buildClassification', () => {
  it('vazio sem resultados', () => {
    expect(buildClassification([])).toEqual([])
  })
  it('corrida: gap ao vencedor', () => {
    const rows = buildClassification([
      { position: 1, driver_number: 1, duration: 5400, number_of_laps: 58 },
      { position: 2, driver_number: 44, duration: 5405.5, number_of_laps: 58 },
    ])
    expect(rows[0].gapSec).toBe(0)
    expect(rows[1].gapSec).toBeCloseTo(5.5, 3)
  })
  it('quali: usa a última parte preenchida do array de duração', () => {
    const rows = buildClassification([
      { position: 1, driver_number: 1, duration: [80.0, 79.5, 78.9] },
      { position: 2, driver_number: 44, duration: [80.2, 79.6, 79.4] },
    ])
    expect(rows[0].isQuali).toBe(true)
    expect(rows[0].timeSec).toBe(78.9)
    expect(rows[1].gapSec).toBeCloseTo(0.5, 3)
  })
  it('ordena por posição', () => {
    const rows = buildClassification([
      { position: 3, driver_number: 1, duration: 10 },
      { position: 1, driver_number: 44, duration: 9 },
      { position: 2, driver_number: 16, duration: 9.5 },
    ])
    expect(rows.map(r => r.position)).toEqual([1, 2, 3])
  })
})

describe('tyreOf', () => {
  it('compostos conhecidos', () => {
    expect(tyreOf('SOFT').label).toBe('S')
    expect(tyreOf('medium').label).toBe('M')
  })
  it('desconhecido cai no fallback', () => {
    const t = tyreOf('UNOBTAINIUM')
    expect(t.label).toBe('U')
  })
})

describe('classifyPenalty', () => {
  it('classifica punição de tempo', () => {
    expect(classifyPenalty('CAR 44 (HAM) 5 SECOND PENALTY').type).toBe('Punição de tempo')
  })
  it('investigação vira amarelo', () => {
    const hit = classifyPenalty('CAR 1 (VER) UNDER INVESTIGATION - FORCING ANOTHER DRIVER OFF')
    expect(hit.type).toBe('Em investigação')
    expect(hit.tone).toBe('amber')
  })
  it('tempo deletado por track limits', () => {
    expect(classifyPenalty('CAR 16 (LEC) LAP TIME DELETED - TRACK LIMITS').type).toBe('Tempo deletado')
  })
  it('sem ação', () => {
    expect(classifyPenalty('CAR 4 (NOR) NO FURTHER ACTION').type).toBe('Sem ação')
  })
  it('mensagem comum não é punição', () => {
    expect(classifyPenalty('GREEN LIGHT - PIT EXIT OPEN')).toBe(null)
    expect(classifyPenalty('DRS ENABLED')).toBe(null)
  })
})

describe('extractPenalties', () => {
  it('filtra só decisões e extrai carro + ordena por mais recente', () => {
    const msgs = [
      { utc: '2024-01-01T00:00:01Z', message: 'GREEN LIGHT' },
      { utc: '2024-01-01T00:00:05Z', message: 'CAR 44 (HAM) 5 SECOND PENALTY', lap: 10 },
      { utc: '2024-01-01T00:00:03Z', message: 'CAR 1 (VER) UNDER INVESTIGATION' },
    ]
    const out = extractPenalties(msgs)
    expect(out).toHaveLength(2)
    expect(out[0].car).toBe('44') // mais recente primeiro
    expect(out[0].type).toBe('Punição de tempo')
    expect(out[0].lap).toBe(10)
    expect(out[1].car).toBe('1')
  })
  it('aceita shape do OpenF1 (date em vez de utc)', () => {
    const out = extractPenalties([{ date: '2024-01-01T00:00:05Z', message: 'CAR 11 (PER) TIME PENALTY' }])
    expect(out[0].car).toBe('11')
    expect(out[0].when).toBe('2024-01-01T00:00:05Z')
  })
  it('vazio sem mensagens', () => {
    expect(extractPenalties([])).toEqual([])
    expect(extractPenalties(null)).toEqual([])
  })
})

describe('parseGapSeconds', () => {
  it('converte gaps numéricos', () => {
    expect(parseGapSeconds('+1.234')).toBeCloseTo(1.234, 3)
    expect(parseGapSeconds('0,521')).toBeCloseTo(0.521, 3)
  })
  it('null para lapeado e vazio', () => {
    expect(parseGapSeconds('+1 LAP')).toBe(null)
    expect(parseGapSeconds('1L')).toBe(null)
    expect(parseGapSeconds('')).toBe(null)
    expect(parseGapSeconds(null)).toBe(null)
  })
})

describe('pitWindow', () => {
  it('estado fresco/janela/passou conforme idade', () => {
    expect(pitWindow({ tyre: 'SOFT', tyreAge: 2 }).state).toBe('fresh')
    expect(pitWindow({ tyre: 'SOFT', tyreAge: 15 }).state).toBe('window') // 18-15=3
    expect(pitWindow({ tyre: 'SOFT', tyreAge: 20 }).state).toBe('over')
  })
  it('null sem composto conhecido ou sem idade', () => {
    expect(pitWindow({ tyre: 'INTERMEDIATE', tyreAge: 5 })).toBe(null)
    expect(pitWindow({ tyre: 'SOFT', tyreAge: null })).toBe(null)
  })
})

describe('analyzeStrategy', () => {
  const drivers = [
    { pos: 1, tla: 'VER', color: '#1', tyre: 'MEDIUM', tyreAge: 20, gapToAhead: '' },
    { pos: 2, tla: 'HAM', color: '#2', tyre: 'HARD', tyreAge: 5, gapToAhead: '+1.8' },
    { pos: 3, tla: 'LEC', color: '#3', tyre: 'MEDIUM', tyreAge: 22, gapToAhead: '+4.0' },
    { pos: 4, tla: 'NOR', color: '#4', tyre: 'SOFT', tyreAge: 3, gapToAhead: '+0.6' },
  ]
  it('lista só pares dentro do gap de undercut', () => {
    const b = analyzeStrategy(drivers)
    // HAM↔VER (1.8) e NOR↔LEC (0.6) entram; LEC↔HAM (4.0) não
    expect(b.map(x => x.behind.tla)).toEqual(['HAM', 'NOR'])
  })
  it('marca DRS (≤1s) e a ferramenta de undercut', () => {
    const b = analyzeStrategy(drivers)
    const ham = b.find(x => x.behind.tla === 'HAM')
    expect(ham.drs).toBe(false) // 1.8s
    expect(ham.canUndercut).toBe(false) // HAM 5v < VER 20v → não ganha parando
    const nor = b.find(x => x.behind.tla === 'NOR')
    expect(nor.drs).toBe(true) // 0.6s
    expect(nor.canUndercut).toBe(false) // NOR 3v < LEC 22v
  })
  it('ignora carros parados/retirados', () => {
    const b = analyzeStrategy([
      { pos: 1, tla: 'A', tyre: 'SOFT', tyreAge: 5, gapToAhead: '' },
      { pos: 2, tla: 'B', tyre: 'SOFT', tyreAge: 5, gapToAhead: '+0.5', retired: true },
    ])
    expect(b).toEqual([])
  })
})

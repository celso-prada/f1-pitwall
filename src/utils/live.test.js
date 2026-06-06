import { describe, it, expect } from 'vitest'
import {
  deriveTrackStatus,
  buildLapInfo,
  lapTone,
  fmtLap,
  currentLap,
  buildClassification,
  tyreOf,
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

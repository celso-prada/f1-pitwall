import { describe, it, expect } from 'vitest'
import { fastestLap, lapStats, lapDeltaSeries, stintDegradation } from './telemetry'

const lap = (lap_number, lap_duration, extra = {}) => ({ lap_number, lap_duration, ...extra })

describe('fastestLap', () => {
  it('pega a menor volta válida com date_start', () => {
    const laps = [
      lap(1, 92.0, { date_start: 'x' }),
      lap(2, 90.5, { date_start: 'y' }),
      lap(3, 0, { date_start: 'z' }),
    ]
    expect(fastestLap(laps).lap_number).toBe(2)
  })
  it('null quando nada serve', () => {
    expect(fastestLap([lap(1, 0)])).toBe(null)
  })
})

describe('lapStats', () => {
  it('resume vmax e percentuais', () => {
    const s = lapStats([
      { speed: 300, throttle: 100, brake: 0, drs: 0, gear: 7 },
      { speed: 200, throttle: 0, brake: 80, drs: 8, gear: 4 },
    ])
    expect(s.vmax).toBe(300)
    expect(s.fullThrottlePct).toBe(50)
    expect(s.brakingPct).toBe(50)
    expect(s.drsPct).toBe(50)
  })
})

describe('lapDeltaSeries', () => {
  it('acumula a diferença nas voltas em comum', () => {
    const a = [lap(1, 91.0), lap(2, 90.5), lap(3, 90.0)]
    const b = [lap(1, 90.0), lap(2, 90.5), lap(3, 91.0)]
    const out = lapDeltaSeries(a, b)
    expect(out).toEqual([
      { lap: 1, delta: 1 },   // A 1s mais lento
      { lap: 2, delta: 1 },   // empate
      { lap: 3, delta: 0 },   // A devolve 1s
    ])
  })
  it('ignora pit-out e voltas só de um piloto', () => {
    const a = [lap(1, 90, { is_pit_out_lap: true }), lap(2, 90)]
    const b = [lap(2, 91), lap(3, 90)]
    const out = lapDeltaSeries(a, b)
    expect(out).toEqual([{ lap: 2, delta: -1 }])
  })
})

describe('stintDegradation', () => {
  it('separa stints pelo pit-out e mede a inclinação positiva (desgaste)', () => {
    const laps = [
      lap(1, 90.0), lap(2, 90.5), lap(3, 91.0), lap(4, 91.5),
      lap(5, 95.0, { is_pit_out_lap: true }), // novo stint começa aqui
      lap(6, 89.0), lap(7, 89.3), lap(8, 89.6),
    ]
    const out = stintDegradation(laps)
    expect(out).toHaveLength(2)
    expect(out[0].stint).toBe(1)
    expect(out[0].degPerLap).toBeCloseTo(0.5, 2)
    expect(out[1].startLap).toBe(6)
    expect(out[1].degPerLap).toBeCloseTo(0.3, 2)
  })
  it('ignora stint com menos de 3 voltas', () => {
    expect(stintDegradation([lap(1, 90), lap(2, 90)])).toEqual([])
  })
})

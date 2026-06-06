import { describe, it, expect } from 'vitest'
import { cumulativePoints, buildProgression, seasonHighlights } from './season'

const race = (round, points) => ({ round: String(round), Results: [{ points: String(points) }] })

describe('cumulativePoints', () => {
  it('acumula e ordena por round', () => {
    const out = cumulativePoints([race(2, 18), race(1, 25), race(3, 0)])
    expect(out).toEqual([
      { round: 1, points: 25 },
      { round: 2, points: 43 },
      { round: 3, points: 43 },
    ])
  })
  it('vazio sem corridas', () => {
    expect(cumulativePoints([])).toEqual([])
  })
})

describe('buildProgression', () => {
  it('funde pilotos e repete o último valor em rounds pulados', () => {
    const out = buildProgression([
      { key: 'VER', races: [race(1, 25), race(2, 25)] },
      { key: 'HAM', races: [race(1, 18)] }, // não correu o round 2
    ])
    expect(out).toEqual([
      { round: 1, VER: 25, HAM: 18 },
      { round: 2, VER: 50, HAM: 18 }, // HAM mantém 18
    ])
  })
})

describe('seasonHighlights', () => {
  it('extrai líder, gap e mais vitórias', () => {
    const standings = [
      { Driver: { driverId: 'a' }, points: '100', wins: '3' },
      { Driver: { driverId: 'b' }, points: '80', wins: '5' },
      { Driver: { driverId: 'c' }, points: '0', wins: '0' },
    ]
    const h = seasonHighlights(standings)
    expect(h.leader.Driver.driverId).toBe('a')
    expect(h.gapToSecond).toBe(20)
    expect(h.mostWins.Driver.driverId).toBe('b')
    expect(h.totalWins).toBe(8)
    expect(h.driversScored).toBe(2)
  })
  it('null sem standings', () => {
    expect(seasonHighlights([])).toBe(null)
  })
})

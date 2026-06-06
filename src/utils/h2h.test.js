import { describe, it, expect } from 'vitest'
import { summarizeSeason, headToHead } from './h2h'

const race = (round, position, grid, points, status = 'Finished') => ({
  round: String(round),
  Results: [{ position: String(position), grid: String(grid), points: String(points), status }],
})

describe('summarizeSeason', () => {
  it('agrega vitórias, pódios, poles, pontos e DNFs', () => {
    const races = [
      race(1, 1, 1, 25),
      race(2, 3, 2, 15),
      race(3, 'R', 4, 0, 'Accident'),
      race(4, 2, 1, 18),
    ]
    const s = summarizeSeason(races)
    expect(s.races).toBe(4)
    expect(s.wins).toBe(1)
    expect(s.podiums).toBe(3) // P1, P3, P2
    expect(s.poles).toBe(2) // grid 1 em R1 e R4
    expect(s.points).toBe(58)
    expect(s.dnfs).toBe(1)
    expect(s.bestFinish).toBe(1)
    expect(s.avgFinish).toBe(2) // (1+3+2)/3
  })
  it('lida com lista vazia', () => {
    expect(summarizeSeason([])).toMatchObject({ races: 0, wins: 0, bestFinish: null, avgFinish: null })
  })
  it('+1 Lap conta como completou (não-DNF)', () => {
    const s = summarizeSeason([race(1, 12, 15, 0, '+1 Lap')])
    expect(s.dnfs).toBe(0)
    expect(s.bestFinish).toBe(12)
  })
})

describe('headToHead', () => {
  it('compara apenas rounds em comum, por corrida e por quali', () => {
    const a = [race(1, 1, 2, 25), race(2, 5, 5, 10), race(3, 2, 1, 18)]
    const b = [race(1, 2, 1, 18), race(2, 3, 4, 15)] // sem round 3
    const h = headToHead(a, b)
    expect(h.shared).toBe(2)
    // corrida: R1 A(1)<B(2) → A; R2 B(3)<A(5) → B
    expect(h.race).toEqual({ a: 1, b: 1 })
    // quali: R1 B(1)<A(2) → B; R2 A(5)<B(4)? não, B(4)<A(5) → B
    expect(h.quali).toEqual({ a: 0, b: 2 })
  })
  it('zero quando não há rounds em comum', () => {
    const h = headToHead([race(1, 1, 1, 25)], [race(2, 1, 1, 25)])
    expect(h.shared).toBe(0)
    expect(h.race).toEqual({ a: 0, b: 0 })
  })
})

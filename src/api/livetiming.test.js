import { describe, it, expect } from 'vitest'
import { segTone, trackStatusOf, normalizeLive, computeSessionBests } from './livetiming'

describe('segTone', () => {
  it('mapeia códigos de minisetor', () => {
    expect(segTone(2064)).toBe('purple')
    expect(segTone(2051)).toBe('green')
    expect(segTone(2052)).toBe('green')
    expect(segTone(2049)).toBe('yellow')
    expect(segTone(2048)).toBe('none')
    expect(segTone(0)).toBe('none')
  })
})

describe('trackStatusOf', () => {
  it('mapeia status oficiais', () => {
    expect(trackStatusOf({ Status: '1' }).code).toBe('GREEN')
    expect(trackStatusOf({ Status: '4' }).code).toBe('SC')
    expect(trackStatusOf({ Status: '5' }).code).toBe('RED')
    expect(trackStatusOf({ Status: '6' }).code).toBe('VSC')
  })
  it('desconhecido com mensagem de fallback', () => {
    const t = trackStatusOf({ Status: '99', Message: 'Aquecimento' })
    expect(t.code).toBe('UNKNOWN')
    expect(t.label).toBe('Aquecimento')
  })
})

describe('normalizeLive', () => {
  it('null para snapshot vazio', () => {
    expect(normalizeLive(null)).toBe(null)
  })

  it('extrai pilotos ordenados por posição, com cor e pneu', () => {
    const snapshot = {
      SessionInfo: { Meeting: { Name: 'GP Teste' }, Name: 'Race', Type: 'Race', Path: '2024/x/' },
      DriverList: {
        1: { Tla: 'VER', FullName: 'Max Verstappen', TeamName: 'Red Bull', TeamColour: '3671C6' },
        44: { Tla: 'HAM', FullName: 'Lewis Hamilton', TeamName: 'Mercedes', TeamColour: '27F4D2' },
      },
      TimingData: {
        Lines: {
          1: { Position: '2', LastLapTime: { Value: '1:30.000' } },
          44: { Position: '1', LastLapTime: { Value: '1:29.500', OverallFastest: true } },
        },
      },
      TimingAppData: {
        Lines: {
          1: { Stints: [{ Compound: 'SOFT', New: 'true', TotalLaps: 3 }] },
          44: { Stints: [{ Compound: 'MEDIUM', TotalLaps: 8 }] },
        },
      },
      LapCount: { CurrentLap: '12', TotalLaps: '58' },
      TrackStatus: { Status: '1' },
    }
    const out = normalizeLive(snapshot)
    expect(out.drivers.map(d => d.tla)).toEqual(['HAM', 'VER'])
    expect(out.drivers[0].pos).toBe(1)
    expect(out.drivers[1].color).toBe('#3671C6')
    expect(out.drivers[1].tyre).toBe('SOFT')
    expect(out.drivers[1].tyreNew).toBe(true)
    expect(out.session.gp).toBe('GP Teste')
    expect(out.session.lap).toBe(12)
    expect(out.session.totalLaps).toBe(58)
    expect(out.session.track.code).toBe('GREEN')
  })

  it('ordena race control do mais novo para o mais antigo', () => {
    const snapshot = {
      TimingData: { Lines: {} },
      RaceControlMessages: {
        Messages: [
          { Utc: '2024-01-01T00:00:01Z', Message: 'A' },
          { Utc: '2024-01-01T00:00:03Z', Message: 'C' },
          { Utc: '2024-01-01T00:00:02Z', Message: 'B' },
        ],
      },
    }
    const out = normalizeLive(snapshot)
    expect(out.raceControl.map(m => m.message)).toEqual(['C', 'B', 'A'])
  })
})

describe('computeSessionBests', () => {
  it('escolhe dono de cada setor e calcula a volta ideal', () => {
    const drivers = [
      { tla: 'VER', color: '#1', bestSectors: ['28.0', '30.5', '25.0'], bestSpeedST: '320' },
      { tla: 'HAM', color: '#2', bestSectors: ['27.5', '31.0', '24.8'], bestSpeedST: '322' },
    ]
    const { sectorOwners, ideal, speedTrap } = computeSessionBests(drivers)
    expect(sectorOwners[0].tla).toBe('HAM') // 27.5 < 28.0
    expect(sectorOwners[1].tla).toBe('VER') // 30.5 < 31.0
    expect(sectorOwners[2].tla).toBe('HAM') // 24.8 < 25.0
    // volta ideal = 27.5 + 30.5 + 24.8 = 82.8 → "1:22.800"
    expect(ideal).toBe('1:22.800')
    expect(speedTrap[0].tla).toBe('HAM') // 322 mais rápido
    expect(speedTrap[0].v).toBe(322)
  })
  it('sem volta ideal quando falta um setor', () => {
    const drivers = [{ tla: 'VER', color: '#1', bestSectors: ['28.0', '', '25.0'], bestSpeedST: '0' }]
    const { ideal } = computeSessionBests(drivers)
    expect(ideal).toBe(null)
  })
})

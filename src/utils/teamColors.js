// Official F1 team colors for 2024/2025 season
export const TEAM_COLORS = {
  'McLaren': '#FF8000',
  'Ferrari': '#E8002D',
  'Red Bull Racing': '#3671C6',
  'Red Bull': '#3671C6',
  'Mercedes': '#27F4D2',
  'Aston Martin': '#229971',
  'Alpine': '#FF87BC',
  'Williams': '#64C4FF',
  'Racing Bulls': '#6692FF',
  'Haas': '#B6BABD',
  'Haas F1 Team': '#B6BABD',
  'Sauber': '#52E252',
  'Kick Sauber': '#52E252',
  'RB': '#6692FF',
  'Audi': '#F50537',
}

export function getTeamColor(teamName, fallbackHex) {
  if (fallbackHex) return `#${fallbackHex}`
  return TEAM_COLORS[teamName] ?? '#666666'
}

export const FLAG_COLORS = {
  GREEN: '#00d632',
  YELLOW: '#ffd700',
  RED: '#e10600',
  BLUE: '#4488ff',
  WHITE: '#ffffff',
  CHEQUERED: '#e8e8e8',
  SAFETY_CAR: '#ff8c00',
  VSC: '#ff6b35',
}

export function getFlagColor(flag) {
  if (!flag) return '#666'
  const f = flag.toUpperCase()
  if (f.includes('GREEN')) return FLAG_COLORS.GREEN
  if (f.includes('YELLOW')) return FLAG_COLORS.YELLOW
  if (f.includes('RED')) return FLAG_COLORS.RED
  if (f.includes('BLUE')) return FLAG_COLORS.BLUE
  if (f.includes('CHEQUERED') || f.includes('CHECKERED')) return FLAG_COLORS.CHEQUERED
  if (f.includes('VSC')) return FLAG_COLORS.VSC
  if (f.includes('SAFETY')) return FLAG_COLORS.SAFETY_CAR
  return '#666'
}

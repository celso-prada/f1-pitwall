import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const dir = 'C:/Claude/TesteSkill/f1_screenshots_v2'
mkdirSync(dir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
await page.setViewportSize({ width: 1440, height: 900 })

const errors = []
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('favicon')) errors.push(m.text().slice(0, 100)) })

// 1. Home
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 20000 })
await page.waitForTimeout(4000)
await page.screenshot({ path: `${dir}/01_home.png` })
const newsCards = await page.locator('a[href*="autosport"], a[href*="motorsport"], a[href*="crash"]').count()
console.log('News links visible:', newsCards)
const hasTicker = await page.locator('text=NEWS').count()
console.log('Ticker NEWS badge:', hasTicker)

// 2. Live
await page.click('text=Ao Vivo')
await page.waitForTimeout(5000)
await page.screenshot({ path: `${dir}/02_live_pitwall.png` })
const towerCount = await page.locator('text=/TORRE|Torre/').count()
const stintCount = await page.locator('text=/ESTRATÉGIA|Estratégia/').count()
const radioCount = await page.locator('text=/Team Radio/').count()
const newsInLive = await page.locator('text=/Notícias F1/').count()
console.log('Tower:', towerCount, '| Stints:', stintCount, '| Radio:', radioCount, '| News:', newsInLive)

// 3. Calendar — check clickable past races
await page.click('text=Calendário')
await page.waitForTimeout(3000)
await page.screenshot({ path: `${dir}/03_calendar.png` })
const season = await page.locator('text=/Temporada [0-9]{4}/').count()
console.log('Season label:', season)

// Click a past race
const pastRace = page.locator('.card-hover').first()
await pastRace.click()
await page.waitForTimeout(4000)
await page.screenshot({ path: `${dir}/04_race_page.png` })
const isRacePage = page.url().includes('/race/')
console.log('Race page URL:', page.url(), '| Is race page:', isRacePage)
const resultsTable = await page.locator('text=/Resultado da Corrida|RESULTADO/').count()
const posBtn = await page.locator('button:has-text("Posições")').count()
const qualiBtn = await page.locator('button:has-text("Qualifying")').count()
console.log('Results tab:', resultsTable, '| Positions tab:', posBtn, '| Quali tab:', qualiBtn)

// 5. AI Chat button
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
const chatBtn = await page.locator('button[title="PITWALL AI"]').count()
console.log('AI Chat button:', chatBtn)
if (chatBtn > 0) {
  await page.click('button[title="PITWALL AI"]')
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${dir}/05_ai_chat.png` })
  const chatHeader = await page.locator('text=PITWALL AI').count()
  console.log('Chat panel opened:', chatHeader)
}

// 6. Driver page
await page.goto('http://localhost:5173/standings', { waitUntil: 'networkidle' })
await page.waitForTimeout(3000)
await page.locator('.card-hover').first().click()
await page.waitForTimeout(4000)
await page.screenshot({ path: `${dir}/06_driver_v2.png` })
const hasSeasonChart = await page.locator('text=/Pontos por Temporada|PONTOS POR/').count()
const hasHistTable = await page.locator('text=/Histórico de Temporadas/').count()
console.log('Season chart:', hasSeasonChart, '| History table:', hasHistTable)

console.log('\nErrors:', errors.slice(0, 5))
await browser.close()
console.log('Done. Screenshots:', dir)

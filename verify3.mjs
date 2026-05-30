import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const dir = 'C:/Claude/TesteSkill/f1_screenshots_v3'
mkdirSync(dir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
await page.setViewportSize({ width: 1440, height: 900 })

// 1. Home com hero-bg
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 20000 })
await page.waitForTimeout(4000)
await page.screenshot({ path: `${dir}/01_home_bg.png` })

// 2. McLaren team page
await page.goto('http://localhost:5173/team/mclaren', { waitUntil: 'networkidle', timeout: 15000 })
await page.waitForTimeout(3000)
await page.screenshot({ path: `${dir}/02_team_mclaren.png` })

// 3. Ferrari
await page.goto('http://localhost:5173/team/ferrari', { waitUntil: 'networkidle', timeout: 15000 })
await page.waitForTimeout(2000)
await page.screenshot({ path: `${dir}/03_team_ferrari.png` })

// 4. Red Bull
await page.goto('http://localhost:5173/team/red_bull', { waitUntil: 'networkidle', timeout: 15000 })
await page.waitForTimeout(2000)
await page.screenshot({ path: `${dir}/04_team_redbull.png` })

// 5. Mercedes
await page.goto('http://localhost:5173/team/mercedes', { waitUntil: 'networkidle', timeout: 15000 })
await page.waitForTimeout(2000)
await page.screenshot({ path: `${dir}/05_team_mercedes.png` })

// 6. Monaco circuit
await page.goto('http://localhost:5173/circuit/monaco', { waitUntil: 'networkidle', timeout: 15000 })
await page.waitForTimeout(3000)
await page.screenshot({ path: `${dir}/06_circuit_monaco.png` })

// 7. Interlagos
await page.goto('http://localhost:5173/circuit/interlagos', { waitUntil: 'networkidle', timeout: 15000 })
await page.waitForTimeout(2000)
await page.screenshot({ path: `${dir}/07_circuit_interlagos.png` })

// 8. Silverstone
await page.goto('http://localhost:5173/circuit/silverstone', { waitUntil: 'networkidle', timeout: 15000 })
await page.waitForTimeout(2000)
await page.screenshot({ path: `${dir}/08_circuit_silverstone.png` })

// 9. Driver Antonelli (portrait placeholder)
await page.goto('http://localhost:5173/driver/antonelli', { waitUntil: 'networkidle', timeout: 15000 })
await page.waitForTimeout(3000)
await page.screenshot({ path: `${dir}/09_driver_antonelli.png` })

await browser.close()
console.log('Done:', dir)

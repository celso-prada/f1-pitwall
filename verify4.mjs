import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const dir = 'C:/Claude/TesteSkill/f1_screenshots_v4'
mkdirSync(dir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
await page.setViewportSize({ width: 1440, height: 900 })

const routes = [
  ['team_aston',    '/team/aston_martin'],
  ['team_alpine',   '/team/alpine'],
  ['team_williams', '/team/williams'],
  ['circuit_suzuka',  '/circuit/suzuka'],
  ['circuit_spa',     '/circuit/spa'],
  ['circuit_yas',     '/circuit/yas_marina'],
  ['circuit_americas','/circuit/americas'],
]

for (const [name, path] of routes) {
  await page.goto(`http://localhost:5173${path}`, { waitUntil: 'networkidle', timeout: 15000 })
  await page.waitForTimeout(2000)
  await page.screenshot({ path: `${dir}/${name}.png` })
  console.log(`✓ ${name}`)
}

await browser.close()
console.log('Done:', dir)

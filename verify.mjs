import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import path from 'path';

const dir = 'C:/Claude/TesteSkill/f1_screenshots';
mkdirSync(dir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1400, height: 900 });

// 1. Home page
console.log('=== HOME PAGE ===');
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 25000 });
await page.waitForTimeout(4000);
await page.screenshot({ path: `${dir}/01_home.png` });
const homeTitle = await page.title();
console.log('Title:', homeTitle);
const bgColor = await page.$eval('body', el => getComputedStyle(el).backgroundColor);
console.log('Body bg:', bgColor);
const hasStandings = await page.locator('text=/McLaren|Ferrari|Red Bull|Mercedes/i').count();
console.log('Team names visible:', hasStandings);
const hasHeader = await page.locator('text=PITWALL').count();
console.log('Header PITWALL visible:', hasHeader);
const consoleErrors = [];
page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

// 2. Live page
console.log('\n=== LIVE PAGE ===');
await page.click('text=Ao Vivo');
await page.waitForTimeout(5000);
await page.screenshot({ path: `${dir}/02_live.png` });
const liveSections = await page.locator('text=/Torre de Posições|Race Control|Condições|Pit Stop/').count();
console.log('Live sections visible:', liveSections);

// 3. Standings
console.log('\n=== STANDINGS PAGE ===');
await page.click('text=Classificação');
await page.waitForTimeout(3000);
await page.screenshot({ path: `${dir}/03_standings.png` });
const tabs = await page.locator('button:has-text("Pilotos"), button:has-text("Construtores")').count();
console.log('Standings tabs:', tabs);

// Switch to constructors tab
await page.click('button:has-text("Construtores")');
await page.waitForTimeout(1500);
await page.screenshot({ path: `${dir}/04_constructors.png` });
const constructors = await page.locator('text=/McLaren|Ferrari|Red Bull/i').count();
console.log('Constructor names visible:', constructors);

// 4. Calendar
console.log('\n=== CALENDAR ===');
await page.click('text=Calendário');
await page.waitForTimeout(2000);
await page.screenshot({ path: `${dir}/05_calendar.png` });
const gps = await page.locator('text=/Grand Prix|GP/').count();
console.log('Race entries visible:', gps);

// 5. Click first driver in standings
console.log('\n=== DRIVER DETAIL ===');
await page.goto('http://localhost:5173/standings', { waitUntil: 'networkidle' });
await page.waitForTimeout(4000);
await page.screenshot({ path: `${dir}/06_standings_loaded.png` });
const driverRows = await page.locator('.card-hover').count();
console.log('Clickable rows:', driverRows);
if (driverRows > 0) {
  await page.locator('.card-hover').first().click();
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${dir}/07_driver_detail.png` });
  console.log('Driver URL:', page.url());
}

// API direct check
console.log('\n=== API CHECKS ===');
const jolpica = await page.evaluate(async () => {
  try {
    const r = await fetch('https://api.jolpi.ca/ergast/f1/current/driverStandings.json');
    const d = await r.json();
    const list = d.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings ?? [];
    return { count: list.length, leader: list[0]?.Driver?.familyName };
  } catch (e) { return { error: e.message }; }
});
console.log('Jolpica standings:', JSON.stringify(jolpica));

const openf1 = await page.evaluate(async () => {
  try {
    const r = await fetch('https://api.openf1.org/v1/sessions?session_type=Race&year=2025');
    const d = await r.json();
    return { count: d.length, last: d.at(-1)?.country_name };
  } catch (e) { return { error: e.message }; }
});
console.log('OpenF1 sessions:', JSON.stringify(openf1));

console.log('\nConsole errors:', consoleErrors.slice(0, 5));
await browser.close();
console.log('\nAll screenshots saved to:', dir);

// Gera os ícones PWA rasterizando um SVG com o Chromium do Playwright (já é
// devDependency). Evita depender de sharp/canvas. Saída em public/icons/.
// Scratch file (gitignored) — rodar com `node _geticons.mjs`.
import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'

const ICON = (size, pad) => {
  const r = Math.round(size * 0.22)
  const inset = Math.round(size * pad)
  const box = size - inset * 2
  const br = Math.round(box * 0.22)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${r}" fill="#0a0a0a"/>
    <rect x="${inset}" y="${inset}" width="${box}" height="${box}" rx="${br}" fill="#e10600"/>
    <text x="50%" y="50%" dy="0.02em" text-anchor="middle" dominant-baseline="central"
      font-family="Arial Black, Arial, sans-serif" font-weight="900"
      font-size="${Math.round(box * 0.5)}" fill="#ffffff" letter-spacing="-2">F1</text>
    <rect x="${inset}" y="${inset + box - Math.round(box * 0.12)}" width="${box}" height="${Math.round(box * 0.12)}"
      rx="0" fill="#ffffff" opacity="0.0"/>
  </svg>`
}

async function render(page, svg, size, out) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;background:transparent}</style></head>
    <body>${svg}</body></html>`
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(html, { waitUntil: 'networkidle' })
  const el = await page.$('svg')
  const buf = await el.screenshot({ omitBackground: true })
  await writeFile(out, buf)
  console.log('wrote', out)
}

const browser = await chromium.launch()
const page = await browser.newPage({ deviceScaleFactor: 1 })
await mkdir('public/icons', { recursive: true })
// any-purpose: arte cheia. maskable: padding de ~10% (safe area do Android).
await render(page, ICON(192, 0), 192, 'public/icons/icon-192.png')
await render(page, ICON(512, 0), 512, 'public/icons/icon-512.png')
await render(page, ICON(512, 0.1), 512, 'public/icons/maskable-512.png')
await browser.close()

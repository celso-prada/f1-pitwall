// Núcleo compartilhado do feed AO VIVO oficial da F1 (livetiming.formula1.com).
//
// O OpenF1 passou a BLOQUEAR todo acesso durante sessões ao vivo (exige chave
// paga). A única fonte gratuita com dados em tempo real é o feed oficial via
// SignalR Core. O browser não consegue consumi-lo direto (negotiate sem CORS +
// a WebSocket API do navegador não deixa enviar Cookie/headers), então este
// código roda no servidor (função serverless do Vercel em prod, plugin do Vite
// em dev) e devolve um snapshot JSON ao cliente.
//
// Truque que torna isso compatível com Vercel: ao conectar, o método `Subscribe`
// do SignalR responde com o ESTADO ATUAL COMPLETO da sessão (mensagem type 3).
// Não é preciso manter o socket aberto — cada poll abre, pega o snapshot e
// fecha em ~1-2s, dentro do limite de uma função serverless.
import WebSocket from 'ws'
import zlib from 'node:zlib'

const HUB = 'https://livetiming.formula1.com/signalrcore'
const STATUS_URL = 'https://livetiming.formula1.com/static/StreamingStatus.json'
const RS = String.fromCharCode(0x1e) // record separator do SignalR Core
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126 Safari/537.36'

// Tópicos do feed. CarData.z/Position.z são best-effort (nem sempre chegam no
// snapshot inicial); o resto forma a tela de timing completa.
const TOPICS = [
  'Heartbeat', 'ExtrapolatedClock', 'TopThree', 'TimingStats', 'TimingAppData',
  'WeatherData', 'TrackStatus', 'DriverList', 'RaceControlMessages', 'SessionInfo',
  'SessionData', 'LapCount', 'TimingData', 'TeamRadio', 'PitLaneTimeCollection',
  'TyreStintSeries', 'SessionStatus', 'CarData.z', 'Position.z',
]

function inflate(b64) {
  try { return JSON.parse(zlib.inflateRawSync(Buffer.from(b64, 'base64')).toString()) }
  catch { return null }
}

function offsetMs(gmt) {
  const m = /^(-?)(\d{2}):(\d{2}):(\d{2})/.exec(gmt || '')
  if (!m) return 0
  return (m[1] === '-' ? -1 : 1) * ((+m[2]) * 3600 + (+m[3]) * 60 + (+m[4])) * 1000
}

// Evento ao vivo MAIS RECENTE que já terminou (dentro das últimas 24h) — para o
// banner "Último evento ao vivo" no fim de semana, quando o feed não está mais
// transmitindo. Lido do Index.json oficial (datas são wall-clock + GmtOffset).
const RECENT_WINDOW_MS = 24 * 3600 * 1000
export async function getRecentEvent() {
  try {
    const year = new Date().getFullYear()
    const r = await fetch(`https://livetiming.formula1.com/static/${year}/Index.json`, {
      headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(6000),
    })
    if (!r.ok) return null
    const idx = JSON.parse((await r.text()).replace(/^﻿/, ''))
    const now = Date.now()
    let best = null
    for (const mtg of idx.Meetings ?? []) {
      for (const s of mtg.Sessions ?? []) {
        if (!s.EndDate) continue
        const endUtc = Date.parse(s.EndDate + 'Z') - offsetMs(s.GmtOffset)
        if (endUtc <= now && now - endUtc <= RECENT_WINDOW_MS) {
          if (!best || endUtc > best.endUtc) best = { endUtc, gp: mtg.Name, name: s.Name, type: s.Type }
        }
      }
    }
    return best ? { gp: best.gp, name: best.name, type: best.type } : null
  } catch { return null }
}

// O StreamingStatus.json fica "grudado" em "Available" mesmo DEPOIS da sessão
// acabar (a F1 só o reseta horas depois). Então "Available" não basta para
// afirmar que está ao vivo — é preciso olhar o estado real dentro do snapshot.
// Uma sessão encerrada se identifica por: SessionStatus = Finalised/Ends, ou
// SessionInfo.ArchiveStatus = Complete, ou SessionInfo.SessionStatus = Finalised.
function sessionEnded(snapshot) {
  const ss = snapshot?.SessionStatus?.Status
  if (ss === 'Finalised' || ss === 'Ends') return true
  if (snapshot?.SessionInfo?.ArchiveStatus?.Status === 'Complete') return true
  if (snapshot?.SessionInfo?.SessionStatus === 'Finalised') return true
  return false
}

// Monta o "evento recente" a partir do próprio snapshot (usado quando o feed
// ainda responde mas a sessão já terminou). Evita um fetch extra ao Index.json.
function recentFromSnapshot(snapshot) {
  const si = snapshot?.SessionInfo
  if (!si) return null
  return { gp: si.Meeting?.Name, name: si.Name, type: si.Type }
}

// Há sessão transmitindo agora? StreamingStatus.json é minúsculo e público.
export async function getStreamingStatus() {
  try {
    const r = await fetch(STATUS_URL, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(6000) })
    const txt = (await r.text()).replace(/^﻿/, '') // tira BOM
    return JSON.parse(txt)?.Status || 'Offline'
  } catch { return 'Offline' }
}

// Abre o feed, captura o snapshot inicial e fecha. Resolve em ~1-2s.
export async function fetchLiveSnapshot({ timeoutMs = 8000 } = {}) {
  const neg = await fetch(`${HUB}/negotiate?negotiateVersion=1`, {
    method: 'POST', headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(6000),
  })
  if (!neg.ok) throw new Error(`negotiate ${neg.status}`)
  const setCookie = neg.headers.get('set-cookie') || ''
  const cookie = setCookie.split(',').map(c => c.split(';')[0].trim()).filter(Boolean).join('; ')
  const { connectionToken } = await neg.json()
  if (!connectionToken) throw new Error('sem connectionToken')

  const url = `wss://livetiming.formula1.com/signalrcore?id=${encodeURIComponent(connectionToken)}`
  const ws = new WebSocket(url, {
    headers: { 'User-Agent': UA, Cookie: cookie, Origin: 'https://livetiming.formula1.com' },
  })

  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { try { ws.terminate() } catch {} ; reject(new Error('timeout')) }, timeoutMs)
    const done = (fn, arg) => { clearTimeout(timer); try { ws.close() } catch {} ; fn(arg) }

    ws.on('open', () => {
      ws.send(JSON.stringify({ protocol: 'json', version: 1 }) + RS)
      ws.send(JSON.stringify({ type: 1, target: 'Subscribe', arguments: [TOPICS], invocationId: '0' }) + RS)
    })
    ws.on('message', (data) => {
      for (const part of data.toString().split(RS).filter(Boolean)) {
        let m; try { m = JSON.parse(part) } catch { continue }
        if (m.type === 3 && m.result) {
          const snap = { ...m.result }
          if (snap['CarData.z']) { snap.CarData = inflate(snap['CarData.z']); delete snap['CarData.z'] }
          if (snap['Position.z']) { snap.Position = inflate(snap['Position.z']); delete snap['Position.z'] }
          done(resolve, snap)
          return
        }
      }
    })
    ws.on('error', (e) => done(reject, e instanceof Error ? e : new Error('ws error')))
    ws.on('close', () => { clearTimeout(timer) })
  })
}

// Resposta unificada usada pelos dois handlers (serverless + vite dev).
export async function buildLiveResponse() {
  const status = await getStreamingStatus()
  if (status !== 'Available') {
    const recentEvent = await getRecentEvent()
    return { live: false, status, recentEvent, ts: Date.now() }
  }
  // Há sessão ao vivo. A captura pode falhar num cold start (negotiate/WS lento)
  // — tentamos 2x antes de desistir, para não reportar "não-live" à toa e fazer
  // o cliente piscar o modo histórico.
  let lastErr
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const snapshot = await fetchLiveSnapshot()
      // "Available" mas a sessão já terminou (status grudado): trata como
      // não-live e devolve o evento recente montado do próprio snapshot, para
      // o banner virar "Último evento ao vivo" em vez de "ao vivo agora".
      if (sessionEnded(snapshot)) {
        const recentEvent = recentFromSnapshot(snapshot) ?? await getRecentEvent()
        return { live: false, status, recentEvent, ts: Date.now() }
      }
      return { live: true, status, snapshot, ts: Date.now() }
    } catch (err) { lastErr = err }
  }
  return { live: false, status, error: String(lastErr?.message || lastErr), ts: Date.now() }
}

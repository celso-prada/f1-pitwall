# Roadmap — F1 Pitwall

Plano de evolução do sistema. Objetivo do projeto: uma **mesa de pit wall** para
fã heavy que assiste ao lado da TV — densa, estilo broadcast/telemetria, dados
reais (sem mock), PT-BR, publicada no Vercel.

> Princípio que orienta tudo: o **OpenF1 bloqueia durante o ao vivo** (exige
> chave paga) e tanto ele quanto a Jolpica são instáveis. Já temos a fonte
> oficial (`signalrcore`) e o **arquivo estático pós-sessão** (`.jsonStream`,
> que libera quando a sessão acaba). Boa parte do plano é migrar o sistema para
> essas fontes mais ricas e confiáveis.

## 1. Robustez de dados (fundação) — alta prioridade
- [ ] **1.1 Fotos dos pilotos pelo feed oficial.** Hoje `useDriverPhotos` usa
  OpenF1 `/drivers` (quebra no ao vivo). O `/api/live` já traz `HeadshotUrl`;
  usar o `DriverList` oficial como fonte primária. *Baixo.*
- [ ] **1.2 Resultados/timing pós-sessão via arquivo oficial.** Após a sessão,
  baixar `TimingData/TimingAppData/Laps` do estático oficial (sem rate-limit,
  sem lockout) como fonte primária das sessões recentes; OpenF1/Jolpica viram
  fallback. *Médio.*
- [ ] **1.3 Camada de dados unificada + documentada.** Consolidar a estratégia
  de fallback num resolver por tipo de dado e atualizar `DATA_SOURCES.md`. *Médio.*
- [x] **1.4 Error boundaries por painel.** Um widget que falha não apaga a
  página. *Baixo.* — feito: `ErrorBoundary` embutido no `Panel` (todo painel
  isola sua falha com aviso discreto) + boundary de rota no `App` (key no
  pathname remonta ao navegar).

## 2. Experiência "ao lado da TV" — alto valor
- [~] **2.1 Sincronia de atraso (delay).** ~~Atrasar o timing em X s para casar
  com o atraso da transmissão.~~ **Descartado por decisão do produto (2026-06):**
  o valor do app é justamente ver o ao vivo À FRENTE da TV; manter assim.
- [~] **2.2 Alertas/notificações (PWA push).** ~~Piloto/equipe favoritos: início
  de sessão, bandeira vermelha/SC, pit, volta mais rápida, eliminação na quali.~~
  **Adiado por decisão (2026-06):** depende de infra (chaves VAPID + store de
  inscrições, ex.: Vercel KV) ainda não provisionada. Reabrir quando houver.
- [x] **2.3 PWA instalável + "Modo TV" (fullscreen).** App de verdade na segunda
  tela, shell offline, tela cheia. *Médio.* — feito: `manifest.webmanifest` +
  ícones (192/512/maskable, gerados via Playwright), service worker à mão
  (`/api/*` nunca cacheado, navegação network-first, assets cache-first),
  registro com auto-update, botão "Modo TV" (Fullscreen API) no header.
- [x] **2.4 Modo "seguir piloto".** Fixar 1–2 pilotos no topo da torre. *Baixo-médio.*
  — feito: hook `useFollowedDrivers` (persistido em localStorage, máx. 2), faixa
  "Seguindo" no topo da `OfficialTower` + estrela nas linhas; toggle no popup do
  piloto.

## 3. Pós-sessão & replay
- [ ] **3.1 Replay da sessão (timeline scrub)** com o arquivo estático. *Alto.*
- [x] **3.2 Decisões dos comissários / penalidades** (de `RaceControlMessages`). *Baixo.*
  — feito: `extractPenalties`/`classifyPenalty` (puros, testados) classificam o
  race control em punição/investigação/advertência/tempo deletado/sem ação;
  painel `StewardDecisions` no /live (resolve nº do carro → TLA).
- [x] **3.3 Resumo automático da sessão (IA, PT-BR).** *Médio.* — feito:
  `summarizeSession` + componente `SessionSummary` (boletim de pit wall sob
  demanda a partir do snapshot ao vivo). **Oculto por ora** (gate `AI_ENABLED`
  em `src/config.js`) junto com o chat — código pronto, só não renderiza.

## 4. Telemetria & análise (`/telemetria` existe)
- [ ] **4.1 Telemetria pós-sessão pelo arquivo oficial** (verificar se
  `CarData.z`/`Position.z` ficam acessíveis no estático após a sessão → telemetria
  de todos + mapa de pista, sem OpenF1). *Médio; começa com verificação.*
- [x] **4.2 Comparação de minisetores e "volta ideal" detalhada.** *Baixo-médio.*
  — feito: `buildIdealComparison` (pura, testada) + tabela no painel de setores
  do /live: por piloto, S1/S2/S3 pessoais, volta ideal (soma) vs. melhor real e
  Δ (tempo deixado na pista); setor melhor da sessão em roxo, menor Δ em verde.
- [ ] **4.3 Gráficos de delta volta-a-volta e degradação de pneu.** *Médio.*

## 5. Inteligência / IA como analista
- [x] **5.1 Chat com contexto ao vivo real** ("quem é mais rápido no S2",
  "janela de undercut?"). *Médio.* — feito: o PITWALL AI (que estava definido mas
  NÃO montado) agora é montado global e lazy no `App`. Em sessão ao vivo, recebe
  a cronometragem completa no contexto (posições, gaps, pneus, melhores setores +
  donos, clima, bandeira, punições — via `buildLiveContext` reusando
  `computeSessionBests`/`extractPenalties`). Sugestões ao vivo + prompt caching
  do system prompt. **Oculto por ora** (gate `AI_ENABLED` em `src/config.js`).
- [ ] **5.2 Estratégia ao vivo** — undercut/overcut tracker
  (`PitLaneTimeCollection` + stints) e janela de pit estimada. *Médio.*

## 6. Conteúdo & histórico
- [x] **6.1 Comparação head-to-head de pilotos.** *Médio.* — feito: página
  `/comparar` (link na Classificação) compara 2 pilotos na temporada atual:
  confronto direto corrida×corrida e quali×quali + pontos/vitórias/pódios/poles/
  melhor result./média/DNFs. Helpers puros `summarizeSeason`/`headToHead`
  (testados); dados via `getDriverResults` (Jolpica→f1api, já redundante).
- [x] **6.2 Página de recordes/estatísticas + progressão de campeonato.** *Médio.*
  — feito: página `/recordes` (link na Classificação) com cards de superlativos
  (líder, vantagem, mais vitórias, pilotos pontuando) + gráfico de progressão de
  pontos acumulados rodada a rodada (top 6). Helpers puros `cumulativePoints`/
  `buildProgression`/`seasonHighlights` (testados); top-N via `useQueries`.
- [x] **6.3 Enriquecer páginas de piloto/equipe** (estender uso da Wikipedia). *Baixo-médio.*
  — feito: a página de piloto já tinha foto+bio+stats; faltava a equipe. Agora a
  `/team` ganha painel "Sobre a Equipe" (extract PT-BR + logo + leia mais) pela
  mesma rota Wikipedia dos pilotos.

## 7. Engenharia & performance
- [x] **7.1 Code-splitting por rota** (bundle ~932KB; lazy-load de
  `/live`, `/telemetria`, Recharts). *Baixo-médio, ganho imediato.* — feito:
  rotas via `lazy()`+`Suspense` (Home eager), Recharts/framer-motion em chunks
  próprios. Entry caiu para ~287KB (gzip 90KB); Recharts (366KB) só carrega nas
  rotas de gráfico.
- [x] **7.2 Testes das funções puras** (`normalizeLive`, `computeSessionBests`,
  `deriveTrackStatus`, parsers). *Baixo.* — feito: Vitest + 51 testes cobrindo
  `live.js`, `livetiming.js` e `format.js` (`npm test`). De quebra, zerados os 5
  lints pré-existentes (imports não usados + set-state-in-effect derivado).
- [x] **7.3 Endpoint de saúde das fontes** (status de cada upstream). *Baixo.* —
  feito: `/api/health` (core `_health.mjs`, também servido em dev pelo Vite)
  pinga as 7 fontes em paralelo; página `/status` (link discreto no header)
  mostra estado + latência de cada uma.

## Sequência recomendada
1. 1.1 fotos + 7.1 code-splitting (fecham pontas, ganho imediato).
2. 2.1 sincronia de delay + 2.3 PWA (maior impacto no objetivo).
3. 1.2 + 3.1 arquivo pós-sessão / replay (evolução estrutural + recurso "uau").

## Dependem de verificação primeiro
- 4.1 / mapa de pista: confere se `Position.z`/`CarData.z` ficam no estático
  **após** a sessão (no ao vivo não ficam).

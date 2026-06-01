# Fontes de dados F1 — status e recursos

Testado em 2026-06-01. Status real verificado via curl.

## Status das APIs (testado)

| Fonte | Status hoje | Limite | Tem 2026? |
|-------|-------------|--------|-----------|
| **Jolpica** (`api.jolpi.ca`) | ❌ FORA (HTTP 000) | — | sim, quando volta |
| **f1api.dev** (`f1api.dev/api`) | ✅ no ar (~4s) | livre p/ uso pessoal | ✅ sim |
| **OpenF1** (`api.openf1.org/v1`) | ✅ no ar (<1s) | 3 req/s, 30 req/min (free) | ✅ sim, com sessões |
| **TheSportsDB** (`/api/v1/json/123`) | ✅ no ar | 30 req/min (key `123`) | calendário/mídia |
| **API-Sports** (`v1.formula-1.api-sports.io`) | 🔑 403 sem chave | 100 req/dia | precisa cadastro |

## O que cada uma cobre (do que já usamos / queremos)

### f1api.dev — dados ESTRUTURAIS (já integrado como fallback)
- `/{season}/drivers-championship` · `/{season}/constructors-championship` — classificações
- `/{season}` — calendário · `/current/last/race` — última corrida
- `/{season}/{round}/race` — resultado de corrida (com fastLap, grid, time, retired)
- `/{season}/{round}/qualy` — Q1/Q2/Q3
- `/drivers/{id}` — bio · `/{season}/drivers/{id}` — temporada do piloto
- `/current/drivers`, `/current/teams`, `/circuits` — listas

### OpenF1 — dados de PISTA / TEMPO REAL (não integrado ainda)
- `/meetings?year=2026` — GPs com **imagem do circuito** + **bandeira do país** (URLs media.formula1.com)
- `/sessions?meeting_key=latest` — treinos/sprint/qualy/corrida com horários
- `/drivers?session_key=X` — **headshot_url (foto do piloto)** + team_colour oficial
- `/session_result` — classificação final (posição, pontos, gap, dnf, voltas)
- `/position` — posição volta a volta (timeline de ultrapassagens)
- `/stints` — **estratégia de pneus** (composto + stint)
- `/pit` — paradas (duração)
- `/weather` — temp ar/pista, chuva, vento, umidade, pressão
- `/race_control` — bandeiras, SC/VSC, investigações, penalidades
- `/team_radio` — áudios de rádio (mp3)
- `/car_data` — telemetria: speed, throttle, brake, rpm, drs, gear
- `/intervals` — gap ao líder / ao da frente (ao vivo)
- `/laps` — tempo por volta + setores

### TheSportsDB — calendário/mídia leve (não integrado)
- `eventsnextleague.php?id=4370` — próximos eventos da F1 com horário/data

## Recursos que dá pra construir

### A. Visual sem custo (OpenF1 traz imagens prontas)
1. **Fotos reais dos pilotos** — `headshot_url` resolve o `driver-placeholder.png`. Cobre cards de standings, página do piloto, pódio.
2. **Bandeiras dos países** por GP — `country_flag` do `/meetings`.
3. **Cores oficiais de equipe** — `team_colour` do `/drivers` (substitui o map manual em teamColors.js, ou valida).

### B. Pit Wall ao vivo (a página /live ganha vida real)
4. **Painel de clima** — temp pista/ar, chuva, vento ao vivo (`/weather`).
5. **Estratégia de pneus** — barra de stints por piloto, composto colorido (`/stints`).
6. **Race control feed** — bandeiras, safety car, penalidades em tempo real (`/race_control`).
7. **Gaps ao vivo** — intervalo p/ líder e p/ carro da frente (`/intervals`).
8. **Posições volta a volta** — gráfico de "battle"/ultrapassagens (`/position`).
9. **Rádio da equipe** — player dos áudios mais recentes (`/team_radio`).
10. **Telemetria comparativa** — speed/throttle/brake/gear de 2 pilotos na volta rápida (`/car_data` + `/laps`).

### C. Resiliência (parte já feita)
11. Fallback f1api.dev já cobre: standings, calendário, última corrida, **resultado de corrida, qualy, piloto** (commit 190aa20).
12. **Próximo:** usar OpenF1 `/session_result` como 2ª camada de fallback para resultados (quando Jolpica E f1api falharem), já que é a fonte mais rápida e estável.

## Prioridade sugerida
1. Fotos dos pilotos + bandeiras (impacto visual alto, custo baixo) — OpenF1 estático.
2. Painel de clima + pneus + race control na /live (transforma o pit wall).
3. Telemetria comparativa (recurso "wow", mais trabalho).

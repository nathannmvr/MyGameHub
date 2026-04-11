# Game Hub Pessoal

Monorepo do Game Hub Pessoal com frontend React/Vite e backend Express/Prisma.

## Estado atual (abril/2026)

- Busca de catálogo com RAWG como primária e fallback IGDB
- Adição manual de jogos (título + capa opcional), mesmo sem match em API externa
- Sync Steam com fallback robusto, capa em alta resolução e classificação por recência + horas
- Biblioteca com paginação navegável e prioridade de ordenação configurável
- Busca global no header para pesquisar jogos já cadastrados na biblioteca
- Descoberta com perfil de recomendação selecionável (`conservative` / `exploratory`)
- Ação "Não recomendar" na página Descobrir com aprendizagem contínua no backend
- Penalização de anti-preferências (jogos `DROPPED` e avaliações baixas) no ranking
- Explainability no Discover com `reason` por item recomendado
- Telemetria de Discovery (impressão, dismiss, add_to_library, open_details, hide) com persistência backend
- Motor V2 com candidate generation multi-fonte (afinidade, item-item, trending, novidade)
- Scoring multiobjetivo no backend (afinidade, diversidade, novidade, robustez, penalização)
- Cold-start no frontend com fallback de discover e estado dedicado

## Stack

- Frontend: React 19, Vite, TypeScript, React Query, Playwright
- Backend: Node.js, Express, Prisma, BullMQ
- Banco: PostgreSQL
- Fila/cache: Redis (com fallback local de sync no ambiente dev)

## Estrutura

- apps/server: API REST
- apps/web: SPA
- packages/shared: tipos, contratos e enums compartilhados

## Requisitos

- Node.js 20+
- pnpm 9+
- PostgreSQL local
- Redis local (recomendado)

## Configuração

1. Instale dependências na raiz:

```bash
pnpm install
```

2. Configure variáveis em `.env` (baseado em `.env.example`):

```env
DATABASE_URL="postgresql://postgres:root@localhost:5432/GameHubPessoal?schema=public"
REDIS_URL="redis://localhost:6379"
RAWG_API_KEY="your_rawg_api_key_here"
IGDB_CLIENT_ID="your_igdb_client_id"
IGDB_CLIENT_SECRET="your_igdb_client_secret"
STEAM_API_KEY="your_steam_api_key_here"
PORT=3001
NODE_ENV="development"
CORS_ORIGIN="http://localhost:5173"
VITE_API_URL="http://localhost:3001"
```

3. Aplique migrações e seed:

```bash
pnpm --filter @gamehub/server exec prisma migrate dev
pnpm --filter @gamehub/server exec prisma db seed
```

## Execução local (ordem obrigatória)

1. Suba a API primeiro:

```bash
pnpm --filter @gamehub/server dev
```

2. Em outro terminal, suba o frontend:

```bash
pnpm --filter @gamehub/web dev
```

Se houver erro de porta ocupada na API (`EADDRINUSE: 3001`), finalize o processo anterior e rode novamente.

## Endpoints importantes

- Health: `http://localhost:3001/api/health`
- API v1: `http://localhost:3001/api/v1`
- Discover feedback: `POST http://localhost:3001/api/v1/discover/feedback`
- OpenAPI JSON: `http://localhost:3001/api/openapi.json`
- Swagger UI: `http://localhost:3001/api/docs`
- Frontend: `http://localhost:5173`

## Testes e qualidade

### Frontend

```bash
pnpm --filter @gamehub/web lint
pnpm --filter @gamehub/web build
pnpm --filter @gamehub/web test
pnpm --filter @gamehub/web test:e2e
```

Observação: `test:e2e` faz seed do backend automaticamente antes de rodar Playwright.

### Backend

```bash
pnpm --filter @gamehub/server test
```

### Workspace completo

```bash
pnpm lint
pnpm build
pnpm test
```

## Notas de desenvolvimento

- As rotas do frontend usam contratos de `@gamehub/shared` já prefixados com `/api/v1`.
- Em desenvolvimento local sem chaves externas, há fallback para manter fluxos críticos funcionais (Steam fixture/local).
- A busca de jogos para adicionar usa RAWG e pode complementar com IGDB; resultados são persistidos localmente quando possível.
- A sincronização Steam recalcula status apenas quando você executa uma nova sync.
- Arquivos de processo SDD (`spec.md`, `design.md`, `tasks.md`, `.ai/`) são locais/ignorados por padrão.

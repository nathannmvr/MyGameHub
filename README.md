# Game Hub Pessoal

Monorepo do Game Hub Pessoal com frontend React/Vite e backend Express/Prisma.

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

## Endpoints importantes

- Health: `http://localhost:3001/api/health`
- API v1: `http://localhost:3001/api/v1`
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
- Em desenvolvimento local sem chaves externas, há fallback para manter fluxos críticos funcionais.
- Arquivos de processo SDD (`spec.md`, `design.md`, `tasks.md`, `.ai/`) são locais/ignorados por padrão.

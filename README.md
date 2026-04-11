# Game Hub Pessoal

Monorepo do Game Hub Pessoal com frontend React/Vite e backend Express/Prisma.

## Estado atual (abril/2026)

- Autenticação real com conta: registro, login, logout e sessão persistente via cookie seguro
- Isolamento multiusuário em biblioteca, plataformas, dashboard, discover e sync Steam
- Rotas privadas protegidas por middleware de autenticação (sem fallback de usuário default)

- Busca de catálogo com RAWG como primária e fallback IGDB
- Adição manual de jogos (título + capa opcional), mesmo sem match em API externa
- Sync Steam com fallback robusto, capa em alta resolução e classificação por recência + horas
- Biblioteca com paginação navegável e prioridade de ordenação configurável
- Busca global no header para pesquisar jogos já cadastrados na biblioteca
- Descoberta com perfil de recomendação selecionável (`conservative` / `exploratory`), com fallback controlado quando conservador filtra excessivamente
- Ação "Não recomendar" na página Descobrir com aprendizagem contínua no backend
- Penalização de anti-preferências (jogos `DROPPED` e avaliações baixas) no ranking
- Explainability no Discover com `reason` por item recomendado
- Telemetria de Discovery (impressão, dismiss, add_to_library, open_details, hide) com persistência backend
- Motor V2 com candidate generation multi-fonte (afinidade, item-item, trending, novidade)
- Scoring multiobjetivo no backend (afinidade, diversidade, novidade, robustez, penalização)
- Cold-start no frontend com fallback de discover e estado dedicado
- Definições simplificadas: apenas sincronização Steam (sem formulário de perfil local sem persistência)

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
CORS_ALLOWED_ORIGINS="http://localhost:5173"
SESSION_COOKIE_NAME="gh_session"
SESSION_TTL_DAYS=30
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

## Fase 18 concluída: autenticação e multiusuário

Implementação final da Fase 18 entregue com:

- Cadastro, login, logout e sessão persistente com cookie HTTP-only
- Middleware de autenticação em rotas privadas
- Isolamento real de dados por usuário (sem fallback default)
- Páginas de conta no frontend com guards de rota
- Hardening mínimo de produção (rate limit, CORS restritivo e helmet)

### Fluxo de autenticação

1. No frontend, abra `http://localhost:5173/login`.
2. Crie conta em `Criar conta`.
3. Faça login para iniciar sessão persistente (cookie HTTP-only).
4. Acesse as rotas privadas normalmente (`/`, `/library`, `/discover`, `/platforms`, `/settings`).
5. Sem sessão válida, o app redireciona para `/login`.

## Endpoints importantes

- Health: `http://localhost:3001/api/health`
- API v1: `http://localhost:3001/api/v1`
- Discover feedback: `POST http://localhost:3001/api/v1/discover/feedback`
- Discover metrics: `GET http://localhost:3001/api/v1/discover/metrics`
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

## Deploy recomendado (produção)

- Frontend: Vercel (`apps/web`)
- API: Render Web Service (`apps/server`)
- PostgreSQL: Render PostgreSQL
- Redis: Render Redis
- Pipeline CI/CD: `.github/workflows/ci-cd.yml`
- Runbook operacional: `docs/runbook.md`

## Fase 19 concluída (SMTP Gmail)

- Recuperação de senha real implementada com `POST /api/v1/auth/forgot-password`.
- Redefinição de senha implementada com `POST /api/v1/auth/reset-password`.
- Token de reset com hash persistido, expiração máxima de 60 minutos e consumo único.
- Resposta neutra mantida para evitar enumeração de contas no forgot-password.
- Frontend com rota pública `/reset-password` integrada ao backend real.

## Notas de desenvolvimento

- As rotas do frontend usam contratos de `@gamehub/shared` já prefixados com `/api/v1`.
- O payload de feedback de Discover aceita `eventType` opcional para telemetria detalhada.
- Em desenvolvimento local sem chaves externas, há fallback para manter fluxos críticos funcionais (Steam fixture/local).
- A busca de jogos para adicionar usa RAWG e pode complementar com IGDB; resultados são persistidos localmente quando possível.
- A sincronização Steam recalcula status apenas quando você executa uma nova sync.
- Arquivos de processo SDD (`spec.md`, `design.md`, `tasks.md`, `.ai/`) são locais/ignorados por padrão.

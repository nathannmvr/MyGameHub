# Game Hub Web (apps/web)

Frontend React/Vite do SAASGamer.

## Status atual

- Fase 19 concluída no frontend
- Fluxos de autenticação implementados: login, registro, forgot-password neutro e reset-password real
- Guards de rota ativos para áreas privadas
- Tratamento de sessão expirada com redirecionamento para login

## Rotas principais

- /login
- /register
- /forgot-password
- /reset-password
- /
- /library
- /discover
- /platforms
- /settings

## Desenvolvimento

1. Instalar dependências na raiz do monorepo:

```bash
pnpm install
```

2. Iniciar frontend:

```bash
pnpm --filter @gamehub/web dev
```

3. Rodar qualidade local:

```bash
pnpm --filter @gamehub/web lint
pnpm --filter @gamehub/web test
pnpm --filter @gamehub/web build
```

## Integração com backend

- Base URL via VITE_API_URL
- Cliente HTTP envia cookies de sessão com withCredentials
- Contratos de rota compartilhados em @gamehub/shared

## Observações de segurança

- A solicitação de recuperação sempre retorna feedback neutro para evitar enumeração de contas.
- O token de reset é validado no backend e pode expirar/ser invalidado após uso.

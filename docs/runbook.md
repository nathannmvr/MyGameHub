# Runbook de producao - SAASGamer (Fase 18)

## Topologia recomendada
- Frontend SPA: Vercel (apps/web)
- API Node/Express: Render Web Service (apps/server)
- Banco: Render PostgreSQL
- Cache/Fila: Render Redis

## Variaveis obrigatorias
- DATABASE_URL
- REDIS_URL
- RAWG_API_KEY
- STEAM_API_KEY
- CORS_ORIGIN
- CORS_ALLOWED_ORIGINS
- SESSION_COOKIE_NAME
- SESSION_TTL_DAYS
- NODE_ENV=production

## Sequencia de deploy
1. Aplicar migracoes: `pnpm --filter @gamehub/server exec prisma migrate deploy`
2. Deploy da API (Render)
3. Validar healthcheck da API: `GET /api/health`
4. Deploy do frontend (Vercel) com `VITE_API_URL` apontando para a API publica
5. Validar login, cadastro e rotas privadas no ambiente publico

## Healthchecks e verificacoes
- API: `GET /api/health` deve retornar `success: true`
- OpenAPI: `GET /api/openapi.json`
- Auth: registrar, login, logout e acesso bloqueado sem cookie
- Redis: iniciar sync Steam e validar enfileiramento/status

## Incidentes comuns
- 401 em massa: cookie de sessao expirado ou dominio/CORS incorretos
- 429 em auth/sync/feedback: comportamento esperado de rate limit
- 500 no login: variaveis de banco ou migracao pendente
- Discover vazio: usuario sem plataformas ativas ou feedback bloqueando tudo

## Procedimento de rollback
1. Reverter deploy do frontend para a release anterior
2. Reverter deploy da API para a release anterior
3. Nao reverter migrations destrutivamente; aplicar hotfix forward-only
4. Revisar logs e reexecutar checklist de healthcheck

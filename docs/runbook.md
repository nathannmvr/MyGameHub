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
- SMTP_HOST
- SMTP_PORT
- SMTP_USER
- SMTP_PASS
- SMTP_FROM
- SMTP_RESET_BASE_URL
- NODE_ENV=production

## Configuracao Gmail para SMTP (2FA + App Password)
1. Ativar 2FA na conta Google usada para envio.
2. Em Google Account > Security > App passwords, gerar uma senha de app para "Mail".
3. Configurar variaveis:
	- SMTP_HOST=smtp.gmail.com
	- SMTP_PORT=587 (ou 465 com SMTP_SECURE=true)
	- SMTP_USER=seu_email@gmail.com
	- SMTP_PASS=senha_de_app_gerada
	- SMTP_FROM=seu_email@gmail.com
	- SMTP_RESET_BASE_URL=https://seu-frontend/reset-password
4. Reiniciar a API apos atualizar variaveis.

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
- forgot-password nao envia email: SMTP_USER/SMTP_PASS/SMTP_FROM ausentes ou invalidos
- SMTP 535/534: App Password ausente/incorreto ou 2FA desativado
- SMTP timeout/ECONNREFUSED: host/porta bloqueados por firewall/rede
- reset-password token invalido: token expirado, ja consumido ou alterado

## Troubleshooting SMTP rapido
1. Validar variaveis no ambiente de deploy (sem expor valores em logs).
2. Confirmar que a conta Google tem 2FA ativa e App Password valido.
3. Testar conectividade de saida para smtp.gmail.com:587 (ou 465).
4. Verificar logs da API para erros `SMTP_NOT_CONFIGURED`, `EAUTH`, `ETIMEDOUT`.
5. Em caso de comprometimento, revogar App Password e gerar um novo.

## Procedimento de rollback
1. Reverter deploy do frontend para a release anterior
2. Reverter deploy da API para a release anterior
3. Nao reverter migrations destrutivamente; aplicar hotfix forward-only
4. Revisar logs e reexecutar checklist de healthcheck

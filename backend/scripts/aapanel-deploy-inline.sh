#!/bin/bash
# Cole ESTE ARQUIVO INTEIRO no aaPanel → Git Manager → Script (alias: Deploy).
# Após cada deploy: git pull + build + reinício forçado do PM2 + teste das rotas.
set -e

APP_DIR="/www/wwwroot/apiassas.cdlpauloafonso.com"
BACKEND_DIR="$APP_DIR/backend"
PM2_NAME="cdl-api"

log() { printf '\n[deploy] %s\n' "$*"; }
fail() { printf '\n[deploy] ERRO: %s\n' "$*" >&2; exit 1; }

# Git 2.35+ / aaPanel: dono da pasta ≠ usuário do script → "dubious ownership"
ensure_git_safe_directory() {
  log "Configurando safe.directory para $APP_DIR ..."
  git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true
  git config --global --add safe.directory '*' 2>/dev/null || true
  if [ -d "$APP_DIR/.git" ]; then
    git -C "$APP_DIR" config --local --add safe.directory "$APP_DIR" 2>/dev/null || true
    git -C "$APP_DIR" config --local --add safe.directory '*' 2>/dev/null || true
  fi
}

# Sempre passa -c safe.directory (funciona mesmo se ~/.gitconfig não for gravável)
git_safe() {
  git -C "$APP_DIR" -c "safe.directory=$APP_DIR" "$@"
}

[ -d "$APP_DIR/.git" ] || fail "Repositório git não encontrado em $APP_DIR"
ensure_git_safe_directory

log "Atualizando código (origin/main)..."
git_safe fetch --all --prune
git_safe reset --hard origin/main
log "Commit em execução: $(git_safe rev-parse --short HEAD)"

[ -d "$BACKEND_DIR" ] || fail "Pasta backend não encontrada"
[ -f "$BACKEND_DIR/package.json" ] || fail "package.json não encontrado"

cd "$BACKEND_DIR"

if [ ! -f .env ]; then
  if [ -f .env_api.example ]; then
    cp .env_api.example .env
    chmod 600 .env
    fail ".env criado a partir de .env_api.example — preencha JWT_SECRET e FIREBASE e rode o deploy de novo"
  elif [ -f .env.production.example ]; then
    cp .env.production.example .env
    chmod 600 .env
    fail ".env criado — preencha JWT_SECRET e FIREBASE e rode o deploy de novo"
  else
    fail "Arquivo .env ausente em $BACKEND_DIR"
  fi
fi

log "Instalando dependências (inclui devDependencies para o build)..."
if [ -f package-lock.json ]; then
  npm ci --no-audit --no-fund --include=dev
else
  npm install --no-audit --no-fund
fi

log "Gerando Prisma client..."
npx --yes prisma generate

log "Compilando TypeScript..."
npm run build

[ -f dist/index.js ] || fail "Build falhou: dist/index.js não gerado"
mkdir -p uploads

log "Reiniciando API no PM2 ($PM2_NAME)..."
command -v pm2 >/dev/null 2>&1 || fail "PM2 não instalado. Rode: npm i -g pm2"

if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  NODE_ENV=production pm2 restart "$PM2_NAME" --update-env
else
  NODE_ENV=production pm2 start "$BACKEND_DIR/dist/index.js" \
    --name "$PM2_NAME" \
    --cwd "$BACKEND_DIR" \
    --time \
    --max-memory-restart 600M
  pm2 save
fi

sleep 2

log "Testando rotas públicas..."
STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4000/api/asaas/status || echo "000")
[ "$STATUS_CODE" = "200" ] || fail "GET /api/asaas/status retornou HTTP $STATUS_CODE (esperado 200)"

METHOD_CODE=$(curl -s -o /tmp/asaas-method-test.json -w "%{http_code}" -X POST \
  http://127.0.0.1:4000/api/asaas/inscription-payment/method \
  -H "Content-Type: application/json" \
  -d '{"campaignId":"deploy-check","inscriptionId":"deploy-check","method":"pix"}' || echo "000")

if [ "$METHOD_CODE" = "401" ]; then
  fail "POST /api/asaas/inscription-payment/method retornou 401 — backend antigo ou roteamento incorreto. Confira o commit $(git_safe rev-parse --short HEAD)"
fi

if [ "$METHOD_CODE" != "400" ] && [ "$METHOD_CODE" != "404" ] && [ "$METHOD_CODE" != "503" ]; then
  fail "POST /api/asaas/inscription-payment/method retornou HTTP $METHOD_CODE (esperado 400/404/503, nunca 401)"
fi

log "Deploy concluído ($(git_safe rev-parse --short HEAD)). PM2: pm2 logs $PM2_NAME"

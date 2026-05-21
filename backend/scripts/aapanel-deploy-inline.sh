#!/bin/bash
# Cole ESTE ARQUIVO INTEIRO no aaPanel → Git Manager → Script (alias: Deploy).
# Não depende de deploy.sh já existir no servidor.
set -e

APP_DIR="/www/wwwroot/apiassas.cdlpauloafonso.com"
BACKEND_DIR="$APP_DIR/backend"
PM2_NAME="cdl-api"
export NODE_ENV=production

log() { printf '\n[deploy] %s\n' "$*"; }
fail() { printf '\n[deploy] ERRO: %s\n' "$*" >&2; exit 1; }

git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true

[ -d "$APP_DIR/.git" ] || fail "Repositório git não encontrado em $APP_DIR"

# Garantir código atualizado (caso o pull do painel não tenha trazido backend/scripts)
if [ ! -d "$BACKEND_DIR" ] || [ ! -f "$BACKEND_DIR/package.json" ]; then
  log "Pasta backend ausente — atualizando repositório..."
  cd "$APP_DIR"
  git fetch --all --prune
  git reset --hard origin/main
fi

[ -d "$BACKEND_DIR" ] || fail "Pasta backend não encontrada após git pull"
[ -f "$BACKEND_DIR/package.json" ] || fail "package.json não encontrado em $BACKEND_DIR"

cd "$BACKEND_DIR"

if [ ! -f "$BACKEND_DIR/.env" ]; then
  if [ -f "$BACKEND_DIR/.env.production.example" ]; then
    log "Criando .env a partir de .env.production.example — preencha JWT e Firebase!"
    cp "$BACKEND_DIR/.env.production.example" "$BACKEND_DIR/.env"
    chmod 600 "$BACKEND_DIR/.env"
  else
    fail "Arquivo .env ausente. Crie $BACKEND_DIR/.env manualmente."
  fi
fi

log "Instalando dependências..."
if [ -f package-lock.json ]; then
  npm ci --no-audit --no-fund
else
  npm install --no-audit --no-fund
fi

log "Gerando Prisma client..."
npx --yes prisma generate

log "Compilando TypeScript..."
npm run build

[ -f dist/index.js ] || fail "Build falhou: dist/index.js não gerado"

mkdir -p uploads

log "Reiniciando PM2 ($PM2_NAME)..."
command -v pm2 >/dev/null 2>&1 || fail "PM2 não instalado. Rode: npm i -g pm2"

if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  pm2 reload "$PM2_NAME" --update-env
else
  pm2 start "$BACKEND_DIR/dist/index.js" --name "$PM2_NAME" --cwd "$BACKEND_DIR" --time --max-memory-restart 600M
  pm2 save
fi

log "Deploy concluído. Teste: curl http://127.0.0.1:4000/api/asaas/status"

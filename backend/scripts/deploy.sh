#!/usr/bin/env bash
# Deploy/atualização do backend CDL Paulo Afonso no aaPanel.
#
# Pode ser chamado pelo Git Manager → Script (alias sugerido: "deploy") ou
# executado manualmente:
#   bash /www/wwwroot/apiassas.cdlpauloafonso.com/backend/scripts/deploy.sh
#
# Variáveis (com valores padrão):
#   APP_DIR    diretório do repo clonado (default: /www/wwwroot/apiassas.cdlpauloafonso.com)
#   PM2_NAME   nome do processo no PM2 (default: cdl-api)
#   NODE_ENV   ambiente (default: production)
#   SKIP_PULL  se "1", NÃO executa git pull (use quando o painel já fez o pull)

set -euo pipefail

APP_DIR="${APP_DIR:-/www/wwwroot/apiassas.cdlpauloafonso.com}"
BACKEND_DIR="$APP_DIR/backend"
PM2_NAME="${PM2_NAME:-cdl-api}"
export NODE_ENV="${NODE_ENV:-production}"

log() { printf '\n\033[1;34m[deploy]\033[0m %s\n' "$*"; }
fail() { printf '\n\033[1;31m[deploy]\033[0m %s\n' "$*" >&2; exit 1; }

[ -d "$APP_DIR/.git" ] || fail "Repositório git não encontrado em $APP_DIR"
[ -d "$BACKEND_DIR" ]  || fail "Pasta backend não encontrada em $BACKEND_DIR"

# Git 2.35+ bloqueia repos com dono diferente do usuário atual (comum no aaPanel).
ensure_git_safe_directory() {
  if git config --global --get-all safe.directory 2>/dev/null | grep -Fxq "$APP_DIR"; then
    return 0
  fi
  log "Registrando safe.directory para $APP_DIR (dubious ownership)..."
  git config --global --add safe.directory "$APP_DIR"
}

# 1) Atualizar código (o painel pode já ter feito; controle por SKIP_PULL=1)
if [ "${SKIP_PULL:-0}" != "1" ]; then
  ensure_git_safe_directory
  log "Atualizando código (git pull)..."
  cd "$APP_DIR"
  git fetch --all --prune
  git reset --hard "origin/$(git rev-parse --abbrev-ref HEAD)"
fi

cd "$BACKEND_DIR"

# 2) Garantir o arquivo .env (sem sobrescrever)
if [ ! -f "$BACKEND_DIR/.env" ]; then
  if [ -f "$BACKEND_DIR/.env.production.example" ]; then
    log "Criando .env a partir de .env.production.example (preencha as chaves!)"
    cp "$BACKEND_DIR/.env.production.example" "$BACKEND_DIR/.env"
    chmod 600 "$BACKEND_DIR/.env"
  else
    fail ".env ausente em $BACKEND_DIR e não há .env.production.example"
  fi
fi

# 3) Dependências (usa cache do npm; ci é reprodutível)
log "Instalando dependências (npm ci)..."
if [ -f "$BACKEND_DIR/package-lock.json" ]; then
  npm ci --no-audit --no-fund
else
  npm install --no-audit --no-fund
fi

# 4) Prisma client (necessário porque o build importa @prisma/client)
log "Gerando Prisma client..."
npx --yes prisma generate

# 5) Build TypeScript
log "Compilando TypeScript (npm run build)..."
npm run build

[ -f "$BACKEND_DIR/dist/index.js" ] || fail "Build falhou: dist/index.js não foi gerado"

# 6) Garantir pasta de uploads (caso esteja configurada para diretório local)
mkdir -p "$BACKEND_DIR/uploads"

# 7) PM2 — start na primeira vez, reload nas seguintes
log "Recarregando processo no PM2 ($PM2_NAME)..."
if ! command -v pm2 >/dev/null 2>&1; then
  fail "PM2 não está instalado. Rode: npm i -g pm2"
fi

if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  pm2 reload "$PM2_NAME" --update-env
else
  pm2 start "$BACKEND_DIR/dist/index.js" \
    --name "$PM2_NAME" \
    --cwd "$BACKEND_DIR" \
    --time \
    --max-memory-restart 600M
  pm2 save
fi

log "Deploy concluído. Logs: pm2 logs $PM2_NAME"

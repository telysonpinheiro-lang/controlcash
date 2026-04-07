#!/bin/bash
# Deploy ControlCash → Contabo (185.194.217.100)
# Uso: bash deploy.sh

set -e

SERVER="root@185.194.217.100"
REMOTE="/var/www/controlcash/dist"
LOCAL="$(dirname "$0")/dist"

echo "🔨 Buildando..."
npm run build

echo "📤 Enviando para o servidor..."
export DISPLAY=:0
export SSH_ASKPASS="$(dirname "$0")/.sshpass.sh"
export SSH_ASKPASS_REQUIRE=force

scp -o StrictHostKeyChecking=no -r "$LOCAL/." "$SERVER:$REMOTE/"

echo "✅ Deploy concluído! Acesse: https://controlcash.virtualcore.com.br"

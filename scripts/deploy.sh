#!/bin/bash
# Qiada V2 — Deploy to Hetzner
# Usage: bash scripts/deploy.sh

set -e

SERVER="root@178.104.139.149"
SSH_KEY="$HOME/.ssh/id_ed25519"
REMOTE_DIR="/home/ubuntu/qiada-v2"

echo "=== QIADA V2 DEPLOY ==="

# 1. Run tests locally first
echo "--- Running tests ---"
npx vitest run --reporter=dot
echo "Tests passed!"

# 2. Push latest code
echo "--- Pushing to GitHub ---"
git push

# 3. Pull on server
echo "--- Pulling on server ---"
ssh -i "$SSH_KEY" "$SERVER" "cd $REMOTE_DIR && git pull"

# 4. Build and deploy
echo "--- Building and deploying ---"
ssh -i "$SSH_KEY" "$SERVER" "cd $REMOTE_DIR && docker compose -f docker-compose.prod.yml build && docker compose -f docker-compose.prod.yml up -d"

# 5. Wait for startup
echo "--- Waiting for startup ---"
sleep 5

# 6. Health check
echo "--- Health check ---"
ssh -i "$SSH_KEY" "$SERVER" "curl -s http://localhost:3001/api/health | python3 -m json.tool || echo 'Health check failed'"

echo ""
echo "=== DEPLOY COMPLETE ==="
echo "Check: https://patenteinarabo.duckdns.org"

#!/bin/bash
set -e

CONFIG_DIR="${OPENCLAW_STATE_DIR:-/home/node/.openclaw}"
CONFIG_FILE="$CONFIG_DIR/openclaw.json"

# Start claude-max-api-proxy on port 3456
echo "[entrypoint-wrapper] Starting claude-max-api-proxy on port 3456..."
claude-max-api &

sleep 2

# First launch: run onboard non-interactively
if [ ! -f "$CONFIG_FILE" ]; then
  echo "[entrypoint-wrapper] First launch detected, running onboard..."
  openclaw onboard --non-interactive --mode local --no-install-daemon --accept-risk --skip-health

  # Configure gateway
  openclaw config set gateway.bind lan
  openclaw config set gateway.controlUi.dangerouslyDisableDeviceAuth true

  if [ -n "$OPENCLAW_GATEWAY_TOKEN" ]; then
    openclaw config set gateway.auth.mode token
    openclaw config set gateway.auth.token "$OPENCLAW_GATEWAY_TOKEN"
  fi

  # Configure custom provider pointing to claude-max-api-proxy
  openclaw config set models.providers.clawd '{"baseUrl":"http://localhost:3456/v1","apiKey":"not-needed","api":"openai-completions","models":[{"id":"claude-sonnet-4","name":"Claude Sonnet 4","reasoning":false,"input":["text"],"cost":{"input":0,"output":0,"cacheRead":0,"cacheWrite":0},"contextWindow":200000,"maxTokens":16384},{"id":"claude-opus-4","name":"Claude Opus 4","reasoning":false,"input":["text"],"cost":{"input":0,"output":0,"cacheRead":0,"cacheWrite":0},"contextWindow":200000,"maxTokens":16384},{"id":"claude-haiku-4","name":"Claude Haiku 4","reasoning":false,"input":["text"],"cost":{"input":0,"output":0,"cacheRead":0,"cacheWrite":0},"contextWindow":200000,"maxTokens":16384}]}' --strict-json
  openclaw config set agents.defaults.model.primary "clawd/claude-sonnet-4"

  echo "[entrypoint-wrapper] Onboard complete"
fi

# Run the gateway in foreground
trap 'kill $(jobs -p) 2>/dev/null' EXIT
docker-entrypoint.sh "$@"

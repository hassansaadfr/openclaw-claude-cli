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

  # Configure OpenAI-compatible provider pointing to claude-max-api-proxy
  openclaw config set env '{"OPENAI_API_KEY":"not-needed","OPENAI_BASE_URL":"http://localhost:3456/v1"}' --strict-json
  openclaw config set agents.defaults.model.primary "openai/claude-sonnet-4"

  echo "[entrypoint-wrapper] Onboard complete"
fi

# Run the gateway in foreground
trap 'kill $(jobs -p) 2>/dev/null' EXIT
docker-entrypoint.sh "$@"

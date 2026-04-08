#!/bin/bash
set -e

CONFIG_DIR="${OPENCLAW_STATE_DIR:-/home/node/.openclaw}"
CONFIG_FILE="$CONFIG_DIR/openclaw.json"

# Start billing proxy in background (will fail gracefully if no credentials yet)
echo "[entrypoint-wrapper] Starting billing proxy on port 18801..."
node /opt/billing-proxy/proxy.js --config /opt/billing-proxy/config.json &

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

  # Point Anthropic provider to billing proxy
  openclaw config set models.providers.anthropic.baseUrl "http://127.0.0.1:18801"
  openclaw config set agents.defaults.model.primary "anthropic/claude-sonnet-4-6"

  echo "[entrypoint-wrapper] Onboard complete (billing proxy configured)"
fi

# Run the gateway in foreground, keep proxy alive via trap
trap 'kill $(jobs -p) 2>/dev/null' EXIT
docker-entrypoint.sh "$@"

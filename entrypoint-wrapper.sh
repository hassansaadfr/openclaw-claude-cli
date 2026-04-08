#!/bin/sh
set -e

CONFIG_DIR="${OPENCLAW_STATE_DIR:-/home/node/.openclaw}"
CONFIG_FILE="$CONFIG_DIR/openclaw.json"

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

  echo "[entrypoint-wrapper] Onboard complete"
fi

# Hand off to the original entrypoint
exec docker-entrypoint.sh "$@"

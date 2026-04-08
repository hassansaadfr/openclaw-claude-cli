# OpenClaw + Claude CLI + Billing Proxy

Docker image extending [alpine/openclaw](https://hub.docker.com/r/alpine/openclaw) with [Claude Code CLI](https://github.com/anthropics/claude-code) and a [billing proxy](https://github.com/zacdcook/openclaw-billing-proxy) to use your Claude Max/Pro subscription with OpenClaw.

## Why?

After Anthropic revoked subscription billing for third-party tools (April 2026), OpenClaw requests are billed to Extra Usage. This image includes a local proxy that routes API requests through your Claude Code subscription instead.

It also:
- Bakes Claude CLI into the image (persists across restarts)
- Runs as non-root user (uid 1000), required by Claude CLI
- Auto-configures gateway, auth, and proxy on first launch

## Quick Start

```bash
cp .env.example .env
# Edit .env and set your gateway token (or generate one: openssl rand -hex 24)
docker compose up -d
```

Then authenticate Claude CLI (one-time):

```bash
docker exec -it <container-name> claude
```

Follow the browser auth flow, then restart:

```bash
docker compose restart
```

The Control UI is available at `http://localhost:18789/#token=YOUR_TOKEN`.

## How It Works

1. **Billing proxy** starts on port 18801 inside the container
2. OpenClaw's Anthropic provider is configured to use `http://127.0.0.1:18801` instead of `https://api.anthropic.com`
3. The proxy injects Claude Code's billing identifier and OAuth token into API requests
4. Anthropic sees a Claude Code request — billed to your subscription, not Extra Usage

## Docker Compose

```yaml
services:
  openclaw:
    image: ghcr.io/hassansaadfr/openclaw-claude-cli:latest
    user: "1000:1000"
    environment:
      - OPENCLAW_GATEWAY_TOKEN=${OPENCLAW_GATEWAY_TOKEN}
    ports:
      - "18789:18789"
      - "8080:8080"
    volumes:
      - openclaw-data:/data
      - claude-data:/home/node/.claude
volumes:
  openclaw-data:
  claude-data:
```

## Volume Permissions

If you have existing data, fix ownership before switching to this image:

```bash
sudo chown -R 1000:1000 /path/to/openclaw-data
```

## Building Locally

```bash
docker build -t openclaw-claude-cli .
```

## Auto-rebuild

A GitHub Actions workflow rebuilds the image weekly (Monday 6am UTC) to pick up updates from the base image and Claude CLI.

## Disclaimer

This project is provided **for educational and research purposes only**. It is an unofficial, community-driven workaround and is not affiliated with, endorsed by, or supported by Anthropic, OpenClaw, or any of their affiliates.

By using this software, you acknowledge that:

- **You are solely responsible** for your use of this project and for ensuring compliance with Anthropic's [Terms of Service](https://www.anthropic.com/terms) and [Acceptable Use Policy](https://www.anthropic.com/aup).
- The billing proxy modifies API request routing. Anthropic may change their billing, detection, or authentication mechanisms at any time, which could render this tool non-functional or result in account restrictions.
- The author(s) of this project **accept no liability** for any damages, account suspensions, billing issues, or other consequences resulting from the use of this software.
- This project is provided "as is", without warranty of any kind, express or implied.

**If you are unsure whether this tool complies with your service agreement, do not use it.**

## Credits

- [alpine/openclaw](https://hub.docker.com/r/alpine/openclaw) — Base OpenClaw image
- [openclaw-billing-proxy](https://github.com/zacdcook/openclaw-billing-proxy) — Billing proxy by @zacdcook

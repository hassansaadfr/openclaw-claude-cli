# OpenClaw + Claude Max Proxy

Docker image extending [alpine/openclaw](https://hub.docker.com/r/alpine/openclaw) with a built-in proxy that routes OpenClaw requests through your Claude Max subscription — no Extra Usage billing.

## Why?

Anthropic revoked subscription billing for third-party tools (April 2026). OpenClaw requests are now billed to Extra Usage. This image includes a lightweight proxy that spawns the Claude Code CLI directly for each request, leveraging native client attestation. Your Max subscription handles the billing.

## How It Works

```
OpenClaw (gateway)
    |
Proxy (:3456) — sanitizes request, spawns `claude -p <prompt>`
    |
Claude Code CLI — handles OAuth, attestation, API call
    |
Anthropic API — sees a standard Claude Code request
```

Single Node.js proxy (~200 lines), no external dependencies beyond Claude CLI itself.

## Quick Start

```bash
cp .env.example .env
# Edit .env and set your gateway token (or generate one: openssl rand -hex 24)
docker compose up -d
```

Authenticate Claude CLI (one-time):

```bash
docker exec -it <container-name> claude
```

Follow the browser auth flow, then restart:

```bash
docker compose restart
```

The Control UI is available at `http://localhost:18789/#token=YOUR_TOKEN`.

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
- Anthropic may change their billing, detection, or authentication mechanisms at any time, which could render this tool non-functional or result in account restrictions.
- The author(s) of this project **accept no liability** for any damages, account suspensions, billing issues, or other consequences resulting from the use of this software.
- This project is provided "as is", without warranty of any kind, express or implied.

**If you are unsure whether this tool complies with your service agreement, do not use it.**

## Credits

- [alpine/openclaw](https://hub.docker.com/r/alpine/openclaw) — Base OpenClaw image

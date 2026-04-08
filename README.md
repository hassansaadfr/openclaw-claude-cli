# OpenClaw + Claude CLI

Docker image extending [alpine/openclaw](https://hub.docker.com/r/alpine/openclaw) with [Claude Code CLI](https://github.com/anthropics/claude-code) pre-installed.

## Why?

OpenClaw can use Claude Code CLI as an embedded agent provider. However, installing it at runtime inside a Docker container means it gets lost on every restart. This image bakes Claude CLI into the image so it persists across restarts.

The image also runs as a non-root user (uid 1000), which is required by Claude CLI when using `--dangerously-skip-permissions`.

## Quick Start

```bash
cp .env.example .env
# Edit .env and set your gateway token (or generate one: openssl rand -hex 24)
docker compose up -d
```

The Control UI is available at `http://localhost:18789/#token=YOUR_TOKEN`.

## Docker Compose

A `docker-compose.yml` is included in this repo. You can also use the image directly:

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
volumes:
  openclaw-data:
```

### Volume permissions

If you have existing data, fix ownership before switching to this image:

```bash
sudo chown -R 1000:1000 /path/to/openclaw-data
```

## Building locally

```bash
docker build -t openclaw-claude-cli .
```

## Authentication

Claude CLI requires authentication via interactive login. From inside the container:

```bash
openclaw models auth login --provider anthropic --method cli --set-default
```

This will open an authentication flow to link your Claude/Anthropic account. The auth token is persisted in the `/data` volume and survives restarts.

## Auto-rebuild

A GitHub Actions workflow rebuilds the image weekly (Monday 6am UTC) to pick up updates from the base image and Claude CLI.

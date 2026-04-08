# OpenClaw + Claude CLI

Docker image extending [alpine/openclaw](https://hub.docker.com/r/alpine/openclaw) with [Claude Code CLI](https://github.com/anthropics/claude-code) pre-installed.

## Why?

OpenClaw can use Claude Code CLI as an embedded agent provider. However, installing it at runtime inside a Docker container means it gets lost on every restart. This image bakes Claude CLI into the image so it persists across restarts.

The image also runs as a non-root user (uid 1000), which is required by Claude CLI when using `--dangerously-skip-permissions`.

## Usage

### Docker Compose

```yaml
services:
  openclaw:
    image: ghcr.io/hassansaadfr/openclaw-claude-cli:latest
    user: "1000:1000"
    volumes:
      - openclaw-data:/data
    depends_on:
      - browser
  browser:
    image: coollabsio/openclaw-browser:latest
    volumes:
      - browser-data:/config
volumes:
  openclaw-data:
  browser-data:
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

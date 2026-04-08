FROM alpine/openclaw:latest

# Install Claude Code CLI globally
RUN npm install -g @anthropic-ai/claude-code

# Ensure data directories exist with correct permissions for non-root user
RUN mkdir -p /data/uv /data/go /data/workspace /data/.openclaw /home/node && \
    chown -R 1000:1000 /data /home/node

# Run as non-root user (required by Claude CLI --dangerously-skip-permissions)
USER 1000:1000

FROM alpine/openclaw:latest

USER root

# Install Claude Code CLI globally
RUN npm install -g @anthropic-ai/claude-code

# Add custom entrypoint wrapper
COPY entrypoint-wrapper.sh /usr/local/bin/entrypoint-wrapper.sh
RUN chmod +x /usr/local/bin/entrypoint-wrapper.sh

# Ensure data directories exist with correct permissions for non-root user
RUN mkdir -p /data/uv /data/go /data/workspace /data/.openclaw /home/node && \
    chown -R 1000:1000 /data /home/node

# Run as non-root user (required by Claude CLI --dangerously-skip-permissions)
USER 1000:1000

ENTRYPOINT ["entrypoint-wrapper.sh"]
CMD ["node", "openclaw.mjs", "gateway", "--allow-unconfigured"]

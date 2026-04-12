FROM alpine/openclaw:latest

USER root

# Install Claude Code CLI, claude-max-api-proxy, and keyring for credential persistence
RUN apt-get update && \
    apt-get install -y --no-install-recommends libsecret-1-0 dbus gnome-keyring && \
    rm -rf /var/lib/apt/lists/* && \
    npm install -g @anthropic-ai/claude-code claude-max-api-proxy

# Patch claude-max-api-proxy to handle content arrays
COPY patch-content-array.js /tmp/patch-content-array.js
RUN node /tmp/patch-content-array.js && rm /tmp/patch-content-array.js

# Add entrypoint
COPY entrypoint-wrapper.sh /usr/local/bin/entrypoint-wrapper.sh
RUN chmod +x /usr/local/bin/entrypoint-wrapper.sh

# Ensure data directories exist with correct permissions for non-root user
# Symlink /data -> /home/node so old paths (/data/.openclaw, /data/openclaw-conf-repo, etc.) still work
RUN rm -rf /data && ln -s /home/node /data && \
    mkdir -p /home/node/.openclaw /home/node/.claude /home/node/.local/share/keyrings && \
    chown -R 1000:1000 /home/node

# Run as non-root user (required by Claude CLI --dangerously-skip-permissions)
USER 1000:1000

ENTRYPOINT ["entrypoint-wrapper.sh"]
CMD ["node", "openclaw.mjs", "gateway", "--allow-unconfigured"]

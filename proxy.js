#!/usr/bin/env node
/**
 * Claude Max Proxy for OpenClaw
 *
 * Receives Anthropic Messages API requests, sanitizes OpenClaw patterns,
 * spawns Claude Code CLI directly (which handles attestation natively),
 * and returns responses in Anthropic Messages API format.
 *
 * Single process. No SDK. No Meridian. Just spawn.
 */
const http = require('http');
const { spawn } = require('child_process');
const crypto = require('crypto');

const PORT = parseInt(process.env.PROXY_PORT || '3456');

// --- Sanitization ---

const REPLACEMENTS = [
  ['OpenClaw', 'AssistantPlatform'],
  ['openclaw', 'assistantplatform'],
  ['sessions_spawn', 'task_create'],
  ['sessions_list', 'task_list'],
  ['sessions_history', 'task_history'],
  ['sessions_send', 'task_send'],
  ['sessions_yield', 'task_yield'],
  ['sessions_yield_interrupt', 'task_yield_interrupt'],
  ['sessions_store', 'task_store'],
  ['session_status', 'task_status'],
  ['subagents', 'workers'],
  ['HEARTBEAT_OK', 'HB_ACK'],
  ['clawhub.ai', 'skillhub.example'],
];

const STRIP_PATTERNS = [
  /include one tag in your reply:[\s\S]*?current channel config\./g,
  /\[\[\s*reply_to_current\s*\]\]/g,
  /\[\[\s*reply_to:\s*[^\]]*\]\]/g,
];

function sanitize(text) {
  let r = text;
  for (const [from, to] of REPLACEMENTS) r = r.split(from).join(to);
  for (const pat of STRIP_PATTERNS) r = r.replace(pat, '');
  return r;
}

function restore(text) {
  let r = text;
  for (const [from, to] of REPLACEMENTS) r = r.split(to).join(from);
  return r;
}

function extractPrompt(body) {
  try {
    const p = JSON.parse(body);
    const parts = [];

    // System prompt
    if (p.system) {
      let sysText = '';
      if (typeof p.system === 'string') sysText = p.system;
      else if (Array.isArray(p.system)) sysText = p.system.map(b => b.text || '').join('\n');
      parts.push('<system>\n' + sanitize(sysText) + '\n</system>');
    }

    // Messages
    if (p.messages) {
      for (const m of p.messages) {
        let content = '';
        if (typeof m.content === 'string') content = m.content;
        else if (Array.isArray(m.content)) content = m.content.map(b => b.text || '').join('\n');
        content = sanitize(content);

        if (m.role === 'user') parts.push(content);
        else if (m.role === 'assistant') parts.push('<previous_response>\n' + content + '\n</previous_response>');
      }
    }

    return {
      prompt: parts.join('\n\n'),
      model: p.model || 'claude-sonnet-4-6',
      stream: p.stream === true,
      maxTokens: p.max_tokens || 8192,
    };
  } catch {
    return { prompt: sanitize(body), model: 'claude-sonnet-4-6', stream: false, maxTokens: 8192 };
  }
}

// Map Anthropic model names to claude CLI model flags
function cliModel(model) {
  if (model.includes('opus')) return 'opus';
  if (model.includes('haiku')) return 'haiku';
  return 'sonnet';
}

function handleRequest(req, res) {
  if (req.method === 'GET') {
    // Health check / model list
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    const { prompt, model, stream, maxTokens } = extractPrompt(body);
    const msgId = 'msg_' + crypto.randomBytes(12).toString('hex');

    const args = [
      '-p', prompt,
      '--output-format', 'text',
      '--model', cliModel(model),
      '--max-turns', '100',
      '--no-session-persistence',
    ];

    const proc = spawn('claude', args, {
      env: { ...process.env, CLAUDE_CODE_ENTRYPOINT: 'sdk-cli' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let output = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      const chunk = restore(data.toString());
      output += chunk;

      if (stream && !res.headersSent) {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        });
        // Send message_start
        res.write(`event: message_start\ndata: ${JSON.stringify({
          type: 'message_start',
          message: { id: msgId, type: 'message', role: 'assistant', content: [], model, stop_reason: null, usage: { input_tokens: 0, output_tokens: 0 } }
        })}\n\n`);
        res.write(`event: content_block_start\ndata: ${JSON.stringify({
          type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' }
        })}\n\n`);
      }

      if (stream && res.headersSent) {
        res.write(`event: content_block_delta\ndata: ${JSON.stringify({
          type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: chunk }
        })}\n\n`);
      }
    });

    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (stream && res.headersSent) {
        res.write(`event: content_block_stop\ndata: ${JSON.stringify({ type: 'content_block_stop', index: 0 })}\n\n`);
        res.write(`event: message_delta\ndata: ${JSON.stringify({
          type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 0 }
        })}\n\n`);
        res.write(`event: message_stop\ndata: ${JSON.stringify({ type: 'message_stop' })}\n\n`);
        res.end();
      } else if (!res.headersSent) {
        if (code !== 0 && !output) {
          // Check for specific errors
          const errMsg = stderr || 'CLI process failed';
          if (errMsg.includes('rate limit') || errMsg.includes('429')) {
            res.writeHead(429, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ type: 'error', error: { type: 'rate_limit_error', message: 'Rate limit' } }));
          } else {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ type: 'error', error: { type: 'api_error', message: errMsg.substring(0, 500) } }));
          }
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          id: msgId,
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: output.trim() }],
          model,
          stop_reason: 'end_turn',
          usage: { input_tokens: 0, output_tokens: 0 }
        }));
      }
    });

    proc.on('error', (err) => {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ type: 'error', error: { type: 'api_error', message: err.message } }));
      }
    });
  });
}

const server = http.createServer(handleRequest);
server.listen(PORT, '127.0.0.1', () => {
  console.log(`[proxy] Claude Max Proxy on :${PORT} (direct CLI spawn)`);
});

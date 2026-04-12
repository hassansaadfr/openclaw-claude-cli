const fs = require('fs');

// Patch 1: Fix content arrays in openai-to-cli.js
const adapterFile = '/usr/local/lib/node_modules/claude-max-api-proxy/dist/adapter/openai-to-cli.js';
let adapter = fs.readFileSync(adapterFile, 'utf8');

const helper = `
function extractText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(c => c.text || "").join("");
  return String(content);
}
`;

adapter = adapter.replace('export function messagesToPrompt', helper + 'export function messagesToPrompt');
adapter = adapter.replace(/`<system>\\n\$\{msg\.content\}/g, '`<system>\\n${extractText(msg.content)}');
adapter = adapter.replace('parts.push(msg.content)', 'parts.push(extractText(msg.content))');
adapter = adapter.replace(/`<previous_response>\\n\$\{msg\.content\}/g, '`<previous_response>\\n${extractText(msg.content)}');

fs.writeFileSync(adapterFile, adapter);
console.log('Patched openai-to-cli.js for content arrays');

// Patch 2: Add --dangerously-skip-permissions to subprocess manager
const managerFile = '/usr/local/lib/node_modules/claude-max-api-proxy/dist/subprocess/manager.js';
let manager = fs.readFileSync(managerFile, 'utf8');

manager = manager.replace(
  '"--print", // Non-interactive mode',
  '"--print", // Non-interactive mode\n            "--dangerously-skip-permissions", // Allow exec without approval'
);

fs.writeFileSync(managerFile, manager);
console.log('Patched manager.js for skip-permissions');

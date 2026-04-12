const fs = require('fs');
const f = '/usr/local/lib/node_modules/claude-max-api-proxy/dist/adapter/openai-to-cli.js';
let src = fs.readFileSync(f, 'utf8');

const helper = `
function extractText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(c => c.text || "").join("");
  return String(content);
}
`;

src = src.replace('export function messagesToPrompt', helper + 'export function messagesToPrompt');
src = src.replace(/`<system>\\n\$\{msg\.content\}/g, '`<system>\\n${extractText(msg.content)}');
src = src.replace('parts.push(msg.content)', 'parts.push(extractText(msg.content))');
src = src.replace(/`<previous_response>\\n\$\{msg\.content\}/g, '`<previous_response>\\n${extractText(msg.content)}');

fs.writeFileSync(f, src);
console.log('Patched openai-to-cli.js for content arrays');

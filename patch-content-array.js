/**
 * Patch claude-max-api-proxy to handle content arrays
 * OpenClaw sends content as [{type:"text",text:"..."}] but the proxy expects plain strings
 */
const fs = require('fs');
const target = '/usr/local/lib/node_modules/claude-max-api-proxy/dist/adapter/openai-to-cli.js';
let src = fs.readFileSync(target, 'utf8');

// Add a helper to extract text from content (string or array)
const helper = `
function extractContent(content) {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) return content.map(c => c.text || '').join('');
    return String(content);
}
`;

// Insert helper before the first export
src = src.replace('export function extractModel', helper + 'export function extractModel');

// Replace msg.content with extractContent(msg.content) in messagesToPrompt
src = src.replace(/parts\.push\(`<system>\\n\$\{msg\.content\}/g, 'parts.push(`<system>\\n${extractContent(msg.content)}');
src = src.replace(/parts\.push\(msg\.content\)/g, 'parts.push(extractContent(msg.content))');
src = src.replace(/parts\.push\(`<previous_response>\\n\$\{msg\.content\}/g, 'parts.push(`<previous_response>\\n${extractContent(msg.content)}');

fs.writeFileSync(target, src);
console.log('Patched openai-to-cli.js to handle content arrays');

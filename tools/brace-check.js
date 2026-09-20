/* Brace-balance checker for JS files. Run: node tools/brace-check.js <file> */
const fs = require('fs');
const src = fs.readFileSync(process.argv[2], 'utf8');
let depth = 0, line = 1, inStr = null, esc = false, inComment = null, inTemplate = 0;
const opens = [];
for (let i = 0; i < src.length; i++) {
  const c = src[i], n = src[i + 1];
  if (c === '\n') { line++; if (inComment === 'line') inComment = null; continue; }
  if (inComment === 'line') continue;
  if (inComment === 'block') { if (c === '*' && n === '/') { inComment = null; i++; } continue; }
  if (inStr) {
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === inStr) inStr = null;
    continue;
  }
  if (c === '/' && n === '/') { inComment = 'line'; i++; continue; }
  if (c === '/' && n === '*') { inComment = 'block'; i++; continue; }
  if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
  if (c === '{') { opens.push(line); depth++; }
  else if (c === '}') { opens.pop(); depth--; }
}
console.log('final depth:', depth);
console.log('unclosed { at lines:', opens.slice(-12));

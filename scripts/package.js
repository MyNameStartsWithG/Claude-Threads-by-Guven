// Builds the .vsix. vsce rejects SVG images in README.md, so the package gets
// a copy of the README without the figure lines (GitHub keeps the SVGs).
// Usage: npm run package   (extra args are passed to vsce, e.g. -- --out my.vsix)
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const kok = path.join(__dirname, '..');
const gecici = path.join(kok, '.vsix-readme.md');
const readme = fs.readFileSync(path.join(kok, 'README.md'), 'utf8')
  .replace(/^<p align="center"><img[^\n]*\n?/gm, '');
fs.writeFileSync(gecici, readme, 'utf8');
try {
  const ek = process.argv.slice(2).join(' ');
  execSync(`npx --yes @vscode/vsce@3 package --readme-path .vsix-readme.md ${ek}`, { cwd: kok, stdio: 'inherit' });
} finally {
  fs.unlinkSync(gecici);
}

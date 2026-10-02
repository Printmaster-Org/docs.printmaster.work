import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function checkSite(root) {
  const html = new Map();
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (file.endsWith('.html')) html.set(file, fs.readFileSync(file, 'utf8'));
    }
  }
  root = path.resolve(root);
  walk(root);
  if (!html.size) throw new Error('No generated HTML; run Hugo first.');
  const errors = [];
  // Hugo's minifier removes optional attribute quotes; accept both forms.
  const attribute = name => new RegExp(`\\b(?:${name})=(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'g');
  const value = match => match[1] ?? match[2] ?? match[3];
  const ids = new Map([...html].map(([file, text]) => [file, new Set([...text.matchAll(attribute('id'))].map(value))]));
  for (const [file, text] of html) {
    const current = '/' + path.relative(root, file).replaceAll(path.sep, '/').replace(/index\.html$/, '');
    for (const match of text.matchAll(attribute('href|src'))) {
      const target = value(match).replaceAll('&amp;', '&');
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(target)) continue;
      const url = new URL(target, `https://docs.invalid${current}`);
      const pathname = decodeURIComponent(url.pathname);
      let resolved = path.join(root, pathname);
      if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) resolved = path.join(resolved, 'index.html');
      if (!fs.existsSync(resolved)) errors.push(`${current}: missing ${target}`);
      else if (url.hash && ids.has(resolved) && !ids.get(resolved).has(decodeURIComponent(url.hash.slice(1)))) errors.push(`${current}: missing anchor ${target}`);
    }
  }
  const index = JSON.parse(fs.readFileSync(path.join(root, 'index.json'), 'utf8'));
  if (!Array.isArray(index) || !index.length) errors.push('Search index is empty.');
  for (const page of index) {
    if (!page.title || !page.text || !fs.existsSync(path.join(root, decodeURIComponent(page.url), 'index.html'))) errors.push(`Invalid search entry: ${page.url}`);
  }
  return { pages: html.size, searchEntries: index.length, errors };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = checkSite(process.argv[2] ?? 'public');
  if (result.errors.length) {
    console.error(result.errors.join('\n'));
    process.exitCode = 1;
  } else console.log(`Validated ${result.pages} HTML pages, ${result.searchEntries} search entries, all local links/assets/anchors.`);
}
/** One-time, auditable import. Sources are never changed; existing outputs are protected. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const slug = value => value.toLowerCase().replaceAll('_', '-');
const overrides = {
  'README.md': 'project/overview.md',
  'CONTRIBUTING.md': 'project/contributing.md',
  'SECURITY.md': 'project/security.md',
  'GIT_INTEGRATION_SUMMARY.md': 'development/git-integration-summary.md',
  'docs/README.md': 'guides/_index.md',
  'docs/api/README.md': 'api/_index.md',
  'docs/dev/README.md': 'development/_index.md',
  'docs/dev/vendor/README.md': 'development/vendor/_index.md',
  'common/logger/README.md': 'components/logger/_index.md',
  'tests/README.md': 'development/testing/_index.md',
  'tests/E2E_TESTING.md': 'development/testing/e2e-testing.md',
  'docs/dev/TESTING.md': 'development/testing-ci.md',
  'agent/agent/README.md': 'components/agent/historical-overview.md',
};
const repairs = {
  'docs/BUILD_WORKFLOW.md': 'docs/dev/BUILD_WORKFLOW.md',
  'docs/PROJECT_STRUCTURE.md': 'docs/dev/PROJECT_STRUCTURE.md',
  'docs/SNMP_REFERENCE.md': 'docs/dev/SNMP_REFERENCE.md',
  'docs/SECURITY_ARCHITECTURE.md': 'docs/dev/SECURITY_ARCHITECTURE.md',
  'docs/API_REFERENCE.md': 'docs/api/README.md',
  'docs/dev/API.md': 'docs/api/README.md',
  'docs/dev/UNRAID_DEPLOYMENT.md': 'docs/deployment/unraid.md',
  'docs/api/CONFIGURATION.md': 'docs/CONFIGURATION.md',
  'docs/api/FEATURES.md': 'docs/FEATURES.md',
  'docs/api/environment-variables.md': 'docs/CONFIGURATION.md#environment-variables',
  'docs/agent/README.md': 'agent/README.md',
  'docs/server/README.md': 'server/README.md',
  'docs/dev/CONFIGURATION.md': 'docs/CONFIGURATION.md',
  'docs/tests/E2E_TESTING.md': 'tests/E2E_TESTING.md',
  'docs/dev/SERVICE_DEPLOYMENT.md, AGENT_DEPLOYMENT.md': 'agent/SERVICE.md',
  'docs/SERVICE_DEPLOYMENT.md': 'agent/SERVICE.md',
  'agent/logger/README.md': 'common/logger/README.md',
  'common/agent/README.md': 'agent/README.md',
  'common/scanner/README.md': 'agent/scanner/README.md',
};

export function destination(source) {
  if (overrides[source]) return overrides[source];
  if (source.startsWith('docs/dev/')) return `development/${slug(source.slice(9))}`;
  if (source.startsWith('docs/deployment/')) return `deployment/${slug(source.slice(16))}`;
  if (source.startsWith('docs/')) return `guides/${slug(source.slice(5))}`;
  if (/^(agent|server)\//.test(source)) {
    return `components/${slug(source).replace(/readme\.md$/, '_index.md')}`;
  }
  throw new Error(`Unmapped source: ${source}`);
}

export function pageURL(output) {
  return `/${output.replace(/(?:\/)?_index\.md$/, '').replace(/\.md$/, '')}/`;
}

export function transformMarkdown(markdown, resolve) {
  let fence;
  return markdown.split('\n').map(line => {
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = undefined;
      return line;
    }
    if (fence) return line;
    // Inline code, fenced code, and external destinations stay byte-for-byte intact.
    const code = [];
    const protectedLine = line.replace(/(`+[^`]*`+)/g, match => `\u0000CODE${code.push(match) - 1}\u0000`);
    return protectedLine.replace(/\[(!\[[^\]]*\]\([^)]*\))\]\(([^)]+)\)/g, (match, image, target) => {
        const result = resolve(target);
        return result === null ? `${image} (legacy document unavailable)` : `[${image}](${result})`;
      }).replace(/(!?)\[([^\]]+)\]\(([^)]+)\)/g, (match, image, label, target) => {
        const result = resolve(target);
        return result === null ? `${label} (legacy document unavailable)` : `${image}[${label}](${result})`;
      }).replace(/\b(src|href)="([^"]+)"/g, (match, attr, target) => {
        const result = resolve(target);
        return result === null ? '' : `${attr}="${result}"`;
      }).replace(/^(\s*\[[^\]]+\]:\s*)(\S+)(.*)$/, (match, prefix, target, suffix) => {
        const result = resolve(target);
        if (result === null) throw new Error(`Missing reference-style link: ${target}`);
        return prefix + result + suffix;
      }).replace(/\u0000CODE(\d+)\u0000/g, (match, index) => code[Number(index)]);
  }).join('\n');
}

export function firstHeading(markdown) {
  let fence;
  const lines = markdown.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const marker = lines[i].match(/^\s*(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = undefined;
      continue;
    }
    if (!fence && /^#\s+/.test(lines[i])) return { line: i, title: lines[i].replace(/^#\s+/, '') };
  }
}

export function migrate(sourceRoot) {
  if (fs.existsSync(path.join(root, 'migration-manifest.json'))) {
    throw new Error('Migration already completed. Edit content directly; do not overwrite it with a second import.');
  }
  const tracked = execFileSync('git', ['-C', sourceRoot, 'ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
  const sources = tracked.filter(file => file.endsWith('.md') && !file.startsWith('.github/') && !file.includes('/flatpickr/') && !file.startsWith('tests/testdata/'));
  const commit = execFileSync('git', ['-C', sourceRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const routes = new Map(sources.map(source => [source, pageURL(destination(source))]));
  const assets = tracked.filter(file => file.startsWith('docs/') && !file.endsWith('.md'));
  const manifest = { sourceRepository: 'Printmaster-Org/printmaster', sourceCommit: commit, pages: [], assets: [], repairedLinks: [], unavailableReferences: [] };
  const pending = new Map();
  function add(file, data) {
    if (pending.has(file) || fs.existsSync(path.join(root, file))) throw new Error(`Refusing to overwrite ${file}`);
    pending.set(file, data);
  }
  for (const source of sources) {
    const original = fs.readFileSync(path.join(sourceRoot, source), 'utf8');
    function resolve(target) {
      if (/^(?:[a-z][a-z\d+.-]*:|#|\/\/)/i.test(target)) return target;
      const [file, fragment = ''] = target.split('#');
      let resolved = path.posix.normalize(path.posix.join(path.posix.dirname(source), decodeURIComponent(file)));
      let hash = fragment;
      if (repairs[resolved]) {
        const fixed = repairs[resolved].split('#');
        manifest.repairedLinks.push({ source, original: target, replacement: repairs[resolved] });
        resolved = fixed[0];
        hash = fixed[1] ?? hash;
      }
      let route = routes.get(resolved);
      if (!route) route = routes.get(`${resolved.replace(/\/$/, '')}/README.md`);
      if (route) return route + (hash ? `#${hash}` : '');
      if (assets.includes(resolved)) return `/media/${resolved.split('/').map(encodeURIComponent).join('/')}${hash ? `#${hash}` : ''}`;
      if (tracked.includes(resolved)) return `https://github.com/Printmaster-Org/printmaster/blob/${commit}/${resolved}${hash ? `#${hash}` : ''}`;
      if (tracked.some(file => file.startsWith(resolved.replace(/\/$/, '') + '/'))) return `https://github.com/Printmaster-Org/printmaster/tree/${commit}/${resolved}`;
      manifest.unavailableReferences.push({ source, target });
      return null;
    }
    const heading = firstHeading(original);
    const title = heading?.title.replace(/`/g, '') ?? (source === 'README.md' ? 'PrintMaster Overview' : path.basename(source, '.md').replaceAll('_', ' '));
    let body = transformMarkdown(original, resolve);
    if (heading) body = body.split('\n').filter((line, i) => i !== heading.line).join('\n').trimStart();
    const output = destination(source);
    const meta = { title, source, sourceCommit: commit };
    if (/(?:PLAN|TODO|REMAINING_TASKS|GIT_INTEGRATION_SUMMARY)/.test(source) || source === 'agent/agent/README.md') meta.legacy = true;
    // JSON strings are also valid YAML scalars; no front-matter parser dependency needed.
    const frontmatter = Object.entries(meta).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n');
    add(`content/${output}`, `---\n${frontmatter}\n---\n\n${body}\n`);
    manifest.pages.push({ source, destination: `content/${output}`, url: pageURL(output), sha256: createHash('sha256').update(original).digest('hex') });
  }
  for (const asset of [...assets, 'agent/icon.svg', 'agent/icon.png', 'LICENSE']) {
    const output = asset === 'LICENSE' ? 'LICENSE' : asset.startsWith('agent/') ? `static/images/${path.basename(asset)}` : `static/media/${asset}`;
    add(output, fs.readFileSync(path.join(sourceRoot, asset)));
    manifest.assets.push({ source: asset, destination: output });
  }
  add('migration-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
  // Validate every destination first, then write: no partial overwrite of human-authored docs.
  for (const [file, data] of pending) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), data, { flag: 'wx' });
  }
  console.log(`Imported ${sources.length} pages and ${manifest.assets.length} assets from ${commit}.`);
  console.log(`Repaired ${manifest.repairedLinks.length} links; ${manifest.unavailableReferences.length} missing historical references recorded.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const source = process.argv[2];
  if (!source) throw new Error('Usage: node scripts/migrate.mjs /path/to/printmaster');
  migrate(path.resolve(source));
}
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('primary navigation follows reader tasks rather than implementation modules', () => {
  const config = read('hugo.toml');
  const refs = [...config.matchAll(/pageRef = '([^']+)'/g)].map(match => match[1]);
  assert.deepEqual(refs, ['/start-here', '/guides', '/scanning', '/printers', '/deployment', '/api', '/development']);
  for (const ref of refs) assert.ok(fs.existsSync(path.join(root, 'content', ref, '_index.md')), ref);
  for (const section of ['components', 'project']) {
    const content = read(`content/${section}/_index.md`);
    assert.ok(content.includes('navigationHidden: true'));
    assert.ok(content.includes('navigationParent: "/development/"'));
    assert.ok(read('content/development/_index.md').includes(`"/${section}"`));
  }
});

test('relocated guides preserve published routes and imported provenance', () => {
  for (const [file, url] of [
    ['start-here/install.md', '/guides/install/'],
    ['start-here/first-steps.md', '/guides/getting-started/'],
    ['scanning/printmaster-scans.md', '/guides/scans/'],
    ['scanning/windows-manual.md', '/guides/manual-smb-setup/'],
  ]) {
    assert.ok(read(`content/${file}`).includes(`url: "${url}"`));
  }
  const manifest = JSON.parse(read('migration-manifest.json'));
  for (const file of ['content/start-here/install.md', 'content/start-here/first-steps.md']) {
    assert.ok(manifest.pages.some(page => page.destination === file));
    assert.ok(read(file).includes(`sourceCommit: "${manifest.sourceCommit}"`));
  }
});

test('every brand has an independent hub and an honestly marked SMB coverage placeholder', () => {
  const brands = fs.readdirSync(path.join(root, 'content/printers'), { withFileTypes: true }).filter(entry => entry.isDirectory());
  for (const name of ['brother', 'canon', 'epson', 'hp', 'konica-minolta', 'kyocera', 'lexmark', 'ricoh', 'sharp', 'toshiba', 'xerox']) {
    assert.ok(brands.some(brand => brand.name === name), `Missing initial brand hub: ${name}`);
  }
  for (const { name } of brands) {
    const hub = read(`content/printers/${name}/_index.md`);
    assert.match(hub, /^brand: ".+"$/m, name);
    const smb = read(`content/printers/${name}/scan-to-smb.md`);
    assert.match(smb, /^status: planned$/m, name);
    assert.ok(smb.includes('](/scanning/)'), name);
    assert.ok(smb.includes('](/scanning/copier-setup/)'), name);
    assert.ok(smb.includes('{{< image-placeholder title='), name);
  }
});

function searchHarness(index, fetchIndex = async () => ({ ok: true, json: async () => index })) {
  const element = () => ({
    children: [],
    textContent: '',
    listeners: {},
    classList: { toggle: () => false, contains: () => false },
    setAttribute() {},
    addEventListener(name, handler) { this.listeners[name] = handler; },
    append(child) { this.children.push(child); },
    replaceChildren() { this.children = []; this.textContent = ''; },
  });
  const elements = Object.fromEntries(['#theme-toggle', '#menu-toggle', '#sidebar', '#search', '#search-results'].map(id => [id, element()]));
  elements['#search'].dataset = { index: '/index.json' };
  const document = { querySelector: id => elements[id], createElement: element, body: element() };
  vm.runInNewContext(read('assets/js/docs.js'), {
    document,
    localStorage: { getItem: () => null, setItem() {} },
    matchMedia: () => ({ matches: false }),
    fetch: fetchIndex,
  });
  return {
    results: elements['#search-results'],
    input(value) {
      elements['#search'].value = value;
      return elements['#search'].listeners.input();
    },
  };
}

test('search ranks finished guides before equally relevant placeholders and historical notes', async () => {
  const harness = searchHarness([
    { title: 'SMB setup', text: 'Guide', url: '/planned/', status: 'planned', context: 'Printers / Brand' },
    { title: 'SMB setup', text: 'Guide', url: '/historical/', legacy: true },
    { title: 'SMB setup', text: 'Guide', url: '/ready/', context: 'Scanning & SMB' },
  ]);
  await harness.input('smb');
  assert.deepEqual(harness.results.children.map(link => link.href), ['/ready/', '/planned/', '/historical/']);
  assert.equal(harness.results.children[1].children[0].textContent, 'Printers / Brand · Documentation planned');
  assert.equal(harness.results.children[2].children[0].textContent, 'Historical reference');
});

test('specific brand matches outrank generic text and search retains all-word matching', async () => {
  const harness = searchHarness([
    { title: 'Copier setup', text: 'Kyocera SMB setup', url: '/generic/' },
    { title: 'Kyocera scan-to-SMB', text: 'Coverage', url: '/brand/', status: 'planned' },
    { title: 'Kyocera printing', text: 'Drivers', url: '/printing/' },
  ]);
  await harness.input('kyocera smb');
  assert.deepEqual(harness.results.children.map(link => link.href), ['/brand/', '/generic/']);
  await harness.input('not found');
  assert.equal(harness.results.textContent, 'No matching docs.');
  await harness.input('k');
  assert.equal(harness.results.children.length, 0);
  assert.equal(harness.results.textContent, '');
});

test('search failures remain visible and can be retried', async () => {
  let calls = 0;
  const harness = searchHarness([], async () => {
    if (++calls === 1) throw new Error('Offline');
    return { ok: true, json: async () => [{ title: 'SMB guide', text: 'Setup', url: '/guide/' }] };
  });
  await harness.input('smb');
  assert.equal(harness.results.textContent, 'Search unavailable. Browse sections below.');
  await harness.input('smb');
  assert.equal(harness.results.children[0].href, '/guide/');
});
